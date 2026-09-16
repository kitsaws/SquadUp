import { StructuralFeatures } from "./taxonomy.types.js";
import { InMemoryTreeStore } from "./tree.store.js";

export function extractStructuralFeatures(
  graph: InMemoryTreeStore,
  userNodeId: string,
  reqNodeId: string
): StructuralFeatures {
  const uNode = graph.getNode(userNodeId);
  const rNode = graph.getNode(reqNodeId);

  if (!uNode || !rNode) {
    return {
      user_skill: userNodeId,
      team_requirement: reqNodeId,
      exact_match: false,
      user_is_ancestor: false,
      user_is_descendant: false,
      graph_distance: 999,
      lca: null,
      lca_depth: -1,
      user_depth: -1,
      requirement_depth: -1,
      same_parent: false,
      same_branch: false,
    };
  }

  const exactMatch = userNodeId === reqNodeId;
  const uParent = graph.getParent(userNodeId);
  const rParent = graph.getParent(reqNodeId);
  const sameParent = uParent !== null && uParent === rParent && !exactMatch;

  const [lcaId, lcaDepth] = graph.getLca(userNodeId, reqNodeId);
  const distance = graph.getDistance(userNodeId, reqNodeId);

  const userIsAnc = graph.isAncestor(userNodeId, reqNodeId);
  const userIsDesc = graph.isDescendant(userNodeId, reqNodeId);
  const sameBranch = lcaDepth >= 1;

  return {
    user_skill: userNodeId,
    team_requirement: reqNodeId,
    exact_match: exactMatch,
    user_is_ancestor: userIsAnc,
    user_is_descendant: userIsDesc,
    graph_distance: distance,
    lca: lcaId,
    lca_depth: lcaDepth,
    user_depth: uNode.depth,
    requirement_depth: rNode.depth,
    same_parent: sameParent,
    same_branch: sameBranch,
  };
}

export class DirectionalPairScorer {
  public exactMatchScore: number;
  public descendantBase: number;
  public descendantDecay: number;
  public ancestorBase: number;
  public ancestorDecay: number;
  public siblingBase: number;

  constructor(
    exactMatchScore = 1.0,
    descendantBase = 0.95,
    descendantDecay = 0.05,
    ancestorBase = 0.45,
    ancestorDecay = 0.08,
    siblingBase = 0.65
  ) {
    this.exactMatchScore = exactMatchScore;
    this.descendantBase = descendantBase;
    this.descendantDecay = descendantDecay;
    this.ancestorBase = ancestorBase;
    this.ancestorDecay = ancestorDecay;
    this.siblingBase = siblingBase;
  }

  public score(features: StructuralFeatures): number {
    // Case 1: Exact match
    if (features.exact_match) {
      return this.exactMatchScore;
    }

    // Case 7: Unrelated (LCA is root / depth <= 0 or not found)
    if (features.lca_depth <= 0 || features.graph_distance >= 999) {
      return 0.0;
    }

    const d = features.graph_distance;

    // Case 2: User skill is descendant of team requirement (Specific satisfies Broad)
    if (features.user_is_descendant) {
      const raw = this.descendantBase - this.descendantDecay * (d - 1);
      return Number(Math.max(0.65, Math.min(0.95, raw)).toFixed(4));
    }

    // Case 3: User skill is ancestor of team requirement (Broad vs Specific)
    if (features.user_is_ancestor) {
      const raw = this.ancestorBase - this.ancestorDecay * (d - 1);
      return Number(Math.max(0.15, Math.min(0.45, raw)).toFixed(4));
    }

    // Case 4: Siblings (Same immediate parent)
    if (features.same_parent) {
      return Number(this.siblingBase.toFixed(4));
    }

    // Case 5: Related branches within a specific subdomain (LCA depth >= 2)
    if (features.lca_depth >= 2) {
      const raw = 0.35 + 0.05 * features.lca_depth - 0.03 * (d - 2);
      return Number(Math.max(0.25, Math.min(0.50, raw)).toFixed(4));
    }

    // Case 6: Broad common domain ancestor only (LCA depth == 1)
    if (features.lca_depth === 1) {
      const raw = 0.20 - 0.02 * Math.max(0, d - 4);
      return Number(Math.max(0.10, Math.min(0.25, raw)).toFixed(4));
    }

    return 0.0;
  }
}

export function pairScore(
  graph: InMemoryTreeStore,
  userNodeId: string,
  reqNodeId: string,
  scorer?: DirectionalPairScorer
): [number, StructuralFeatures] {
  const s = scorer || new DirectionalPairScorer();
  const features = extractStructuralFeatures(graph, userNodeId, reqNodeId);
  const scoreVal = s.score(features);
  return [scoreVal, features];
}
