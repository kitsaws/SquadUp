import { TaxonomyTree, ResolutionResult } from "./taxonomy.types.js";

export class TaxonomyResolver {
  public tree: TaxonomyTree;
  public caseSensitiveLookup: Record<string, string> = {};
  public canonicalLookup: Record<string, string> = {};
  public aliasLookup: Record<string, string> = {};
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

  public resolve(rawInput: string, entityContext?: string): ResolutionResult {
    if (!rawInput || !rawInput.trim()) {
      return {
        raw_input: rawInput || "",
        resolved: false,
        confidence: 0.0,
        match_strategy: "unresolved",
      };
    }

    const stripped = rawInput.trim();

    // 0. Exact case-sensitive match
    if (this.caseSensitiveLookup[stripped]) {
      const nid = this.caseSensitiveLookup[stripped];
      return {
        raw_input: rawInput,
        resolved: true,
        node_id: nid,
        canonical_name: this.tree.nodes[nid]?.canonical_name || nid,
        confidence: 1.0,
        match_strategy: "exact_canonical",
      };
    }

    const norm = this.normalize(rawInput);

    // 1. Exact canonical match
    if (this.canonicalLookup[norm]) {
      const nid = this.canonicalLookup[norm];
      return {
        raw_input: rawInput,
        resolved: true,
        node_id: nid,
        canonical_name: this.tree.nodes[nid]?.canonical_name || nid,
        confidence: 1.0,
        match_strategy: "exact_canonical",
      };
    }

    // 2. Exact alias match
    if (this.aliasLookup[norm]) {
      const nid = this.aliasLookup[norm];
      return {
        raw_input: rawInput,
        resolved: true,
        node_id: nid,
        canonical_name: this.tree.nodes[nid]?.canonical_name || nid,
        confidence: 0.98,
        match_strategy: "exact_alias",
      };
    }

    // 3. Word boundary / Substring phrase match
    const wordsInInput = ` ${norm} `;
    for (const [phrase, nid] of this.phraseLookup) {
      if (wordsInInput.includes(` ${phrase} `)) {
        return {
          raw_input: rawInput,
          resolved: true,
          node_id: nid,
          canonical_name: this.tree.nodes[nid]?.canonical_name || nid,
          confidence: 0.90,
          match_strategy: "phrase_match",
        };
      }
    }

    // 4. Unresolved
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
      const res = this.resolve(term, entityContext);
      if (res.resolved && res.node_id) {
        if (!seenNodes.has(res.node_id)) {
          seenNodes.add(res.node_id);
          results.push(res);
        }
      } else {
        results.push(res);
      }
    }

    return results;
  }
}
