import { TaxonomyTree, TaxonomyNode } from "./taxonomy.types.js";

export class InMemoryTreeStore {
  public tree: TaxonomyTree;
  public nodes: Record<string, TaxonomyNode>;
  public rootId: string;
  public childMap: Record<string, string[]> = {};
  public ancestorCache: Record<string, string[]> = {};
  public descendantCache: Record<string, Set<string>> = {};

  constructor(tree: TaxonomyTree) {
    this.tree = tree;
    this.nodes = tree.nodes;
    this.rootId = tree.metadata.root;
    this._initialize();
  }

  private _initialize(): void {
    for (const nid of Object.keys(this.nodes)) {
      this.childMap[nid] = [];
    }

    // 1. Build children map
    for (const [nid, node] of Object.entries(this.nodes)) {
      if (node.parent_id && this.childMap[node.parent_id]) {
        this.childMap[node.parent_id].push(nid);
      }
    }

    // 2. Precompute ancestor chains for each node: [parent, grandparent, ..., root]
    for (const nid of Object.keys(this.nodes)) {
      const chain: string[] = [];
      let curr: string | null | undefined = this.nodes[nid].parent_id;
      while (curr !== null && curr !== undefined) {
        chain.push(curr);
        curr = this.nodes[curr] ? this.nodes[curr].parent_id : null;
      }
      this.ancestorCache[nid] = chain;
    }
  }

  public getNode(nodeId: string): TaxonomyNode | undefined {
    return this.nodes[nodeId];
  }

  public getParent(nodeId: string): string | null {
    const node = this.nodes[nodeId];
    return node ? node.parent_id : null;
  }

  public getAncestors(nodeId: string): string[] {
    return this.ancestorCache[nodeId] || [];
  }

  public getDescendants(nodeId: string): string[] {
    if (this.descendantCache[nodeId]) {
      return Array.from(this.descendantCache[nodeId]);
    }

    const descendants = new Set<string>();
    const queue = [...(this.childMap[nodeId] || [])];
    while (queue.length > 0) {
      const child = queue.shift()!;
      descendants.add(child);
      if (this.childMap[child]) {
        queue.push(...this.childMap[child]);
      }
    }

    this.descendantCache[nodeId] = descendants;
    return Array.from(descendants);
  }

  public getLca(nodeA: string, nodeB: string): [string | null, number] {
    if (!this.nodes[nodeA] || !this.nodes[nodeB]) {
      return [null, -1];
    }

    if (nodeA === nodeB) {
      return [nodeA, this.nodes[nodeA].depth];
    }

    const pathA = [nodeA, ...(this.ancestorCache[nodeA] || [])];
    const setA = new Set(pathA);

    const pathB = [nodeB, ...(this.ancestorCache[nodeB] || [])];
    for (const node of pathB) {
      if (setA.has(node)) {
        return [node, this.nodes[node].depth];
      }
    }

    return [null, -1];
  }

  public getDistance(nodeA: string, nodeB: string): number {
    if (!this.nodes[nodeA] || !this.nodes[nodeB]) {
      return 999;
    }

    if (nodeA === nodeB) {
      return 0;
    }

    const [lca, lcaDepth] = this.getLca(nodeA, nodeB);
    if (!lca) {
      return 999;
    }

    const depthA = this.nodes[nodeA].depth;
    const depthB = this.nodes[nodeB].depth;
    return (depthA - lcaDepth) + (depthB - lcaDepth);
  }

  public isAncestor(potentialAncestor: string, target: string): boolean {
    if (potentialAncestor === target) {
      return false;
    }
    const ancestors = this.ancestorCache[target] || [];
    return ancestors.includes(potentialAncestor);
  }

  public isDescendant(potentialDescendant: string, target: string): boolean {
    if (potentialDescendant === target) {
      return false;
    }
    const ancestors = this.ancestorCache[potentialDescendant] || [];
    return ancestors.includes(target);
  }

  public getPathToLca(nodeA: string, nodeB: string): [string[], string, string[]] {
    const [lca] = this.getLca(nodeA, nodeB);
    if (!lca) {
      return [[nodeA], "none", [nodeB]];
    }

    const pathA: string[] = [];
    let currA: string | null | undefined = nodeA;
    while (currA !== lca && currA !== null && currA !== undefined) {
      pathA.push(currA);
      currA = this.nodes[currA] ? this.nodes[currA].parent_id : null;
    }

    const pathB: string[] = [];
    let currB: string | null | undefined = nodeB;
    while (currB !== lca && currB !== null && currB !== undefined) {
      pathB.push(currB);
      currB = this.nodes[currB] ? this.nodes[currB].parent_id : null;
    }

    return [pathA, lca, pathB];
  }
}
