import re
from typing import List, Dict, Any, Optional, Set
from .models import TaxonomyEvidenceItem, ResolvedUserTaxonomy
from .resolver import TaxonomyResolver


SKILL_BASE_STRENGTH = 0.65
PROJECT_BASE_STRENGTH = 0.85
EXPERIENCE_BASE_STRENGTH = 1.00


def _split_into_sentences(text: str) -> List[str]:
    if not text:
        return []
    # Split by common sentence terminators or bullet points
    parts = re.split(r"(?<=[.!?])\s+|\n+|[•\-\*]\s*", text)
    return [p.strip() for p in parts if p.strip()]


class V2MultiSourceExtractor:
    """
    Extracts technical capabilities and provenance evidence from:
    1. Explicit Skills (Baseline strength: 0.65)
    2. Projects (Demonstrated usage strength: 0.85)
    3. Work Experience (Professional practice strength: 1.00)
    """

    def __init__(self, resolver: TaxonomyResolver):
        self.resolver = resolver

    def extract(
        self,
        user_id: str,
        skills: Optional[List[str]] = None,
        projects: Optional[List[Dict[str, Any]]] = None,
        experience: Optional[List[Dict[str, Any]]] = None
    ) -> ResolvedUserTaxonomy:
        raw_skills = skills or []
        projects = projects or []
        experience = experience or []

        all_evidence: List[TaxonomyEvidenceItem] = []
        seen_evidence_keys: Set[str] = set()

        def add_evidence(node_id: str, source: str, snippet: str, strength: float):
            clean_snippet = snippet.strip()
            # Trim snippet if too long
            if len(clean_snippet) > 200:
                clean_snippet = clean_snippet[:197] + "..."
            key = f"{node_id}::{source}::{clean_snippet.lower()}"
            if key not in seen_evidence_keys:
                seen_evidence_keys.add(key)
                all_evidence.append(TaxonomyEvidenceItem(
                    nodeId=node_id,
                    source=source,
                    snippet=clean_snippet,
                    strength=round(strength, 2)
                ))

        # 1. Process explicit skills
        for raw_s in raw_skills:
            res = self.resolver.resolve(raw_s, entity_context="skills")
            if res.resolved and res.node_id:
                add_evidence(
                    node_id=res.node_id,
                    source="skills",
                    snippet=raw_s,
                    strength=SKILL_BASE_STRENGTH
                )

        # 2. Process Projects
        for proj in projects:
            p_name = proj.get("name") or "Project"
            # Explicit project technologies
            proj_techs = proj.get("technologies") or []
            for t in proj_techs:
                res = self.resolver.resolve(t, entity_context=f"project:{p_name}")
                if res.resolved and res.node_id:
                    add_evidence(
                        node_id=res.node_id,
                        source="projects",
                        snippet=f"{p_name}: {t}",
                        strength=PROJECT_BASE_STRENGTH
                    )

            # Natural language scanning in project description and bullet points
            text_blocks = []
            if proj.get("description"):
                text_blocks.append(proj["description"])
            if proj.get("bullet_points"):
                text_blocks.extend(proj["bullet_points"])

            for block in text_blocks:
                sentences = _split_into_sentences(block)
                for sentence in sentences:
                    norm_sentence = f" {self.resolver._normalize(sentence)} "
                    # Check against phrase lookup
                    for phrase, nid, _ in self.resolver.phrase_lookup:
                        if f" {phrase} " in norm_sentence:
                            add_evidence(
                                node_id=nid,
                                source="projects",
                                snippet=f"{p_name}: {sentence}",
                                strength=PROJECT_BASE_STRENGTH
                            )

        # 3. Process Work Experience
        for exp in experience:
            role = exp.get("role") or "Software Engineer"
            company = exp.get("company") or "Company"
            context_label = f"{role} @ {company}"

            # Explicit experience technologies
            exp_techs = exp.get("technologies") or []
            for t in exp_techs:
                res = self.resolver.resolve(t, entity_context=context_label)
                if res.resolved and res.node_id:
                    add_evidence(
                        node_id=res.node_id,
                        source="experience",
                        snippet=f"{context_label}: {t}",
                        strength=EXPERIENCE_BASE_STRENGTH
                    )

            # Natural language scanning in experience bullet points
            bullets = exp.get("bullet_points") or []
            for bullet in bullets:
                sentences = _split_into_sentences(bullet)
                for sentence in sentences:
                    norm_sentence = f" {self.resolver._normalize(sentence)} "
                    for phrase, nid, _ in self.resolver.phrase_lookup:
                        if f" {phrase} " in norm_sentence:
                            add_evidence(
                                node_id=nid,
                                source="experience",
                                snippet=f"{context_label}: {sentence}",
                                strength=EXPERIENCE_BASE_STRENGTH
                            )

        # 4. Group by node_id and aggregate evidence strength
        node_evidence_map: Dict[str, List[TaxonomyEvidenceItem]] = {}
        for ev in all_evidence:
            node_evidence_map.setdefault(ev.nodeId, []).append(ev)

        final_evidence_list: List[TaxonomyEvidenceItem] = []
        for nid, ev_list in node_evidence_map.items():
            sources = {ev.source for ev in ev_list}
            max_strength = max(ev.strength for ev in ev_list)
            # Aggregation boost for cross-source validation
            boost = 0.10 * (len(sources) - 1)
            aggregated_strength = round(min(1.0, max_strength + boost), 2)

            # Sort items by strength descending and take top snippets
            ev_list.sort(key=lambda x: x.strength, reverse=True)
            for ev in ev_list:
                ev.strength = aggregated_strength
                final_evidence_list.append(ev)

        canonical_node_ids = list(node_evidence_map.keys())

        return ResolvedUserTaxonomy(
            user_id=user_id,
            taxonomy_node_ids=canonical_node_ids,
            raw_skills=raw_skills,
            evidence=final_evidence_list
        )
