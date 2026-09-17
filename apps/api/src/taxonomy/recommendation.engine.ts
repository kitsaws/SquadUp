import { InMemoryTreeStore } from "./tree.store.js";
import { DirectionalPairScorer, pairScore } from "./pair.scorer.js";
import { formatExplanation } from "./explain.js";
import {
  CandidateTeamInput,
  RankedTeamRecommendation,
  RequirementExplanationItem,
  StructuralFeatures,
} from "./taxonomy.types.js";

interface PreScoreItem {
  score: number;
  bestSkill: string | null;
  bestFeats: StructuralFeatures | null;
}

interface ScoredTeam {
  taxScore: number;
  strongCnt: number;
  totalReqs: number;
  team: CandidateTeamInput;
  isEligible: boolean;
  reqMatches: Array<[string, number, string | null, StructuralFeatures | null]>;
  bestMatchingRole?: {
    role_id?: string;
    role_title: string;
    score: number;
    fulfilled_count: number;
    total_count: number;
    skills: string[];
  } | null;
}

export class V2RecommendationEngine {
  public graph: InMemoryTreeStore;
  public scorer: DirectionalPairScorer;

  constructor(graph: InMemoryTreeStore, scorer?: DirectionalPairScorer) {
    this.graph = graph;
    this.scorer = scorer || new DirectionalPairScorer();
  }

  public computeUserPrescoreVector(userNodeIds: string[]): Record<string, PreScoreItem> {
    const vector: Record<string, PreScoreItem> = {};

    for (const targetNid of Object.keys(this.graph.nodes)) {
      let bestScore = 0.0;
      let bestSkill: string | null = null;
      let bestFeats: StructuralFeatures | null = null;

      for (const uNid of userNodeIds) {
        const [s, feats] = pairScore(this.graph, uNid, targetNid, this.scorer);
        if (s > bestScore) {
          bestScore = s;
          bestSkill = uNid;
          bestFeats = feats;
          if (bestScore >= 1.0) {
            break;
          }
        }
      }

      vector[targetNid] = {
        score: Number(bestScore.toFixed(4)),
        bestSkill,
        bestFeats,
      };
    }

    return vector;
  }

