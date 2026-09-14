from typing import Optional
from pydantic import BaseModel
from ..graph.base import GraphStore


class StructuralFeatures(BaseModel):
    user_skill: str
    team_requirement: str

    exact_match: bool
    user_is_ancestor: bool
    user_is_descendant: bool

    graph_distance: int

    lca: Optional[str]
    lca_depth: int

    user_depth: int
    requirement_depth: int

    same_parent: bool
    same_branch: bool


def extract_structural_features(
    graph: GraphStore,
    user_node_id: str,
    req_node_id: str
) -> StructuralFeatures:
    """
    Extracts transparent structural features between
    a user skill node and a team requirement node.
    """
    u_node = graph.get_node(user_node_id)
    r_node = graph.get_node(req_node_id)

    if not u_node or not r_node:
        return StructuralFeatures(
            user_skill=user_node_id,
            team_requirement=req_node_id,
            exact_match=False,
            user_is_ancestor=False,
            user_is_descendant=False,
            graph_distance=999,
            lca=None,
            lca_depth=-1,
            user_depth=-1,
            requirement_depth=-1,
            same_parent=False,
            same_branch=False
        )

    exact_match = (user_node_id == req_node_id)
    u_parent = graph.get_parent(user_node_id)
    r_parent = graph.get_parent(req_node_id)
    same_parent = (u_parent is not None and u_parent == r_parent and not exact_match)

    lca_id, lca_depth = graph.get_lca(user_node_id, req_node_id)
    distance = graph.get_distance(user_node_id, req_node_id)

    user_is_anc = graph.is_ancestor(user_node_id, req_node_id)
    user_is_desc = graph.is_descendant(user_node_id, req_node_id)
    same_branch = (lca_depth >= 1)

    return StructuralFeatures(
        user_skill=user_node_id,
        team_requirement=req_node_id,
        exact_match=exact_match,
        user_is_ancestor=user_is_anc,
        user_is_descendant=user_is_desc,
        graph_distance=distance,
        lca=lca_id,
        lca_depth=lca_depth,
        user_depth=u_node.depth,
        requirement_depth=r_node.depth,
        same_parent=same_parent,
        same_branch=same_branch
    )
