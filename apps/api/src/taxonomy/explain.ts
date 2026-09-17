import { InMemoryTreeStore } from "./tree.store.js";
import { StructuralFeatures } from "./taxonomy.types.js";

export function formatExplanation(
  graph: InMemoryTreeStore,
  requirementNodeId: string,
  bestUserSkillId: string | null,
  score: number,
  features?: StructuralFeatures | null
): string {
  const rNode = graph.getNode(requirementNodeId);
  const rName = rNode?.canonical_name || requirementNodeId;
  const rDepth = rNode ? rNode.depth : (features?.requirement_depth ?? 0);

  if (!bestUserSkillId || score === 0 || !features || features.graph_distance >= 999) {
    return `Requirement '${rName}' (Depth: ${rDepth}): Unmet — No matching competencies found in candidate profile → Score: 0.00 (0%)`;
  }

  const uNode = graph.getNode(bestUserSkillId);
  const uName = uNode?.canonical_name || bestUserSkillId;
  const uDepth = uNode ? uNode.depth : (features.user_depth ?? 0);

  const lcaNode = features.lca ? graph.getNode(features.lca) : null;
  const lcaName = lcaNode?.canonical_name || features.lca || "Root";
  const lcaDepth = lcaNode ? lcaNode.depth : (features.lca_depth ?? 0);
  const distance = features.graph_distance;
  const scoreFormatted = `Score: ${score.toFixed(2)} (${Math.round(score * 100)}%)`;

  if (features.exact_match) {
    return `Requirement '${rName}' (Depth: ${rDepth}): Direct 1:1 exact match with verified skill '${uName}' (Depth: ${uDepth}) → Score: 1.00 (100%)`;
  }

  if (features.user_is_descendant) {
    return (
      `Requirement '${rName}' (Depth: ${rDepth}): Specific satisfies broad — ` +
      `Candidate skill '${uName}' (Depth: ${uDepth}) is a specialized component of '${rName}'. ` +
      `Intersection: '${lcaName}' (Depth: ${lcaDepth}, Graph Distance: ${distance}) → ${scoreFormatted}`
    );
  }

  if (features.user_is_ancestor) {
    return (
      `Requirement '${rName}' (Depth: ${rDepth}): Broad domain background — ` +
      `Candidate skill '${uName}' (Depth: ${uDepth}) is a broad parent category of specific requirement '${rName}'. ` +
      `Intersection: '${lcaName}' (Depth: ${lcaDepth}, Graph Distance: ${distance}) → ${scoreFormatted}`
    );
  }

  if (features.same_parent) {
    return (
      `Requirement '${rName}' (Depth: ${rDepth}): Sibling technology match — ` +
      `Candidate skill '${uName}' (Depth: ${uDepth}) shares direct parent '${lcaName}' (Depth: ${lcaDepth}, Graph Distance: ${distance}) with '${rName}' → ${scoreFormatted}`
    );
  }

  if (features.lca_depth >= 2) {
    return (
      `Requirement '${rName}' (Depth: ${rDepth}): Related subdomain match — ` +
      `Candidate skill '${uName}' (Depth: ${uDepth}) and requirement connect through subdomain '${lcaName}' (Depth: ${lcaDepth}, Graph Distance: ${distance}) → ${scoreFormatted}`
    );
  }

  if (features.lca_depth === 1) {
    return (
      `Requirement '${rName}' (Depth: ${rDepth}): Domain-level overlap — ` +
      `Candidate skill '${uName}' (Depth: ${uDepth}) and requirement meet at top-level domain '${lcaName}' (Depth: ${lcaDepth}, Graph Distance: ${distance}) → ${scoreFormatted}`
    );
  }

  return `Requirement '${rName}' (Depth: ${rDepth}): Weak taxonomy match with '${uName}' (Depth: ${uDepth}, Graph Distance: ${distance}) → ${scoreFormatted}`;
}
