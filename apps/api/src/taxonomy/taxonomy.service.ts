import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { TaxonomyTree, ResolvedUserTaxonomy, ResolvedTeamTaxonomy, CandidateTeamInput, RankedTeamRecommendation } from "./taxonomy.types.js";
import { InMemoryTreeStore } from "./tree.store.js";
import { TaxonomyResolver } from "./taxonomy.resolver.js";
import { V2MultiSourceExtractor } from "./taxonomy.extractor.js";
import { V2RecommendationEngine } from "./recommendation.engine.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve taxonomy tree path across src and dist
function getTaxonomyTree(): TaxonomyTree {
  const candidatePaths = [
    path.resolve(__dirname, "data", "taxonomy_tree.json"),
    path.resolve(__dirname, "../../src/taxonomy/data", "taxonomy_tree.json"),
    path.resolve(process.cwd(), "src/taxonomy/data", "taxonomy_tree.json"),
    path.resolve(process.cwd(), "dist/taxonomy/data", "taxonomy_tree.json"),
  ];

  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      const raw = fs.readFileSync(p, "utf-8");
      return JSON.parse(raw);
    }
  }

  throw new Error(`Taxonomy file not found in candidates: ${candidatePaths.join(", ")}`);
}

const taxonomyTree: TaxonomyTree = getTaxonomyTree();

// Initialize singletons
export const treeStore = new InMemoryTreeStore(taxonomyTree);
export const taxonomyResolver = new TaxonomyResolver(taxonomyTree);
export const multiSourceExtractor = new V2MultiSourceExtractor(taxonomyResolver);
export const recommendationEngine = new V2RecommendationEngine(treeStore);

export class TaxonomyService {
  /**
   * Resolves user skills, projects, and work experience to canonical taxonomy nodes
   * with V2 multi-source provenance evidence.
   */
  static resolveUserTaxonomy(
    userId: string,
    profileData: {
      skills?: string[] | null;
      projects?: Array<Record<string, any>> | null;
      experience?: Array<Record<string, any>> | null;
      achievements?: Array<Record<string, any>> | null;
    }
  ): ResolvedUserTaxonomy {
    const combinedExp = [
      ...(profileData.experience || []),
      ...(profileData.achievements || []),
    ];

    return multiSourceExtractor.extract(
      userId,
      profileData.skills,
      profileData.projects,
      combinedExp
    );
  }

  /**
   * Resolves team requirement tags to canonical requirement node IDs.
   */
  static resolveTeamRequirements(
    teamId: string,
    requirements: string[]
  ): ResolvedTeamTaxonomy {
    const resolvedResults = taxonomyResolver.resolveList(requirements || [], `team:${teamId}`);
    const nodeIds = resolvedResults
      .filter((r) => r.resolved && r.node_id)
      .map((r) => r.node_id as string);

    return {
      team_id: teamId,
      requirement_node_ids: nodeIds,
      raw_requirements: requirements || [],
    };
  }

  /**
   * Resolves structured team roles to canonical requirement node IDs per role
   * and aggregates all unique canonical requirement node IDs for the team.
   */
  static resolveTeamRoles(
    rolesOrTeamId:
      | string
      | Array<{ id?: string; title: string; skills: string[]; spots?: number; assignedToId?: string | null }>,
    maybeRoles?: Array<{ id?: string; title: string; skills: string[]; spots?: number; assignedToId?: string | null }>
  ): {
    requirementNodeIds: string[];
    roleTaxonomies: Array<{
      roleId?: string;
      roleTitle: string;
      requirementNodeIds: string[];
      rawSkills: string[];
    }>;
  } {
    const roles = Array.isArray(rolesOrTeamId) ? rolesOrTeamId : (maybeRoles || []);
    const allNodeIds = new Set<string>();
    const roleTaxonomies = (roles || []).map((role) => {
      const resolved = taxonomyResolver.resolveList(role.skills || [], role.title);
      const nodeIds = resolved.filter((r) => r.resolved && r.node_id).map((r) => r.node_id as string);
      for (const nid of nodeIds) allNodeIds.add(nid);

      return {
        roleId: role.id,
        roleTitle: role.title,
        requirementNodeIds: nodeIds,
        rawSkills: role.skills || [],
      };
    });

    return {
      requirementNodeIds: Array.from(allNodeIds),
      roleTaxonomies,
    };
  }

  /**
   * Computes V2 pure taxonomy recommendations for a user given candidate teams.
   */
  static getRecommendations(payload: {
    userId: string;
    userTaxonomyNodeIds: string[];
    userUniversity?: string | null;
    candidateTeams: CandidateTeamInput[];
    topK?: number;
  }): RankedTeamRecommendation[] {
    if (!payload.userTaxonomyNodeIds || payload.userTaxonomyNodeIds.length === 0) {
      return [];
    }

    return recommendationEngine.recommend(
      payload.userTaxonomyNodeIds,
      payload.userUniversity,
      payload.candidateTeams,
      payload.topK || 50,
      0.80
    );
  }
}
