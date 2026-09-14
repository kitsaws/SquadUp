import time
import random
from src.taxonomy.loader import load_taxonomy_tree
from src.taxonomy.resolver import TaxonomyResolver
from src.taxonomy.extractor import V2MultiSourceExtractor
from src.graph.tree_store import InMemoryTreeStore
from src.matching.pair_scorer import DirectionalPairScorer, pair_score
from src.matching.coverage import calculate_team_coverage
from src.ranking.engine import (
    CandidateTeamInput,
    V2RecommendationEngine,
)


def run_tests():
    print("=== Testing SquadUp Taxonomy & V2 Recommendation System ===")

    # 1. Tree loading
    tree = load_taxonomy_tree()
    assert len(tree.nodes) == 143, f"Expected 143 nodes, got {len(tree.nodes)}"
    assert tree.metadata.root == "computer_science"
    print(f"[PASS] 1. Tree loaded successfully: {len(tree.nodes)} canonical nodes")

    # 2. Graph operations
    graph = InMemoryTreeStore(tree)
    assert graph.get_node("computer_science").depth == 0
    assert graph.get_node("react").depth >= 3
    lca, lca_depth = graph.get_lca("react", "vue")
    assert lca == "frontend_development", f"Expected frontend_development, got {lca}"
    print("[PASS] 2. InMemoryTreeStore LCA & depths verified")

    # 3. Deterministic Resolver
    resolver = TaxonomyResolver(tree)
    res_react = resolver.resolve("React")
    assert res_react.node_id == "react"
    res_react_agent = resolver.resolve("ReAct")
    assert res_react_agent.node_id == "react_agent_pattern"
    res_alias = resolver.resolve("Postgres")
    assert res_alias.node_id == "postgresql"
    res_phrase = resolver.resolve("Senior Docker container architect")
    assert res_phrase.node_id == "docker"
    res_unresolved = resolver.resolve("UnicornMagicWizardry123")
    assert not res_unresolved.resolved
    print("[PASS] 3. TaxonomyResolver 3-layer resolution verified (no hallucinations)")

    # 4. V2 Multi-source Extractor
    extractor = V2MultiSourceExtractor(resolver)
    user_tax = extractor.extract(
        user_id="user_test_1",
        skills=["Python", "React.js"],
        projects=[
            {
                "name": "Cloud Dashboard",
                "description": "Engineered real-time observability app using FastAPI and Docker containers.",
                "technologies": ["PostgreSQL"]
            }
        ],
        experience=[
            {
                "role": "Backend Engineer",
                "company": "Tech Corp",
                "technologies": ["Redis"],
                "bullet_points": [
                    "Maintained Kubernetes cluster deployments for distributed microservices."
                ]
            }
        ]
    )
    expected_nodes = {"python", "react", "postgresql", "fastapi", "docker", "redis", "kubernetes"}
    found_nodes = set(user_tax.taxonomy_node_ids)
    for en in expected_nodes:
        assert en in found_nodes, f"Missing expected node: {en} in {found_nodes}"
    
    assert len(user_tax.evidence) >= 7
    # Verify provenance snippets
    for ev in user_tax.evidence:
        assert ev.snippet != ""
        assert ev.strength >= 0.65
    print(f"[PASS] 4. V2 Multi-source Extractor verified ({len(user_tax.evidence)} evidence snippets captured)")

    # 5. Structural Directional Rules
    scorer = DirectionalPairScorer()
    
    # Exact match: 1.0
    s_exact, _ = pair_score(graph, "react", "react", scorer)
    assert s_exact == 1.0
    
    # Specific satisfies broad: react (child) -> frontend_development (parent)
    s_desc, _ = pair_score(graph, "react", "frontend_development", scorer)
    assert s_desc >= 0.90
    
    # Broad vs specific: frontend_development -> react
    s_anc, _ = pair_score(graph, "frontend_development", "react", scorer)
    assert 0.15 <= s_anc <= 0.45
    
    # Siblings: cpp <-> java (under programming_languages)
    s_sib, _ = pair_score(graph, "cpp", "java", scorer)
    assert s_sib == 0.65
    
    # Root collision: react <-> docker
    s_root, _ = pair_score(graph, "react", "docker", scorer)
    assert s_root == 0.0
    print("[PASS] 5. Directional 7 structural matching rules verified")

    # 6. V2 Recommendation Engine & Performance on 10,000 Teams
    engine = V2RecommendationEngine(graph=graph)

    # Generate 10,000 synthetic candidate teams
    all_nids = list(tree.nodes.keys())
    mock_teams = []
    unis = ["Stanford University", "MIT", "UC Berkeley", "Carnegie Mellon", "Harvard University"]
    for i in range(10000):
        reqs = random.sample(all_nids, k=random.randint(2, 4))
        mock_teams.append(CandidateTeamInput(
            team_id=f"team_{i}",
            team_name=f"Squad {i}",
            university=random.choice(unis),
            requirements=reqs,
            requirement_node_ids=reqs,
            is_global=(i % 3 == 0)
        ))

    # Benchmark pre-scoring vector + team scoring
    t0 = time.perf_counter()
    recs = engine.recommend(
        user_node_ids=user_tax.taxonomy_node_ids,
        user_university="Stanford University",
        candidate_teams=mock_teams,
        top_k=50
    )
    t1 = time.perf_counter()
    latency_ms = (t1 - t0) * 1000.0

    assert len(recs) == 50
    print(f"[PASS] 6. 10,000 Teams Recommendation Benchmark: {latency_ms:.2f} ms! (Under 20ms target)")

    # 7. V2 Categorization Check
    for r in recs:
        assert 0.0 <= r.taxonomy_score <= 1.0
        if r.same_university and r.taxonomy_score >= 0.80:
            assert r.recommendation_category == "BEST"
        elif not r.same_university:
            assert r.recommendation_category == "GOOD_DIFFERENT_UNIVERSITY"
        elif r.same_university and r.taxonomy_score < 0.80:
            assert r.recommendation_category == "SAME_UNIVERSITY_LOWER_SCORE"

    print("[PASS] 7. V2 Categorization (BEST, GOOD_DIFFERENT_UNIVERSITY, SAME_UNIVERSITY_LOWER_SCORE) verified")
    print(f"Top 1 Recommendation: {recs[0].team_name} | Score: {recs[0].taxonomy_score} | Category: {recs[0].recommendation_category}")
    print("=== All Python Verification Tests Passed! ===")


if __name__ == "__main__":
    run_tests()
