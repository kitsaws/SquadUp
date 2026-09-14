from typing import Tuple, Optional
from .structural import StructuralFeatures, extract_structural_features
from ..graph.base import GraphStore


class DirectionalPairScorer:
    """
    Computes a directional matching score from a user capability to a team requirement.
    Applies the 7 structural graph rules.
    """

    def __init__(
        self,
        exact_match_score: float = 1.0,
        descendant_base: float = 0.95,
        descendant_decay: float = 0.05,
        ancestor_base: float = 0.45,
        ancestor_decay: float = 0.08,
        sibling_base: float = 0.65,
    ):
        self.exact_match_score = exact_match_score
        self.descendant_base = descendant_base
        self.descendant_decay = descendant_decay
        self.ancestor_base = ancestor_base
        self.ancestor_decay = ancestor_decay
        self.sibling_base = sibling_base

    def score(self, features: StructuralFeatures) -> float:
        # Case 1: Exact match
        if features.exact_match:
            return self.exact_match_score

        # Case 7: Unrelated (LCA is root / depth <= 0 or not found)
        if features.lca_depth <= 0 or features.graph_distance >= 999:
            return 0.0

        d = features.graph_distance

        # Case 2: User skill is descendant of team requirement (Specific satisfies Broad)
        # e.g., React (User) -> Frontend Development (Requirement)
        if features.user_is_descendant:
            raw = self.descendant_base - self.descendant_decay * (d - 1)
            return round(max(0.65, min(0.95, raw)), 4)

        # Case 3: User skill is ancestor of team requirement (Broad vs Specific)
        # e.g., Frontend Development (User) -> React (Requirement)
        if features.user_is_ancestor:
            raw = self.ancestor_base - self.ancestor_decay * (d - 1)
            return round(max(0.15, min(0.45, raw)), 4)

        # Case 4: Siblings (Same immediate parent)
        # e.g., React <-> Angular (under Frontend Development)
        if features.same_parent:
            return round(self.sibling_base, 4)

        # Case 5: Related branches within a specific subdomain (LCA depth >= 2)
        # e.g., FastAPI <-> React (under Web Development, LCA depth 2)
        if features.lca_depth >= 2:
            raw = 0.35 + (0.05 * features.lca_depth) - (0.03 * (d - 2))
            return round(max(0.25, min(0.50, raw)), 4)

        # Case 6: Broad common domain ancestor only (LCA depth == 1)
        # e.g., NER <-> RAG (under AI / ML, LCA depth 1)
        if features.lca_depth == 1:
            raw = 0.20 - (0.02 * max(0, d - 4))
            return round(max(0.10, min(0.25, raw)), 4)

        return 0.0


def pair_score(
    graph: GraphStore,
    user_node_id: str,
    req_node_id: str,
    scorer: Optional[DirectionalPairScorer] = None
) -> Tuple[float, StructuralFeatures]:
    """Convenience helper extracting structural features and scoring a single pair."""
    scorer = scorer or DirectionalPairScorer()
    features = extract_structural_features(graph, user_node_id, req_node_id)
    score_val = scorer.score(features)
    return score_val, features
