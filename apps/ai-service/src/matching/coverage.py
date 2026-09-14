from typing import List, Optional
from pydantic import BaseModel
from .structural import StructuralFeatures
from .pair_scorer import DirectionalPairScorer, pair_score
from ..graph.base import GraphStore


class RequirementMatch(BaseModel):
    requirement_node_id: str
    best_user_skill_id: Optional[str] = None
    score: float = 0.0
    structural_features: Optional[StructuralFeatures] = None


class TeamCoverage(BaseModel):
    team_id: str
    user_id: str
    overall_score: float
    requirement_matches: List[RequirementMatch]
    total_requirements: int
    strong_matches_count: int  # score >= 0.8
    moderate_matches_count: int  # 0.4 <= score < 0.8
    weak_or_zero_count: int  # score < 0.4


def calculate_team_coverage(
    graph: GraphStore,
    user_skill_ids: List[str],
    team_req_ids: List[str],
    team_id: str = "",
    user_id: str = "",
    scorer: Optional[DirectionalPairScorer] = None
) -> TeamCoverage:
    """
    Calculates requirement-level matching.
    For each requirement in team_req_ids:
        find the strongest user skill match.
    Then aggregates overall coverage.
    """
    scorer = scorer or DirectionalPairScorer()

    if not team_req_ids:
        return TeamCoverage(
            team_id=team_id,
            user_id=user_id,
            overall_score=0.0,
            requirement_matches=[],
            total_requirements=0,
            strong_matches_count=0,
            moderate_matches_count=0,
            weak_or_zero_count=0
        )

    matches: List[RequirementMatch] = []
    total_score = 0.0
    strong_cnt = 0
    mod_cnt = 0
    weak_cnt = 0

    for r_id in team_req_ids:
        best_score = 0.0
        best_skill: Optional[str] = None
        best_feat: Optional[StructuralFeatures] = None

        if not user_skill_ids:
            matches.append(RequirementMatch(
                requirement_node_id=r_id,
                best_user_skill_id=None,
                score=0.0,
                structural_features=None
            ))
            weak_cnt += 1
            continue

        for u_id in user_skill_ids:
            score_val, feats = pair_score(graph, u_id, r_id, scorer=scorer)
            if score_val > best_score:
                best_score = score_val
                best_skill = u_id
                best_feat = feats
                if best_score >= 1.0:
                    break

        if best_score >= 0.80:
            strong_cnt += 1
        elif best_score >= 0.40:
            mod_cnt += 1
        else:
            weak_cnt += 1

        total_score += best_score
        matches.append(RequirementMatch(
            requirement_node_id=r_id,
            best_user_skill_id=best_skill,
            score=round(best_score, 4),
            structural_features=best_feat
        ))

    overall = round(total_score / len(team_req_ids), 4)

    return TeamCoverage(
        team_id=team_id,
        user_id=user_id,
        overall_score=overall,
        requirement_matches=matches,
        total_requirements=len(team_req_ids),
        strong_matches_count=strong_cnt,
        moderate_matches_count=mod_cnt,
        weak_or_zero_count=weak_cnt
    )
