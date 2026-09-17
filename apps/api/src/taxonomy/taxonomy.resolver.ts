import { TaxonomyTree, ResolutionResult } from "./taxonomy.types.js";

export class TaxonomyResolver {
  public tree: TaxonomyTree;
  public caseSensitiveLookup: Record<string, string> = {};
  public canonicalLookup: Record<string, string> = {};
  public aliasLookup: Record<string, string> = {};
  public aliasMultiLookup: Record<string, string[]> = {};
  public phraseLookup: Array<[string, string, number]> = []; // [normalized_phrase, node_id, length]
  public unresolvedLog: Array<{ raw_input: string; normalized: string; context: string }> = [];

  constructor(tree: TaxonomyTree) {
    this.tree = tree;
    this._buildIndexes();
  }

  public normalize(text: string): string {
    if (!text) return "";
    let s = text.toLowerCase().trim();
    s = s.replace(/[^\w\s\+#]/g, " ");
    s = s.replace(/\s+/g, " ").trim();
    return s;
  }

  private _addMultiAlias(term: string, nodeId: string): void {
    const norm = this.normalize(term);
    if (!norm) return;
    if (!this.aliasMultiLookup[norm]) {
      this.aliasMultiLookup[norm] = [];
    }
    if (!this.aliasMultiLookup[norm].includes(nodeId)) {
      this.aliasMultiLookup[norm].push(nodeId);
    }
  }

  private _buildIndexes(): void {
    // Special case: ReAct (Agentic AI) vs React (Frontend UI)
    this.caseSensitiveLookup["ReAct"] = "react_agent_pattern";
    this.caseSensitiveLookup["React"] = "react";

    for (const [nid, node] of Object.entries(this.tree.nodes)) {
      this.caseSensitiveLookup[node.canonical_name.trim()] = nid;

      const normName = this.normalize(node.canonical_name);
      if (normName === "react") {
        if (nid === "react") {
          this.canonicalLookup[normName] = nid;
        }
      } else {
        this.canonicalLookup[normName] = nid;
      }
      this.canonicalLookup[nid] = nid;
      this.canonicalLookup[node.id.toLowerCase()] = nid;

      this._addMultiAlias(node.canonical_name, nid);
      this._addMultiAlias(nid, nid);

      for (const alias of node.aliases || []) {
        const normAlias = this.normalize(alias);
        if (normAlias) {
          if (normAlias === "react") {
            if (nid === "react") {
              this.aliasLookup[normAlias] = nid;
            }
          } else {
            this.aliasLookup[normAlias] = nid;
          }
          this._addMultiAlias(alias, nid);
        }
      }
    }

    const allPhrases: Array<[string, string, number]> = [];
    for (const [phrase, nid] of Object.entries(this.canonicalLookup)) {
      allPhrases.push([phrase, nid, phrase.length]);
    }
    for (const [phrase, nid] of Object.entries(this.aliasLookup)) {
      allPhrases.push([phrase, nid, phrase.length]);
    }

    const seen = new Set<string>();
    // Sort by length descending
    allPhrases.sort((a, b) => b[2] - a[2]);

    for (const [phrase, nid, length] of allPhrases) {
      if (!seen.has(phrase)) {
        seen.add(phrase);
        this.phraseLookup.push([phrase, nid, length]);
      }
    }
  }

  /**
   * Resolves a raw input string to one or more canonical node IDs.
   * Disambiguates based on role/entity context when provided.
   */
  public resolveAll(rawInput: string, entityContext?: string): string[] {
    if (!rawInput || !rawInput.trim()) return [];

    const stripped = rawInput.trim();
    const norm = this.normalize(rawInput);
    const ctx = (entityContext || "").toLowerCase();

    // 1. Direct Multi-Alias match
    let candidateNodeIds: string[] = [];
    if (this.aliasMultiLookup[norm] && this.aliasMultiLookup[norm].length > 0) {
      candidateNodeIds = [...this.aliasMultiLookup[norm]];
    } else if (this.canonicalLookup[norm]) {
      candidateNodeIds = [this.canonicalLookup[norm]];
    } else if (this.caseSensitiveLookup[stripped]) {
      candidateNodeIds = [this.caseSensitiveLookup[stripped]];
    } else {
      // Word boundary match
      const wordsInInput = ` ${norm} `;
      for (const [phrase, nid] of this.phraseLookup) {
        if (wordsInInput.includes(` ${phrase} `)) {
          candidateNodeIds.push(nid);
          break;
        }
      }
    }

    if (candidateNodeIds.length === 0) {
      return [];
    }

    // If no context or only 1 node, return all candidates
    if (!ctx || candidateNodeIds.length === 1) {
      return candidateNodeIds;
    }

    // Role-contextual filtering
    if (ctx.includes("front") || ctx.includes("ui") || ctx.includes("web") || ctx.includes("client")) {
      const frontendMatches = candidateNodeIds.filter((nid) => nid.startsWith("frontend_") || nid === "react" || nid === "vue" || nid === "angular" || nid === "nextjs" || nid === "tailwindcss" || nid === "html" || nid === "css");
      if (frontendMatches.length > 0) return frontendMatches;
    }

    if (ctx.includes("back") || ctx.includes("server") || ctx.includes("api") || ctx.includes("database")) {
      const backendMatches = candidateNodeIds.filter((nid) => nid.startsWith("backend_") || nid === "nodejs" || nid === "fastapi" || nid === "express" || nid === "django" || nid === "postgresql");
      if (backendMatches.length > 0) return backendMatches;
    }

    if (ctx.includes("ai") || ctx.includes("ml") || ctx.includes("machine learning") || ctx.includes("data science") || ctx.includes("deep learning") || ctx.includes("nlp") || ctx.includes("vision")) {
      const aiMatches = candidateNodeIds.filter((nid) => nid.startsWith("ai_") || nid.startsWith("data_") || nid === "pytorch" || nid === "tensorflow" || nid === "scikit_learn");
      if (aiMatches.length > 0) return aiMatches;
    }

    if (ctx.includes("system") || ctx.includes("embedded") || ctx.includes("low level") || ctx.includes("os") || ctx.includes("kernel")) {
      const sysMatches = candidateNodeIds.filter((nid) => nid === "cpp" || nid === "c" || nid === "rust" || nid === "embedded_systems" || nid === "operating_systems");
      if (sysMatches.length > 0) return sysMatches;
    }

    return candidateNodeIds;
  }

  public resolve(rawInput: string, entityContext?: string): ResolutionResult {
    if (!rawInput || !rawInput.trim()) {
      return {
        raw_input: rawInput || "",
        resolved: false,
        confidence: 0.0,
        match_strategy: "unresolved",
      };
    }

    const resolvedIds = this.resolveAll(rawInput, entityContext);
    if (resolvedIds.length > 0) {
      const primaryId = resolvedIds[0];
      return {
        raw_input: rawInput,
        resolved: true,
        node_id: primaryId,
        canonical_name: this.tree.nodes[primaryId]?.canonical_name || primaryId,
        confidence: 1.0,
        match_strategy: "contextual_match",
      };
    }

    const norm = this.normalize(rawInput);
    this.unresolvedLog.push({
      raw_input: rawInput,
      normalized: norm,
      context: entityContext || "unknown",
    });

    return {
      raw_input: rawInput,
      resolved: false,
      confidence: 0.0,
      match_strategy: "unresolved",
    };
  }

  public resolveList(rawTerms: string[], entityContext?: string): ResolutionResult[] {
    const results: ResolutionResult[] = [];
    const seenNodes = new Set<string>();

    for (const term of rawTerms) {
      const nodeIds = this.resolveAll(term, entityContext);
      if (nodeIds.length > 0) {
        for (const nid of nodeIds) {
          if (!seenNodes.has(nid)) {
            seenNodes.add(nid);
            results.push({
              raw_input: term,
              resolved: true,
              node_id: nid,
              canonical_name: this.tree.nodes[nid]?.canonical_name || nid,
              confidence: 1.0,
              match_strategy: "contextual_multi_match",
            });
          }
        }
      } else {
        results.push({
          raw_input: term,
          resolved: false,
          confidence: 0.0,
          match_strategy: "unresolved",
        });
      }
    }

    return results;
  }
}
