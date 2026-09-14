from abc import ABC, abstractmethod
from typing import List, Optional, Tuple
from ..taxonomy.models import TaxonomyNode


class GraphStore(ABC):
    """Abstract interface for knowledge graph operations."""

    @abstractmethod
    def get_node(self, node_id: str) -> Optional[TaxonomyNode]:
        pass

    @abstractmethod
    def get_parent(self, node_id: str) -> Optional[str]:
        pass

    @abstractmethod
    def get_ancestors(self, node_id: str) -> List[str]:
        pass

    @abstractmethod
    def get_descendants(self, node_id: str) -> List[str]:
        pass

    @abstractmethod
    def get_lca(self, node_a: str, node_b: str) -> Tuple[Optional[str], int]:
        pass

    @abstractmethod
    def get_distance(self, node_a: str, node_b: str) -> int:
        pass

    @abstractmethod
    def is_ancestor(self, potential_ancestor: str, target: str) -> bool:
        pass

    @abstractmethod
    def is_descendant(self, potential_descendant: str, target: str) -> bool:
        pass

    @abstractmethod
    def get_path_to_lca(self, node_a: str, node_b: str) -> Tuple[List[str], str, List[str]]:
        pass
