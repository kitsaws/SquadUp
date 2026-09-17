import { TaxonomyEvidenceItem, ResolvedUserTaxonomy } from "./taxonomy.types.js";
import { TaxonomyResolver } from "./taxonomy.resolver.js";

export const SKILL_BASE_STRENGTH = 0.65;
export const PROJECT_BASE_STRENGTH = 0.85;
export const EXPERIENCE_BASE_STRENGTH = 1.00;

export function splitIntoSentences(text: string): string[] {
  if (!text) return [];
  const parts = text.split(/(?<=[.!?])\s+|\n+|[•\-\*]\s*/);
  return parts.map((p) => p.trim()).filter((p) => p.length > 0);
}

export class V2MultiSourceExtractor {
  public resolver: TaxonomyResolver;

  constructor(resolver: TaxonomyResolver) {
    this.resolver = resolver;
  }

  public extract(
    userId: string,
    skills?: string[] | null,
    projects?: Array<Record<string, any>> | null,
    experience?: Array<Record<string, any>> | null
  ): ResolvedUserTaxonomy {
    const rawSkills = skills || [];
    const projs = projects || [];
    const exp = experience || [];

    const allEvidence: TaxonomyEvidenceItem[] = [];
    const seenEvidenceKeys = new Set<string>();

    const addEvidence = (nodeId: string, source: "skills" | "projects" | "experience", snippet: string, strength: number) => {
      let cleanSnippet = snippet.trim();
      if (cleanSnippet.length > 200) {
        cleanSnippet = cleanSnippet.slice(0, 197) + "...";
      }
      const key = `${nodeId}::${source}::${cleanSnippet.toLowerCase()}`;
      if (!seenEvidenceKeys.has(key)) {
        seenEvidenceKeys.add(key);
        allEvidence.push({
          nodeId,
          source,
          snippet: cleanSnippet,
          strength: Math.round(strength * 100) / 100,
        });
      }
    };

    // 1. Process explicit skills
    for (const rawS of rawSkills) {
      const nodeIds = this.resolver.resolveAll(rawS, "skills");
      if (nodeIds.length > 0) {
        for (const nid of nodeIds) {
          addEvidence(nid, "skills", rawS, SKILL_BASE_STRENGTH);
        }
      } else {
        const res = this.resolver.resolve(rawS, "skills");
        if (res.resolved && res.node_id) {
          addEvidence(res.node_id, "skills", rawS, SKILL_BASE_STRENGTH);
        }
      }
    }

    // 2. Process Projects
    for (const proj of projs) {
      const pName = proj.name || "Project";

      // Explicit project technologies
      const projTechs = Array.isArray(proj.technologies) ? proj.technologies : [];
      for (const t of projTechs) {
        if (typeof t === "string") {
          const nodeIds = this.resolver.resolveAll(t, `project:${pName}`);
          if (nodeIds.length > 0) {
            for (const nid of nodeIds) {
              addEvidence(nid, "projects", `${pName}: ${t}`, PROJECT_BASE_STRENGTH);
            }
          } else {
            const res = this.resolver.resolve(t, `project:${pName}`);
            if (res.resolved && res.node_id) {
              addEvidence(res.node_id, "projects", `${pName}: ${t}`, PROJECT_BASE_STRENGTH);
            }
          }
        }
      }

      // Natural language scanning in project description and bullet points
      const textBlocks: string[] = [];
      if (typeof proj.description === "string") {
        textBlocks.push(proj.description);
      }
      if (Array.isArray(proj.bullet_points)) {
        for (const bp of proj.bullet_points) {
          if (typeof bp === "string") {
            textBlocks.push(bp);
          }
        }
      }

      for (const block of textBlocks) {
        const sentences = splitIntoSentences(block);
        for (const sentence of sentences) {
          const normSentence = ` ${this.resolver.normalize(sentence)} `;
          for (const [phrase, nid] of this.resolver.phraseLookup) {
            if (normSentence.includes(` ${phrase} `)) {
              addEvidence(nid, "projects", `${pName}: ${sentence}`, PROJECT_BASE_STRENGTH);
            }
          }
        }
      }
    }

    // 3. Process Work Experience (and achievements)
    for (const item of exp) {
      const role = item.role || item.title || "Software Engineer";
      const company = item.company || item.organization || "Company";
      const contextLabel = `${role} @ ${company}`;

      // Explicit technologies
      const expTechs = Array.isArray(item.technologies) ? item.technologies : [];
      for (const t of expTechs) {
        if (typeof t === "string") {
          const nodeIds = this.resolver.resolveAll(t, contextLabel);
          if (nodeIds.length > 0) {
            for (const nid of nodeIds) {
              addEvidence(nid, "experience", `${contextLabel}: ${t}`, EXPERIENCE_BASE_STRENGTH);
            }
          } else {
            const res = this.resolver.resolve(t, contextLabel);
            if (res.resolved && res.node_id) {
              addEvidence(res.node_id, "experience", `${contextLabel}: ${t}`, EXPERIENCE_BASE_STRENGTH);
            }
          }
        }
      }

      // Natural language scanning in bullet points and description
      const textBlocks: string[] = [];
      if (typeof item.description === "string") {
        textBlocks.push(item.description);
      }
      if (Array.isArray(item.bullet_points)) {
        for (const bp of item.bullet_points) {
          if (typeof bp === "string") {
            textBlocks.push(bp);
          }
        }
      }

      for (const block of textBlocks) {
        const sentences = splitIntoSentences(block);
        for (const sentence of sentences) {
          const normSentence = ` ${this.resolver.normalize(sentence)} `;
          for (const [phrase, nid] of this.resolver.phraseLookup) {
            if (normSentence.includes(` ${phrase} `)) {
              addEvidence(nid, "experience", `${contextLabel}: ${sentence}`, EXPERIENCE_BASE_STRENGTH);
            }
          }
        }
      }
    }

    // 4. Group by node_id and aggregate evidence strength
    const nodeEvidenceMap: Record<string, TaxonomyEvidenceItem[]> = {};
    for (const ev of allEvidence) {
      if (!nodeEvidenceMap[ev.nodeId]) {
        nodeEvidenceMap[ev.nodeId] = [];
      }
      nodeEvidenceMap[ev.nodeId].push(ev);
    }

    const finalEvidenceList: TaxonomyEvidenceItem[] = [];
    for (const [nid, evList] of Object.entries(nodeEvidenceMap)) {
      const sources = new Set(evList.map((e) => e.source));
      const maxStrength = Math.max(...evList.map((e) => e.strength));
      // Aggregation boost for cross-source validation
      const boost = 0.10 * (sources.size - 1);
      const aggregatedStrength = Math.round(Math.min(1.0, maxStrength + boost) * 100) / 100;

      // Sort items by original strength descending
      evList.sort((a, b) => b.strength - a.strength);
      for (const ev of evList) {
        ev.strength = aggregatedStrength;
        finalEvidenceList.push(ev);
      }
    }

    const canonicalNodeIds = Object.keys(nodeEvidenceMap);

    return {
      user_id: userId,
      taxonomy_node_ids: canonicalNodeIds,
      raw_skills: rawSkills,
      evidence: finalEvidenceList,
    };
  }
}
