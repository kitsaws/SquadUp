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
  reqMatches: Array<[string, number, string | null, StructuralFeatures | null]>;
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
      const reqIds = team.requirement_node_ids || [];
      if (reqIds.length === 0) {
        scoredTeams.push({
          taxScore: 0.0,
          strongCnt: 0,
          totalReqs: 0,
          team,
          reqMatches: [],
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
        reqMatches,
      });
    }

    // 3. Sort candidates:
    // primary: pure taxonomy score descending
    // secondary: strong match count descending
    // tertiary: total requirements ascending (fewer unmet requirements)
    scoredTeams.sort((a, b) => {
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
      const { taxScore, strongCnt, totalReqs, team, reqMatches } = topCandidates[i];

      const tUniClean = team.university ? team.university.trim().toLowerCase() : null;
      const sameUni = Boolean(userUniClean && tUniClean && userUniClean === tUniClean);

      let category: "BEST" | "GOOD_DIFFERENT_UNIVERSITY" | "SAME_UNIVERSITY_LOWER_SCORE";
      if (sameUni && taxScore >= strongThreshold) {
        category = "BEST";
      } else if (!sameUni) {
        category = "GOOD_DIFFERENT_UNIVERSITY";
      } else {
        category = "SAME_UNIVERSITY_LOWER_SCORE";
      }

      const breakdown: RequirementExplanationItem[] = [];
      for (const [rId, sVal, bestSkill, feats] of reqMatches) {
        const rNode = this.graph.getNode(rId);
        const rName = rNode?.canonical_name || rId;

        let uName: string | null = null;
        if (bestSkill) {
          const uNode = this.graph.getNode(bestSkill);
          uName = uNode?.canonical_name || bestSkill;
        }

        const expl = formatExplanation(this.graph, rId, bestSkill, sVal, feats);

        breakdown.push({
          requirement_node_id: rId,
          requirement_name: rName,
          best_user_skill_name: uName,
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
        is_eligible: team.is_eligible,
        recommendation_category: category,
        fulfilled_requirements_count: strongCnt,
        total_requirements_count: totalReqs,
        requirement_breakdown: breakdown,
      });
    }

    return recommendations;
  }
}
