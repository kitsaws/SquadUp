export interface TaxonomyEvidenceItem {
  nodeId: string;
  source: "skills" | "projects" | "experience";
  snippet: string;
  strength: number;
}

export interface UserTaxonomyDTO {
  id: string;
  userId: string;
  taxonomyNodeIds: string[];
  rawSkills: string[];
  evidence?: TaxonomyEvidenceItem[];
  createdAt: string;
  updatedAt: string;
}

export interface TeamTaxonomyDTO {
  id: string;
  teamId: string;
  requirementNodeIds: string[];
  rawRequirements: string[];
  createdAt: string;
  updatedAt: string;
}

export type RecommendationCategory =
  | "BEST"
  | "GOOD_DIFFERENT_UNIVERSITY"
  | "SAME_UNIVERSITY_LOWER_SCORE";

export interface RecommendationFilterPayload {
  eventId?: string;
  sameUniversityOnly?: boolean;
  requiredSkills?: string[];
  topK?: number;
}

export interface RequirementExplanationDTO {
  requirementNodeId: string;
  requirementName: string;
  bestUserSkillName: string | null;
  score: number;
  explanationText: string;
  isStrong: boolean;
}

export interface TeamRecommendationDTO {
  rank: number;
  teamId: string;
  teamName: string;
  university?: string | null;
  description?: string | null;
  requirements: string[];
  taxonomyScore: number;
  sameUniversity: boolean;
  isGlobal: boolean;
  isEligible: boolean;
  recommendationCategory?: RecommendationCategory | null;
  fulfilledRequirementsCount: number;
  totalRequirementsCount: number;
  requirementBreakdown: RequirementExplanationDTO[];
}
