from fastapi import FastAPI, UploadFile, File, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
import shutil
import os

from resume_parser import extract_text_from_pdf, generate_profile_data
from src.taxonomy.loader import load_taxonomy_tree
from src.taxonomy.resolver import TaxonomyResolver
from src.taxonomy.extractor import V2MultiSourceExtractor
from src.taxonomy.models import ResolvedUserTaxonomy, ResolvedTeamTaxonomy
from src.graph.tree_store import InMemoryTreeStore
from src.ranking.engine import (
    CandidateTeamInput,
    RankedTeamRecommendation,
    V2RecommendationEngine,
)

app = FastAPI(title="SquadUp AI Service")

# Initialize Singleton In-Memory Taxonomy & Recommendation Engine
_tree = load_taxonomy_tree()
_resolver = TaxonomyResolver(_tree)
_graph = InMemoryTreeStore(_tree)
_extractor = V2MultiSourceExtractor(_resolver)
_engine = V2RecommendationEngine(graph=_graph)


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "ai-service",
        "taxonomy_nodes_count": len(_tree.nodes),
        "root": _tree.metadata.root,
        "max_depth": _tree.metadata.max_depth,
    }


@app.post("/api/parse-resume")
async def parse_resume(file: UploadFile = File(...)):
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
        
    temp_file_path = f"temp_{file.filename}"
    try:
        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        resume_text = extract_text_from_pdf(temp_file_path)
        if not resume_text:
            raise HTTPException(status_code=400, detail="No readable text found in PDF.")
            
        profile = generate_profile_data(resume_text)
        return profile
    finally:
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)


class ResolveUserTaxonomyRequest(BaseModel):
    user_id: str
    skills: Optional[List[str]] = Field(default_factory=list)
    projects: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    experience: Optional[List[Dict[str, Any]]] = Field(default_factory=list)


@app.post("/api/taxonomy/resolve-user", response_model=ResolvedUserTaxonomy)
def resolve_user_taxonomy(req: ResolveUserTaxonomyRequest):
    """
    V2 Multi-Source Extraction: extracts canonical taxonomy nodes and provenance
    evidence snippets from skills, projects, and work experience.
    """
    resolved = _extractor.extract(
        user_id=req.user_id,
        skills=req.skills,
        projects=req.projects,
        experience=req.experience
    )
    return resolved


class ResolveTeamTaxonomyRequest(BaseModel):
    team_id: str
    requirements: List[str] = Field(default_factory=list)


@app.post("/api/taxonomy/resolve-team", response_model=ResolvedTeamTaxonomy)
def resolve_team_taxonomy(req: ResolveTeamTaxonomyRequest):
    """
    Deterministically resolves raw team requirements to canonical requirement node IDs.
    """
    resolved_results = _resolver.resolve_list(req.requirements, entity_context=f"team:{req.team_id}")
    node_ids = [r.node_id for r in resolved_results if r.resolved and r.node_id]

    return ResolvedTeamTaxonomy(
        team_id=req.team_id,
        requirement_node_ids=node_ids,
        raw_requirements=req.requirements
    )


class RecommendationsRequest(BaseModel):
    user_id: str
    user_taxonomy_node_ids: List[str] = Field(default_factory=list)
    user_university: Optional[str] = None
    candidate_teams: List[CandidateTeamInput] = Field(default_factory=list)
    top_k: int = 50


@app.post("/api/recommendations", response_model=List[RankedTeamRecommendation])
def generate_recommendations(req: RecommendationsRequest):
    """
    Executes V2 pure taxonomy matching and categorization:
    1. Precomputes user vector over all 143 nodes (< 2ms)
    2. Scores candidate teams in O(1) float operations
    3. Categorizes candidates into BEST, GOOD_DIFFERENT_UNIVERSITY, SAME_UNIVERSITY_LOWER_SCORE
    4. Attaches plain-English LCA decision paths
    """
    if not req.user_taxonomy_node_ids:
        # If user has no skills mapped, return empty recommendations
        return []

    recommendations = _engine.recommend(
        user_node_ids=req.user_taxonomy_node_ids,
        user_university=req.user_university,
        candidate_teams=req.candidate_teams,
        top_k=req.top_k,
        strong_threshold=0.80
    )
    return recommendations


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