  public recommend(
    userNodeIds: string[],
    userUniversity: string | null | undefined,
    candidateTeams: CandidateTeamInput[],
    topK = 50,
    strongThreshold = 0.80
  ): RankedTeamRecommendation[] {
    if (!candidateTeams || candidateTeams.length === 0) {
      return [];
    }

    const userUniClean = userUniversity ? userUniversity.trim().toLowerCase() : null;

    // 1. Compute User Pre-Scoring Vector once (< 2ms)
    const userVector = this.computeUserPrescoreVector(userNodeIds);

    // 2. Score candidate teams in O(1) dictionary lookups
    const scoredTeams: ScoredTeam[] = [];

    for (const team of candidateTeams) {
      const tUniClean = team.university ? team.university.trim().toLowerCase() : null;
      const sameUni = Boolean(userUniClean && tUniClean && userUniClean === tUniClean);
      // Hard eligibility: A candidate is eligible if event is global OR if candidate belongs to the same university
      const isEligible = Boolean(team.is_global || (userUniClean && sameUni));

      const hasStructuredRoles = Boolean(team.roles && team.roles.length > 0);

      if (hasStructuredRoles && team.roles && team.roles.length > 0) {
        // Evaluate fit per role
        let bestRole: (typeof team.roles)[0] | null = null;
        let bestRoleScore = -1;
        let bestRoleStrongCnt = 0;
        let bestRoleReqMatches: Array<[string, number, string | null, StructuralFeatures | null]> = [];

        for (const role of team.roles) {
          const roleReqIds = role.requirement_node_ids || [];
          if (roleReqIds.length === 0) continue;

          let roleScoreSum = 0.0;
          let roleStrong = 0;
          const matches: Array<[string, number, string | null, StructuralFeatures | null]> = [];

          for (const rId of roleReqIds) {
            const item = userVector[rId];
            const scoreVal = item ? item.score : 0.0;
            const bestSkill = item ? item.bestSkill : null;
            const bestFeats = item ? item.bestFeats : null;

            if (scoreVal >= strongThreshold) roleStrong += 1;
            roleScoreSum += scoreVal;
            matches.push([rId, scoreVal, bestSkill, bestFeats]);
          }

          const avgRoleScore = Number((roleScoreSum / roleReqIds.length).toFixed(4));
          if (avgRoleScore > bestRoleScore) {
            bestRoleScore = avgRoleScore;
            bestRole = role;
            bestRoleStrongCnt = roleStrong;
            bestRoleReqMatches = matches;
          }
        }

        if (bestRole && bestRoleScore >= 0) {
          scoredTeams.push({
            taxScore: bestRoleScore,
            strongCnt: bestRoleStrongCnt,
            totalReqs: bestRole.requirement_node_ids.length,
            team,
            isEligible,
            reqMatches: bestRoleReqMatches,
            bestMatchingRole: {
              role_id: bestRole.role_id,
              role_title: bestRole.role_title,
              score: bestRoleScore,
              fulfilled_count: bestRoleStrongCnt,
              total_count: bestRole.requirement_node_ids.length,
              skills: bestRole.raw_skills || [],
            },
          });
          continue;
        }
      }

      // Fallback to unified requirements
      const reqIds = team.requirement_node_ids || [];
      if (reqIds.length === 0) {
        scoredTeams.push({
          taxScore: 0.0,
          strongCnt: 0,
          totalReqs: 0,
          team,
          isEligible,
          reqMatches: [],
          bestMatchingRole: null,
        });
        continue;
      }

      let totalScore = 0.0;
      let strongCnt = 0;
      const reqMatches: Array<[string, number, string | null, StructuralFeatures | null]> = [];

      for (const rId of reqIds) {
        const item = userVector[rId];
        const scoreVal = item ? item.score : 0.0;
        const bestSkill = item ? item.bestSkill : null;
        const bestFeats = item ? item.bestFeats : null;

        if (scoreVal >= strongThreshold) {
          strongCnt += 1;
        }

        totalScore += scoreVal;
        reqMatches.push([rId, scoreVal, bestSkill, bestFeats]);
      }

      const taxScore = Number((totalScore / reqIds.length).toFixed(4));
      scoredTeams.push({
        taxScore,
        strongCnt,
        totalReqs: reqIds.length,
        team,
        isEligible,
        reqMatches,
        bestMatchingRole: null,
      });
    }

    // 3. Sort candidates:
    // primary: eligibility (eligible teams rank before campus-locked non-global teams)
    // secondary: pure taxonomy score descending
    // tertiary: strong match count descending
    // quaternary: total requirements ascending (fewer unmet requirements)
    scoredTeams.sort((a, b) => {
      if (b.isEligible !== a.isEligible) {
        return (b.isEligible ? 1 : 0) - (a.isEligible ? 1 : 0);
      }
      if (b.taxScore !== a.taxScore) {
        return b.taxScore - a.taxScore;
      }
      if (b.strongCnt !== a.strongCnt) {
        return b.strongCnt - a.strongCnt;
      }
      return a.totalReqs - b.totalReqs;
    });

    const topCandidates = scoredTeams.slice(0, topK);

    // 4. Build output with categorization & plain-English LCA explanations
    const recommendations: RankedTeamRecommendation[] = [];

    for (let i = 0; i < topCandidates.length; i++) {
      const rank = i + 1;
      const { taxScore, strongCnt, totalReqs, team, isEligible, reqMatches, bestMatchingRole } = topCandidates[i];

      const tUniClean = team.university ? team.university.trim().toLowerCase() : null;
      const sameUni = Boolean(userUniClean && tUniClean && userUniClean === tUniClean);

      let category: "BEST" | "GOOD_DIFFERENT_UNIVERSITY" | "SAME_UNIVERSITY_LOWER_SCORE" | null = null;
      if (sameUni && taxScore >= strongThreshold) {
        category = "BEST";
      } else if (sameUni) {
        category = "SAME_UNIVERSITY_LOWER_SCORE";
      } else if (team.is_global) {
        // Only global events are eligible for cross-campus recommendations
        category = "GOOD_DIFFERENT_UNIVERSITY";
      } else {
        // Non-global events with different campus are locked/unrated
        category = null;
      }

      const breakdown: RequirementExplanationItem[] = [];
      for (const [rId, sVal, bestSkill, feats] of reqMatches) {
        const rNode = this.graph.getNode(rId);
        const rName = rNode?.canonical_name || rId;
        const rDepth = rNode ? rNode.depth : (feats?.requirement_depth ?? 0);

        let uName: string | null = null;
        let uDepth: number | undefined = undefined;
        if (bestSkill) {
          const uNode = this.graph.getNode(bestSkill);
          uName = uNode?.canonical_name || bestSkill;
          uDepth = uNode ? uNode.depth : (feats?.user_depth ?? 0);
        }

        const lcaNode = feats?.lca ? this.graph.getNode(feats.lca) : null;
        const lcaName = lcaNode?.canonical_name || feats?.lca || (feats?.exact_match ? rName : null);
        const lcaDepth = lcaNode ? lcaNode.depth : (feats?.lca_depth ?? 0);

        let matchType: "exact" | "ancestor" | "descendant" | "sibling" | "subdomain" | "domain" | "unmet" = "unmet";
        if (feats && sVal > 0) {
          if (feats.exact_match) matchType = "exact";
          else if (feats.user_is_ancestor) matchType = "ancestor";
          else if (feats.user_is_descendant) matchType = "descendant";
          else if (feats.same_parent) matchType = "sibling";
          else if (feats.lca_depth >= 2) matchType = "subdomain";
          else if (feats.lca_depth === 1) matchType = "domain";
        }

        const expl = formatExplanation(this.graph, rId, bestSkill, sVal, feats);

        breakdown.push({
          requirement_node_id: rId,
          requirement_name: rName,
          requirement_depth: rDepth,
          best_user_skill_id: bestSkill,
          best_user_skill_name: uName,
          best_user_skill_depth: uDepth,
          lca_node_id: feats?.lca || (feats?.exact_match ? rId : null),
          lca_node_name: lcaName,
          lca_depth: lcaDepth,
          graph_distance: feats?.graph_distance,
          match_type: matchType,
          score: sVal,
          explanation_text: expl,
          is_strong: sVal >= strongThreshold,
        });
      }

      recommendations.push({
        rank,
        team_id: team.team_id,
        team_name: team.team_name,
        university: team.university || null,
        description: team.description || null,
        requirements: team.requirements || [],
        taxonomy_score: taxScore,
        same_university: sameUni,
        is_global: team.is_global,
        is_eligible: isEligible,
        recommendation_category: category,
        fulfilled_requirements_count: strongCnt,
        total_requirements_count: totalReqs,
        requirement_breakdown: breakdown,
        best_matching_role: bestMatchingRole || null,
      });
    }

    return recommendations;
  }
}
