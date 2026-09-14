import re
from typing import Dict, List, Optional, Tuple
from .models import TaxonomyTree, ResolutionResult


class TaxonomyResolver:
    """
    Deterministic taxonomy resolution layer.
    Maps raw skill/requirement strings into canonical taxonomy nodes without LLMs or embeddings.
    """

    def __init__(self, tree: TaxonomyTree):
        self.tree = tree
        self.case_sensitive_lookup: Dict[str, str] = {}
        self.canonical_lookup: Dict[str, str] = {}
        self.alias_lookup: Dict[str, str] = {}
        self.phrase_lookup: List[Tuple[str, str, int]] = []  # (normalized_phrase, node_id, length)
        self.unresolved_log: List[Dict[str, str]] = []
        self._build_indexes()

    def _normalize(self, text: str) -> str:
        """
        Cleans text: lowercase, replaces punctuation with space, collapses whitespace.
        Preserves characters like + and # (C++, C#).
        """
        if not text:
            return ""
        s = text.lower().strip()
        s = re.sub(r"[^\w\s\+#]", " ", s)
        s = re.sub(r"\s+", " ", s).strip()
        return s

    def _build_indexes(self):
        """Precomputes lookup tables for O(1) matching."""
        # Special case: ReAct (Agentic AI) vs React (Frontend UI)
        self.case_sensitive_lookup["ReAct"] = "react_agent_pattern"
        self.case_sensitive_lookup["React"] = "react"

        for nid, node in self.tree.nodes.items():
            self.case_sensitive_lookup[node.canonical_name.strip()] = nid

            norm_name = self._normalize(node.canonical_name)
            if norm_name == "react":
                if nid == "react":
                    self.canonical_lookup[norm_name] = nid
            else:
                self.canonical_lookup[norm_name] = nid
            self.canonical_lookup[nid] = nid
            self.canonical_lookup[node.id.lower()] = nid

            for alias in node.aliases:
                norm_alias = self._normalize(alias)
                if norm_alias:
                    if norm_alias == "react":
                        if nid == "react":
                            self.alias_lookup[norm_alias] = nid
                    else:
                        self.alias_lookup[norm_alias] = nid

        all_phrases = []
        for phrase, nid in self.canonical_lookup.items():
            all_phrases.append((phrase, nid, len(phrase)))
        for phrase, nid in self.alias_lookup.items():
            all_phrases.append((phrase, nid, len(phrase)))

        seen = set()
        for phrase, nid, length in sorted(all_phrases, key=lambda x: x[2], reverse=True):
            if phrase not in seen:
                seen.add(phrase)
                self.phrase_lookup.append((phrase, nid, length))

    def resolve(self, raw_input: str, entity_context: Optional[str] = None) -> ResolutionResult:
        """
        Resolves a raw input string to a canonical TaxonomyNode.
        Returns ResolutionResult with resolved status and node details.
        """
        if not raw_input or not raw_input.strip():
            return ResolutionResult(
                raw_input=raw_input or "",
                resolved=False,
                match_strategy="unresolved"
            )

        stripped = raw_input.strip()
        # 0. Exact case-sensitive match
        if stripped in self.case_sensitive_lookup:
            nid = self.case_sensitive_lookup[stripped]
            return ResolutionResult(
                raw_input=raw_input,
                resolved=True,
                node_id=nid,
                canonical_name=self.tree.nodes[nid].canonical_name,
                confidence=1.0,
                match_strategy="exact_canonical"
            )

        norm = self._normalize(raw_input)

        # 1. Exact canonical match
        if norm in self.canonical_lookup:
            nid = self.canonical_lookup[norm]
            return ResolutionResult(
                raw_input=raw_input,
                resolved=True,
                node_id=nid,
                canonical_name=self.tree.nodes[nid].canonical_name,
                confidence=1.0,
                match_strategy="exact_canonical"
            )

        # 2. Exact alias match
        if norm in self.alias_lookup:
            nid = self.alias_lookup[norm]
            return ResolutionResult(
                raw_input=raw_input,
                resolved=True,
                node_id=nid,
                canonical_name=self.tree.nodes[nid].canonical_name,
                confidence=0.98,
                match_strategy="exact_alias"
            )

        # 3. Word boundary / Substring phrase match
        words_in_input = f" {norm} "
        for phrase, nid, _ in self.phrase_lookup:
            if f" {phrase} " in words_in_input:
                return ResolutionResult(
                    raw_input=raw_input,
                    resolved=True,
                    node_id=nid,
                    canonical_name=self.tree.nodes[nid].canonical_name,
                    confidence=0.90,
                    match_strategy="phrase_match"
                )

        # 4. If unresolved, log without guessing
        self.unresolved_log.append({
            "raw_input": raw_input,
            "normalized": norm,
            "context": entity_context or "unknown"
        })
        return ResolutionResult(
            raw_input=raw_input,
            resolved=False,
            confidence=0.0,
            match_strategy="unresolved"
        )

    def resolve_list(self, raw_terms: List[str], entity_context: Optional[str] = None) -> List[ResolutionResult]:
        """Resolves a list of terms, deduplicating resolved canonical node IDs."""
        results = []
        seen_nodes = set()
        for term in raw_terms:
            res = self.resolve(term, entity_context=entity_context)
            if res.resolved and res.node_id:
                if res.node_id not in seen_nodes:
                    seen_nodes.add(res.node_id)
                    results.append(res)
            else:
                results.append(res)
        return results
