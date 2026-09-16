export interface TaxonomyNode {
  id: string;
  canonical_name: string;
  type: string;
  parent_id: string | null;
  depth: number;
  aliases: string[];
}

export interface TaxonomyTreeMetadata {
  root: string;
  total_nodes: number;
  max_depth: number;
  description: string;
}

export interface TaxonomyTree {
  metadata: TaxonomyTreeMetadata;
  nodes: Record<string, TaxonomyNode>;
}

export interface ResolutionResult {
  raw_input: string;
  resolved: boolean;
  node_id?: string | null;
  canonical_name?: string | null;
  confidence: number;
  match_strategy?: string | null;
}

export interface TaxonomyEvidenceItem {
  nodeId: string;
  source: "skills" | "projects" | "experience";
  snippet: string;
  strength: number;
}

export interface ResolvedUserTaxonomy {
  user_id: string;
  taxonomy_node_ids: string[];
  raw_skills: string[];
  evidence: TaxonomyEvidenceItem[];
}

export interface ResolvedTeamTaxonomy {
  team_id: string;
  requirement_node_ids: string[];
  raw_requirements: string[];
}

export interface StructuralFeatures {
  user_skill: string;
  team_requirement: string;
  exact_match: boolean;
  user_is_ancestor: boolean;
  user_is_descendant: boolean;
  graph_distance: number;
  lca: string | null;
  lca_depth: number;
  user_depth: number;
  requirement_depth: number;
  same_parent: boolean;
  same_branch: boolean;
}

export interface RequirementMatch {
  requirement_node_id: string;
  best_user_skill_id: string | null;
  score: number;
  structural_features?: StructuralFeatures | null;
}

export interface CandidateTeamInput {
  team_id: string;
  team_name: string;
  university?: string | null;
  description?: string | null;
  requirements: string[];
  requirement_node_ids: string[];
  is_global: boolean;
  is_eligible: boolean;
}

export interface RequirementExplanationItem {
  requirement_node_id: string;
  requirement_name: string;
  best_user_skill_name: string | null;
  score: number;
  explanation_text: string;
  is_strong: boolean;
}

export interface RankedTeamRecommendation {
  rank: number;
  team_id: string;
  team_name: string;
  university?: string | null;
  description?: string | null;
  requirements: string[];
  taxonomy_score: number;
  same_university: boolean;
  is_global: boolean;
  is_eligible: boolean;
  recommendation_category: "BEST" | "GOOD_DIFFERENT_UNIVERSITY" | "SAME_UNIVERSITY_LOWER_SCORE";
  fulfilled_requirements_count: number;
  total_requirements_count: number;
  requirement_breakdown: RequirementExplanationItem[];
}
