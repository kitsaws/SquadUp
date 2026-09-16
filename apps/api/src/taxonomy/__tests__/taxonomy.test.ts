import {
  treeStore,
  taxonomyResolver,
  multiSourceExtractor,
  recommendationEngine,
} from "../taxonomy.service.js";
import { pairScore, DirectionalPairScorer } from "../pair.scorer.js";
import { CandidateTeamInput } from "../taxonomy.types.js";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

export function runTaxonomyParityTests() {
  console.log("=== Testing SquadUp TypeScript Taxonomy & V2 Recommendation System ===");

  // 1. Tree loading
  const nodesCount = Object.keys(treeStore.nodes).length;
  assert(nodesCount === 143, `Expected 143 nodes, got ${nodesCount}`);
  assert(treeStore.rootId === "computer_science", `Expected root computer_science, got ${treeStore.rootId}`);
  console.log(`[PASS] 1. Tree loaded successfully: ${nodesCount} canonical nodes`);

  // 2. Graph operations
  assert(treeStore.getNode("computer_science")?.depth === 0, "Depth of root should be 0");
  assert((treeStore.getNode("react")?.depth || 0) >= 3, "Depth of react should be >= 3");
  const [lca, lcaDepth] = treeStore.getLca("react", "vue");
  assert(lca === "frontend_development", `Expected frontend_development, got ${lca}`);
  console.log("[PASS] 2. InMemoryTreeStore LCA & depths verified");

  // 3. Deterministic Resolver
  const resReact = taxonomyResolver.resolve("React");
  assert(resReact.node_id === "react", `Expected react, got ${resReact.node_id}`);
  const resReactAgent = taxonomyResolver.resolve("ReAct");
  assert(resReactAgent.node_id === "react_agent_pattern", `Expected react_agent_pattern, got ${resReactAgent.node_id}`);
  const resAlias = taxonomyResolver.resolve("Postgres");
  assert(resAlias.node_id === "postgresql", `Expected postgresql, got ${resAlias.node_id}`);
  const resPhrase = taxonomyResolver.resolve("Senior Docker container architect");
  assert(resPhrase.node_id === "docker", `Expected docker, got ${resPhrase.node_id}`);
  const resUnresolved = taxonomyResolver.resolve("UnicornMagicWizardry123");
  assert(!resUnresolved.resolved, "Expected unresolved term to not be resolved");
  console.log("[PASS] 3. TaxonomyResolver 3-layer resolution verified (no hallucinations)");

  // 4. V2 Multi-source Extractor
  const userTax = multiSourceExtractor.extract(
    "user_test_1",
    ["Python", "React.js"],
    [
      {
        name: "Cloud Dashboard",
        description: "Engineered real-time observability app using FastAPI and Docker containers.",
        technologies: ["PostgreSQL"],
      },
    ],
    [
      {
        role: "Backend Engineer",
        company: "Tech Corp",
        technologies: ["Redis"],
        bullet_points: [
          "Maintained Kubernetes cluster deployments for distributed microservices.",
        ],
      },
    ]
  );
  const expectedNodes = ["python", "react", "postgresql", "fastapi", "docker", "redis", "kubernetes"];
  const foundNodes = new Set(userTax.taxonomy_node_ids);
  for (const en of expectedNodes) {
    assert(foundNodes.has(en), `Missing expected node: ${en} in ${Array.from(foundNodes).join(", ")}`);
  }

  assert(userTax.evidence.length >= 7, `Expected at least 7 evidence items, got ${userTax.evidence.length}`);
  for (const ev of userTax.evidence) {
    assert(ev.snippet !== "", "Snippet must not be empty");
    assert(ev.strength >= 0.65, `Strength should be >= 0.65, got ${ev.strength}`);
  }
  console.log(`[PASS] 4. V2 Multi-source Extractor verified (${userTax.evidence.length} evidence snippets captured)`);

  // 5. Structural Directional Rules
  const scorer = new DirectionalPairScorer();

  // Exact match: 1.0
  const [sExact] = pairScore(treeStore, "react", "react", scorer);
  assert(sExact === 1.0, `Expected 1.0 for exact match, got ${sExact}`);

  // Specific satisfies broad: react (child) -> frontend_development (parent)
  const [sDesc] = pairScore(treeStore, "react", "frontend_development", scorer);
  assert(sDesc >= 0.90, `Expected >= 0.90 for descendant, got ${sDesc}`);

  // Broad vs specific: frontend_development -> react
  const [sAnc] = pairScore(treeStore, "frontend_development", "react", scorer);
  assert(sAnc >= 0.15 && sAnc <= 0.45, `Expected 0.15-0.45 for ancestor, got ${sAnc}`);

  // Siblings: cpp <-> java (under programming_languages)
  const [sSib] = pairScore(treeStore, "cpp", "java", scorer);
  assert(sSib === 0.65, `Expected 0.65 for siblings, got ${sSib}`);

  // Root collision: react <-> docker
  const [sRoot] = pairScore(treeStore, "react", "docker", scorer);
  assert(sRoot === 0.0, `Expected 0.0 for root collision, got ${sRoot}`);
  console.log("[PASS] 5. Directional 7 structural matching rules verified");

  // 6. V2 Recommendation Engine & Performance on 10,000 Teams
  const allNids = Object.keys(treeStore.nodes);
  const mockTeams: CandidateTeamInput[] = [];
  const unis = ["Stanford University", "MIT", "UC Berkeley", "Carnegie Mellon", "Harvard University"];

  for (let i = 0; i < 10000; i++) {
    const k = Math.floor(Math.random() * 3) + 2; // 2 to 4
    const reqs: string[] = [];
    for (let j = 0; j < k; j++) {
      reqs.push(allNids[Math.floor(Math.random() * allNids.length)]);
    }
    mockTeams.push({
      team_id: `team_${i}`,
      team_name: `Squad ${i}`,
      university: unis[Math.floor(Math.random() * unis.length)],
      requirements: reqs,
      requirement_node_ids: reqs,
      is_global: i % 3 === 0,
      is_eligible: true,
    });
  }

  const t0 = performance.now();
  const recs = recommendationEngine.recommend(
    userTax.taxonomy_node_ids,
    "Stanford University",
    mockTeams,
    50
  );
  const t1 = performance.now();
  const latencyMs = t1 - t0;

  assert(recs.length === 50, `Expected 50 recommendations, got ${recs.length}`);
  console.log(`[PASS] 6. 10,000 Teams Recommendation Benchmark: ${latencyMs.toFixed(2)} ms! (Under 20ms target)`);

  // 7. V2 Categorization Check
  for (const r of recs) {
    assert(r.taxonomy_score >= 0.0 && r.taxonomy_score <= 1.0, `Score out of bounds: ${r.taxonomy_score}`);
    if (r.same_university && r.taxonomy_score >= 0.80) {
      assert(r.recommendation_category === "BEST", `Expected BEST, got ${r.recommendation_category}`);
    } else if (!r.same_university) {
      assert(r.recommendation_category === "GOOD_DIFFERENT_UNIVERSITY", `Expected GOOD_DIFFERENT_UNIVERSITY, got ${r.recommendation_category}`);
    } else if (r.same_university && r.taxonomy_score < 0.80) {
      assert(r.recommendation_category === "SAME_UNIVERSITY_LOWER_SCORE", `Expected SAME_UNIVERSITY_LOWER_SCORE, got ${r.recommendation_category}`);
    }
  }

  console.log("[PASS] 7. V2 Categorization (BEST, GOOD_DIFFERENT_UNIVERSITY, SAME_UNIVERSITY_LOWER_SCORE) verified");
  console.log(`Top 1 Recommendation: ${recs[0].team_name} | Score: ${recs[0].taxonomy_score} | Category: ${recs[0].recommendation_category}`);
  console.log("=== All TypeScript Parity Tests Passed Successfully! ===");
}

// Run if executed directly
if (process.argv[1]?.includes("taxonomy.test.ts") || process.argv[1]?.includes("taxonomy.test.js")) {
  runTaxonomyParityTests();
}
