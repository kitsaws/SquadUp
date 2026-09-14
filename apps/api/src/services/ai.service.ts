// ai.service.ts
// Communicates with the Python FastAPI AI Microservice
import type { 
  ProfileData, 
  TeamRecommendationDTO,
  TaxonomyEvidenceItem
} from "@squadup/shared";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

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
  is_global: boolean;
  is_eligible: boolean;
}

export class AIService {
  /**
   * Sends a PDF resume buffer to the AI microservice for parsing.
   */
  static async parseResume(fileBuffer: Buffer, filename: string): Promise<any> {
    const formData = new FormData();
    const blob = new Blob([fileBuffer as any], { type: 'application/pdf' });
    formData.append('file', blob, filename);

    try {
      const response = await fetch(`${AI_SERVICE_URL}/api/parse-resume`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AI Service returned ${response.status}: ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error calling AI microservice (parseResume):', error);
      throw error;
    }
  }

  /**
   * Resolves user skills, projects, and work experience to canonical taxonomy nodes
   * with V2 multi-source provenance evidence.
   */
  static async resolveUserTaxonomy(
    userId: string,
    profileData: Partial<ProfileData>
  ): Promise<ResolveUserTaxonomyResponse> {
    try {
      const response = await fetch(`${AI_SERVICE_URL}/api/taxonomy/resolve-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          skills: profileData.skills || [],
          projects: profileData.projects || [],
          experience: profileData.experience || [],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AI Service returned ${response.status}: ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error calling AI microservice (resolveUserTaxonomy):', error);
      throw error;
    }
  }

  /**
   * Resolves team requirement tags to canonical requirement node IDs.
   */
  static async resolveTeamRequirements(
    teamId: string,
    requirements: string[]
  ): Promise<ResolveTeamTaxonomyResponse> {
    try {
      const response = await fetch(`${AI_SERVICE_URL}/api/taxonomy/resolve-team`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          team_id: teamId,
          requirements: requirements || [],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AI Service returned ${response.status}: ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error calling AI microservice (resolveTeamRequirements):', error);
      throw error;
    }
  }

  /**
   * Computes V2 pure taxonomy recommendations for a user given candidate teams.
   */
  static async getRecommendations(payload: {
    userId: string;
    userTaxonomyNodeIds: string[];
    userUniversity?: string | null;
    candidateTeams: CandidateTeamPayload[];
    topK?: number;
  }): Promise<TeamRecommendationDTO[]> {
    try {
      const response = await fetch(`${AI_SERVICE_URL}/api/recommendations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: payload.userId,
          user_taxonomy_node_ids: payload.userTaxonomyNodeIds,
          user_university: payload.userUniversity || null,
          candidate_teams: payload.candidateTeams,
          top_k: payload.topK || 50,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AI Service returned ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      return data.map((item: any) => ({
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
        requirementBreakdown: (item.requirement_breakdown || []).map((rb: any) => ({
          requirementNodeId: rb.requirement_node_id,
          requirementName: rb.requirement_name,
          bestUserSkillName: rb.best_user_skill_name,
          score: rb.score,
          explanationText: rb.explanation_text,
          isStrong: rb.is_strong,
        })),
      }));
    } catch (error) {
      console.error('Error calling AI microservice (getRecommendations):', error);
      throw error;
    }
  }
}
