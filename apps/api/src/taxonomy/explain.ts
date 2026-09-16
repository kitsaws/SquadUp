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

  if (!bestUserSkillId) {
    return `Requirement '${rName}': Unmet (No matching skills. Score: 0.0)`;
  }

  const uNode = graph.getNode(bestUserSkillId);
  const uName = uNode?.canonical_name || bestUserSkillId;

  if (!features) {
    return `Requirement '${rName}': Matched by '${uName}' (Score: ${score})`;
  }

  if (features.exact_match) {
    return `Requirement '${rName}': Direct exact match with '${uName}' (Score: 1.0)`;
  }

  const lcaNode = features.lca ? graph.getNode(features.lca) : null;
  const lcaName = lcaNode?.canonical_name || features.lca || "General";

  if (features.user_is_descendant) {
    return (
      `Requirement '${rName}': Specific satisfies broad — ` +
      `Skill '${uName}' is a specialized component of '${rName}' ` +
      `(Score: ${score})`
    );
  }

  if (features.user_is_ancestor) {
    return (
      `Requirement '${rName}': Broad background — ` +
      `Skill '${uName}' is a broad parent category of specific requirement '${rName}' ` +
      `(Discounted Score: ${score})`
    );
  }

  if (features.same_parent) {
    return (
      `Requirement '${rName}': Sibling technology — ` +
      `Skill '${uName}' shares the same parent '${lcaName}' as '${rName}' ` +
      `(Score: ${score})`
    );
  }

  if (features.lca_depth >= 2) {
    return (
      `Requirement '${rName}': Related subdomain — ` +
      `Skill '${uName}' shares subdomain '${lcaName}' with '${rName}' ` +
      `(Score: ${score})`
    );
  }

  if (features.lca_depth === 1) {
    return (
      `Requirement '${rName}': Broad domain overlap — ` +
      `Skill '${uName}' connected only at root domain level '${lcaName}' ` +
      `(Score: ${score})`
    );
  }

  return `Requirement '${rName}': Weakly matched by '${uName}' (Score: ${score})`;
}
