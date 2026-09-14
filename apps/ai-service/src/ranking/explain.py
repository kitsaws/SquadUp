from typing import Optional
from ..graph.base import GraphStore
from ..matching.coverage import RequirementMatch


def format_explanation(graph: GraphStore, match: RequirementMatch) -> str:
    """
    Generates a clear explanation for a single requirement match based on LCA.
    """
    r_node = graph.get_node(match.requirement_node_id)
    r_name = r_node.canonical_name if r_node else match.requirement_node_id

    if not match.best_user_skill_id:
        return f"Requirement '{r_name}': Unmet (No matching skills. Score: 0.0)"

    u_node = graph.get_node(match.best_user_skill_id)
    u_name = u_node.canonical_name if u_node else match.best_user_skill_id

    feats = match.structural_features
    if not feats:
        return f"Requirement '{r_name}': Matched by '{u_name}' (Score: {match.score})"

    if feats.exact_match:
        return f"Requirement '{r_name}': Direct exact match with '{u_name}' (Score: 1.0)"

    lca_node = graph.get_node(feats.lca) if feats.lca else None
    lca_name = lca_node.canonical_name if lca_node else (feats.lca or "General")

    if feats.user_is_descendant:
        return (
            f"Requirement '{r_name}': Specific satisfies broad — "
            f"Skill '{u_name}' is a specialized component of '{r_name}' "
            f"(Score: {match.score})"
        )

    if feats.user_is_ancestor:
        return (
            f"Requirement '{r_name}': Broad background — "
            f"Skill '{u_name}' is a broad parent category of specific requirement '{r_name}' "
            f"(Discounted Score: {match.score})"
        )

    if feats.same_parent:
        return (
            f"Requirement '{r_name}': Sibling technology — "
            f"Skill '{u_name}' shares the same parent '{lca_name}' as '{r_name}' "
            f"(Score: {match.score})"
        )

    if feats.lca_depth >= 2:
        return (
            f"Requirement '{r_name}': Related subdomain — "
            f"Skill '{u_name}' shares subdomain '{lca_name}' with '{r_name}' "
            f"(Score: {match.score})"
        )

    if feats.lca_depth == 1:
        return (
            f"Requirement '{r_name}': Broad domain overlap — "
            f"Skill '{u_name}' connected only at root domain level '{lca_name}' "
            f"(Score: {match.score})"
        )

    return f"Requirement '{r_name}': Weakly matched by '{u_name}' (Score: {match.score})"
