from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class TaxonomyNode(BaseModel):
    id: str
    canonical_name: str
    type: str
    parent_id: Optional[str] = None
    depth: int = 0
    aliases: List[str] = Field(default_factory=list)


class TaxonomyTreeMetadata(BaseModel):
    root: str
    total_nodes: int
    max_depth: int
    description: str


class TaxonomyTree(BaseModel):
    metadata: TaxonomyTreeMetadata
    nodes: Dict[str, TaxonomyNode]


class ResolutionResult(BaseModel):
    raw_input: str
    resolved: bool
    node_id: Optional[str] = None
    canonical_name: Optional[str] = None
    confidence: float = 0.0
    match_strategy: Optional[str] = None


class TaxonomyEvidenceItem(BaseModel):
    nodeId: str
    source: str  # "skills" | "projects" | "experience"
    snippet: str
    strength: float


class ResolvedUserTaxonomy(BaseModel):
    user_id: str
    taxonomy_node_ids: List[str]
    raw_skills: List[str]
    evidence: List[TaxonomyEvidenceItem] = Field(default_factory=list)


class ResolvedTeamTaxonomy(BaseModel):
    team_id: str
    requirement_node_ids: List[str]
    raw_requirements: List[str]
