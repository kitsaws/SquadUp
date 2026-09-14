from typing import List, Optional, Tuple, Dict, Set
from .base import GraphStore
from ..taxonomy.models import TaxonomyTree, TaxonomyNode


class InMemoryTreeStore(GraphStore):
    """
    High-performance in-memory rooted tree graph store.
    Computes LCA, tree distances, ancestor/descendant relationships deterministically.
    """

    def __init__(self, tree: TaxonomyTree):
        self.tree = tree
        self.nodes: Dict[str, TaxonomyNode] = tree.nodes
        self.root_id = tree.metadata.root
        self.child_map: Dict[str, List[str]] = {nid: [] for nid in self.nodes}
        self.ancestor_cache: Dict[str, List[str]] = {}
        self.descendant_cache: Dict[str, Set[str]] = {}

        self._initialize()

    def _initialize(self):
        # 1. Build children map
        for nid, node in self.nodes.items():
            if node.parent_id and node.parent_id in self.child_map:
                self.child_map[node.parent_id].append(nid)

        # 2. Precompute ancestor chains for each node: [parent, grandparent, ..., root]
        for nid in self.nodes:
            chain = []
            curr = self.nodes[nid].parent_id
            while curr is not None:
                chain.append(curr)
                curr = self.nodes[curr].parent_id if curr in self.nodes else None
            self.ancestor_cache[nid] = chain

    def get_node(self, node_id: str) -> Optional[TaxonomyNode]:
        return self.nodes.get(node_id)

    def get_parent(self, node_id: str) -> Optional[str]:
        node = self.nodes.get(node_id)
        return node.parent_id if node else None

    def get_ancestors(self, node_id: str) -> List[str]:
        return self.ancestor_cache.get(node_id, [])

    def get_descendants(self, node_id: str) -> List[str]:
        if node_id in self.descendant_cache:
            return list(self.descendant_cache[node_id])

        descendants = set()
        queue = list(self.child_map.get(node_id, []))
        while queue:
            child = queue.pop(0)
            descendants.add(child)
            queue.extend(self.child_map.get(child, []))

        self.descendant_cache[node_id] = descendants
        return list(descendants)

    def get_lca(self, node_a: str, node_b: str) -> Tuple[Optional[str], int]:
        if node_a not in self.nodes or node_b not in self.nodes:
            return None, -1

        if node_a == node_b:
            return node_a, self.nodes[node_a].depth

        # Path from a to root including a: [a, parent(a), ..., root]
        path_a = [node_a] + self.ancestor_cache.get(node_a, [])
        set_a = set(path_a)

        path_b = [node_b] + self.ancestor_cache.get(node_b, [])
        for node in path_b:
            if node in set_a:
                return node, self.nodes[node].depth

        return None, -1

    def get_distance(self, node_a: str, node_b: str) -> int:
        if node_a not in self.nodes or node_b not in self.nodes:
            return 999

        if node_a == node_b:
            return 0

        lca, lca_depth = self.get_lca(node_a, node_b)
        if lca is None:
            return 999

        depth_a = self.nodes[node_a].depth
        depth_b = self.nodes[node_b].depth
        return (depth_a - lca_depth) + (depth_b - lca_depth)

    def is_ancestor(self, potential_ancestor: str, target: str) -> bool:
        if potential_ancestor == target:
            return False
        return potential_ancestor in self.ancestor_cache.get(target, [])

    def is_descendant(self, potential_descendant: str, target: str) -> bool:
        if potential_descendant == target:
            return False
        return target in self.ancestor_cache.get(potential_descendant, [])

    def get_path_to_lca(self, node_a: str, node_b: str) -> Tuple[List[str], str, List[str]]:
        lca, _ = self.get_lca(node_a, node_b)
        if not lca:
            return [node_a], "none", [node_b]

        path_a = []
        curr = node_a
        while curr != lca and curr is not None:
            path_a.append(curr)
            curr = self.nodes[curr].parent_id if curr in self.nodes else None

        path_b = []
        curr = node_b
        while curr != lca and curr is not None:
            path_b.append(curr)
            curr = self.nodes[curr].parent_id if curr in self.nodes else None

        return path_a, lca, path_b
