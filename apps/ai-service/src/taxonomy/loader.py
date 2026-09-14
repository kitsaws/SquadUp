import json
from pathlib import Path
from typing import Optional
from .models import TaxonomyTree, TaxonomyNode, TaxonomyTreeMetadata

DEFAULT_TAXONOMY_PATH = Path(__file__).resolve().parent.parent.parent / "data" / "taxonomy_tree.json"


def load_taxonomy_tree(file_path: Optional[Path] = None) -> TaxonomyTree:
    path = file_path or DEFAULT_TAXONOMY_PATH
    if not path.exists():
        raise FileNotFoundError(f"Taxonomy file not found at: {path}")

    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    metadata = TaxonomyTreeMetadata(**data["metadata"])
    nodes = {nid: TaxonomyNode(**ndata) for nid, ndata in data["nodes"].items()}

    return TaxonomyTree(metadata=metadata, nodes=nodes)
