// ai.service.ts
// In-process AI & Taxonomy Service (Node.js native implementation)
import type {
  CandidateProfileData,
  ProfileData,
  TeamRecommendationDTO,
  TaxonomyEvidenceItem,
} from "@squadup/shared";
import { parseResume as parseResumeFromBuffer } from "./resume.parser.js";
import { TaxonomyService } from "../taxonomy/taxonomy.service.js";

export interface ResolveUserTaxonomyResponse {
  user_id: string;
  taxonomy_node_ids: string[];
  raw_skills: string[];
  evidence: TaxonomyEvidenceItem[];
}

export interface ResolveTeamTaxonomyResponse {
  team_id: string;
  requirement_node_ids: string[];
  raw_requirements: string[];
}

export interface CandidateTeamPayload {
  team_id: string;
  team_name: string;
  university?: string | null;
  description?: string | null;
  requirements: string[];
  requirement_node_ids: string[];
  roles?: {
    id?: string;
    title?: string;
    role_title?: string;
    skills?: string[];
    raw_skills?: string[];
    spots?: number;
    assignedToId?: string | null;
    requirement_node_ids?: string[];
    requirementNodeIds?: string[];
  }[];
  is_global: boolean;
  is_eligible: boolean;
}

export class AIService {
  /**
   * Parses a PDF resume buffer in Node.js using pdfjs-dist and Groq LLM.
   */
  static async parseResume(fileBuffer: Buffer, filename: string): Promise<CandidateProfileData> {
    try {
      return await parseResumeFromBuffer(fileBuffer, filename);
    } catch (error) {
      console.error("[AIService] Error parsing resume:", error);
      throw error;
    }
  }

  /**
   * Resolves user skills, projects, and work experience to canonical taxonomy nodes
   * with V2 multi-source provenance evidence deterministically in-process.
   */
  static async resolveUserTaxonomy(
    userId: string,
    profileData: Partial<ProfileData>
  ): Promise<ResolveUserTaxonomyResponse> {
    try {
      const result = TaxonomyService.resolveUserTaxonomy(userId, {
        skills: profileData.skills || [],
        projects: (profileData.projects as any) || [],
        experience: (profileData.experience as any) || [],
        achievements: (profileData.achievements as any) || [],
      });
      return {
        user_id: result.user_id,
        taxonomy_node_ids: result.taxonomy_node_ids,
        raw_skills: result.raw_skills,
        evidence: result.evidence as TaxonomyEvidenceItem[],
      };
    } catch (error) {
      console.error("[AIService] Error resolving user taxonomy:", error);
      throw error;
    }
  }

  /**
   * Resolves team requirement tags to canonical requirement node IDs deterministically in-process.
   */
  static async resolveTeamRequirements(
    teamId: string,
    requirements: string[]
  ): Promise<ResolveTeamTaxonomyResponse> {
    try {
      const result = TaxonomyService.resolveTeamRequirements(teamId, requirements);
      return {
        team_id: result.team_id,
        requirement_node_ids: result.requirement_node_ids,
        raw_requirements: result.raw_requirements,
      };
    } catch (error) {
      console.error("[AIService] Error resolving team requirements:", error);
      throw error;
    }
  }

  /**
   * Resolves structured team roles to per-role canonical taxonomy nodes and aggregated requirements.
   */
  static resolveTeamRoles(
    roles: { id?: string; title: string; skills: string[]; spots?: number; assignedToId?: string | null }[]
  ) {
    return TaxonomyService.resolveTeamRoles(roles);
  }

  /**
   * Computes V2 pure taxonomy recommendations for a user given candidate teams deterministically in-process.
   */
  static async getRecommendations(payload: {
    userId: string;
    userTaxonomyNodeIds: string[];
    userUniversity?: string | null;
    candidateTeams: CandidateTeamPayload[];
    topK?: number;
  }): Promise<TeamRecommendationDTO[]> {
    try {
      const candidateTeams = (payload.candidateTeams || []).map((ct) => ({
        team_id: ct.team_id,
        team_name: ct.team_name,
        university: ct.university,
        description: ct.description,
        requirements: ct.requirements || [],
        requirement_node_ids: ct.requirement_node_ids || [],
        roles: ct.roles?.map((r) => {
          let reqNodeIds = r.requirementNodeIds || r.requirement_node_ids || [];
          const rawSkills = r.skills || r.raw_skills || [];
          const roleTitle = r.title || r.role_title || "";
          if (reqNodeIds.length === 0 && rawSkills.length > 0) {
            reqNodeIds = TaxonomyService.resolveTeamRoles([{ title: roleTitle, skills: rawSkills }]).requirementNodeIds;
          }
          return {
            role_id: r.id,
            role_title: roleTitle,
            requirement_node_ids: reqNodeIds,
            raw_skills: rawSkills,
            spots: r.spots,
            assigned_to_id: r.assignedToId || (r as any).assigned_to_id || null,
          };
        }),
        is_global: ct.is_global,
        is_eligible: ct.is_eligible,
      }));

      const recommendations = TaxonomyService.getRecommendations({
        userId: payload.userId,
        userTaxonomyNodeIds: payload.userTaxonomyNodeIds,
        userUniversity: payload.userUniversity,
        candidateTeams,
        topK: payload.topK,
      });

      return recommendations.map((item) => ({
        rank: item.rank,
        teamId: item.team_id,
        teamName: item.team_name,
        university: item.university,
        description: item.description,
        requirements: item.requirements || [],
        taxonomyScore: item.taxonomy_score,
        sameUniversity: item.same_university,
        isGlobal: item.is_global,
        isEligible: item.is_eligible,
        recommendationCategory: item.recommendation_category,
        fulfilledRequirementsCount: item.fulfilled_requirements_count,
        totalRequirementsCount: item.total_requirements_count,
        bestMatchingRole: item.best_matching_role
          ? {
              roleId: item.best_matching_role.role_id,
              roleTitle: item.best_matching_role.role_title,
              score: item.best_matching_role.score,
              fulfilledCount: item.best_matching_role.fulfilled_count,
              totalCount: item.best_matching_role.total_count,
              skills: item.best_matching_role.skills,
            }
          : undefined,
        requirementBreakdown: (item.requirement_breakdown || []).map((rb) => ({
          requirementNodeId: rb.requirement_node_id,
          requirementName: rb.requirement_name,
          requirementDepth: rb.requirement_depth,
          bestUserSkillId: rb.best_user_skill_id,
          bestUserSkillName: rb.best_user_skill_name,
          bestUserSkillDepth: rb.best_user_skill_depth,
          lcaNodeId: rb.lca_node_id,
          lcaNodeName: rb.lca_node_name,
          lcaDepth: rb.lca_depth,
          graphDistance: rb.graph_distance,
          matchType: rb.match_type,
          score: rb.score,
          explanationText: rb.explanation_text,
          isStrong: rb.is_strong,
        })),
      }));
    } catch (error) {
      console.error("[AIService] Error computing recommendations:", error);
      throw error;
    }
  }
}

