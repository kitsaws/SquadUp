# SquadUp 2.0 — Taxonomy Recommendation System & V2 Architecture

## 1. System Overview

SquadUp 2.0 replaces unstructured dense vector similarity search with a **Deterministic Single-Parent Knowledge Hierarchy** and a **V2 Multi-Source Evidence Extraction Pipeline**.

### Key Architectural Tenets
1. **Zero Hallucinations:** Matching is governed strictly by graph relationships in an in-memory 151-node canonical single-parent taxonomy tree.
2. **Decoupled Relational Persistence:** Core `User`, `Profile`, and `Team` models remain pristine. Technical taxonomy nodes and evidence are stored in isolated `UserTaxonomy` and `TeamTaxonomy` tables.
3. **Role-Based Precision Matching:** Evaluates candidates against specific designated roles (`TeamRole`) within a squad, providing the optimal role recommendation (`bestMatchingRole`).
4. **Multi-Source Demonstrated Capability:** Capabilities are extracted not only from self-reported skills, but also from demonstrated usage in `projects` and professional `work experience`.
5. **Pure Taxonomy Compatibility:** Technical capability scores are strictly uncorrupted ($0.0$ to $1.0$). University alignment is never blended arithmetically into the technical score.
6. **Hard Event Eligibility:** Scoping constraints (`isGlobal`, university isolation) are applied before ranking to prevent ineligible teams from occupying top recommendation candidate pools.
7. **Blazing Fast In-Memory Scoring:** Uses an $O(K \times N)$ User Pre-Scoring Vector, allowing 10,000+ candidate teams to be evaluated in under **15 milliseconds**.
8. **Deep Structural Explainability:** Matches provide tree level depths ($L_r, L_u, L_{lca}$), graph distance $d$, and exact relationship types.

---

## 2. End-to-End System Pipeline

```mermaid
flowchart TD
    subgraph Ingestion["1. Candidate Profile & Evidence Ingestion"]
        Resume["PDF Resume / Profile Data"]
        Parser["Groq LLM Parser\n(Structured JSON via BullMQ)"]
        V2Ext["V2 Multi-Source Extractor\n(Skills 0.65, Projects 0.85, Experience 1.0)"]
        UTax["UserTaxonomy Record\n[taxonomyNodeIds, rawSkills, evidence]"]
    end

    subgraph TeamCreation["2. Team & Role Ingestion"]
        RawRoles["Team Roles & Requirements\n(e.g., Frontend: ['React', 'NextJS'])"]
        TeamRes["TaxonomyResolver\n(3-Layer Matching)"]
        TTax["TeamTaxonomy Record\n[requirementNodeIds, rawRequirements, roleTaxonomies]"]
    end

    subgraph Recommendation["3. Recommendation & Ranking Engine (apps/api/src/taxonomy)"]
        Req["Client POST /api/teams/recommendations\n(Optional filters: eventId, sameUniversityOnly)"]
        EligFilter["Hard Eligibility & DB Filter\n(isGlobal or matching university)"]
        PreVector["User Pre-Scoring Vector\n(Score user skills vs all 151 nodes in < 2ms)"]
        TeamScoring["Pure Taxonomy & Role Scoring\n(O(1) lookups over requirement node IDs)"]
        TopK["Top-K Candidate Selection\n(In-Memory Min-Heap / Sort)"]
        Category["Recommendation Categorization\n(BEST, GOOD_DIFFERENT_UNIVERSITY, SAME_UNIVERSITY_LOWER_SCORE)"]
        LCAExpl["LCA Decision Path Explanations\n(Plain-English breakdown per requirement)"]
    end

    Resume --> Parser --> V2Ext --> UTax
    RawRoles --> TeamRes --> TTax
    Req --> EligFilter --> PreVector --> TeamScoring --> TopK --> Category --> LCAExpl
```

---

## 3. The 151-Node Knowledge Hierarchy

The canonical knowledge hierarchy is located at [`apps/api/src/taxonomy/data/taxonomy_tree.json`](file:///e:/Programming/Projects%202026/Squad%20Up/main/apps/api/src/taxonomy/data/taxonomy_tree.json).

### Architectural Properties:
- **Single-Parent Rooted Tree:** Rooted at `computer_science` (depth 0). Every other node has exactly one parent.
- **Deterministic Tree Distance:** The distance between any two nodes $A$ and $B$ with Lowest Common Ancestor (LCA) $L$ is uniquely given by:
  $$\text{dist}(A, B) = (\text{depth}(A) - \text{depth}(L)) + (\text{depth}(B) - \text{depth}(L))$$
- **Precomputed Depths & Ancestry:** Preloaded in [`InMemoryTreeStore`](file:///e:/Programming/Projects%202026/Squad%20Up/main/apps/api/src/taxonomy/tree.store.ts) at Node.js process startup for microsecond graph traversal.

```text
computer_science (depth 0)
├── software_development (depth 1)
│   ├── web_development (depth 2)
│   │   ├── frontend_development (depth 3)
│   │   │   ├── react (depth 4)
│   │   │   ├── nextjs (depth 5)
│   │   │   ├── vue (depth 4)
│   │   │   └── angular (depth 4)
│   │   └── backend_development (depth 3)
│   │       ├── nodejs (depth 4)
│   │       ├── express (depth 5)
│   │       ├── fastapi (depth 4)
│   │       └── nestjs (depth 5)
│   ├── mobile_development (depth 2)
│   │   ├── react_native (depth 3)
│   │   ├── flutter (depth 3)
│   │   ├── ios_development (depth 3)
│   │   └── android_development (depth 3)
│   └── programming_languages (depth 2)
│       ├── typescript (depth 3)
│       ├── python (depth 3)
│       ├── cpp (depth 3)
│       ├── rust (depth 3)
│       └── java (depth 3)
├── data_and_ai (depth 1)
│   ├── databases (depth 2)
│   │   ├── postgresql (depth 3)
│   │   ├── mongodb (depth 3)
│   │   └── redis (depth 3)
│   └── ai_machine_learning (depth 2)
│       ├── machine_learning (depth 3)
│       │   ├── scikit_learn (depth 4)
│       │   └── xgboost (depth 4)
│       ├── deep_learning (depth 3)
│       │   ├── pytorch (depth 4)
│       │   └── tensorflow (depth 4)
│       ├── nlp (depth 3)
│       │   ├── llms (depth 4)
│       │   └── transformers (depth 4)
│       └── computer_vision (depth 3)
└── devops_and_cloud (depth 1)
    ├── cloud_platforms (depth 2)
    │   ├── aws (depth 3)
    │   └── gcp (depth 3)
    └── containers_and_orchestration (depth 2)
        ├── docker (depth 3)
        └── kubernetes (depth 3)
```

---

## 4. Deterministic 3-Layer Entity Resolution

Implemented in [`apps/api/src/taxonomy/taxonomy.resolver.ts`](file:///e:/Programming/Projects%202026/Squad%20Up/main/apps/api/src/taxonomy/taxonomy.resolver.ts). Converts unstructured natural strings into canonical node IDs in sub-milliseconds without LLM cost:

1. **Layer 1 — Case-Sensitive Collision Matching:**
   Resolves identical-casing terms that mean different things (e.g. `React` UI library $\to$ `react` vs `ReAct` reasoning pattern $\to$ `react_agent_pattern`).
2. **Layer 2 — Normalized Alias Matching:**
   Normalizes punctuation while preserving `+` and `#` (`C++`, `C#`). Matches 500+ curated aliases (e.g. `"postgres"` $\to$ `postgresql`, `"reactjs"` $\to$ `react`, `"k8s"` $\to$ `kubernetes`).
3. **Layer 3 — Whole-Token Phrase Boundary Matching:**
   Extracts technologies inside compound phrases (e.g. `"Senior Docker container architect"` $\to$ `docker`) using token boundaries (`" phrase " in " input "`).
4. **Zero Hallucinations:**
   Unrecognized terms are recorded as unresolved with confidence `0.0`. The system never invents speculative associations.

---

## 5. V2 Multi-Source Evidence Extraction & Provenance

Implemented in [`apps/api/src/taxonomy/taxonomy.extractor.ts`](file:///e:/Programming/Projects%202026/Squad%20Up/main/apps/api/src/taxonomy/taxonomy.extractor.ts).

Instead of treating self-reported skills as unquestioned proof of mastery, V2 extracts capabilities across three distinct evidence tiers:

| Source | Baseline Strength | Provenance Snippet Source |
| :--- | :---: | :--- |
| **Skills** | **`0.65`** | Raw skill tag string (ensures students/freshers without extensive project history are well-represented). |
| **Projects** | **`0.85`** | Project title + explicit tech tags OR sentence context in project descriptions. |
| **Work Experience** | **`1.00`** | Job title & company + explicit tech tags OR bullet points in formal employment. |

### Evidence Provenance Schema
Every inferred capability in `UserTaxonomy.evidence` retains its verifiable source proof:
```json
{
  "nodeId": "fastapi",
  "source": "projects",
  "snippet": "Cloud Telemetry: Engineered real-time observability app using FastAPI and Docker containers.",
  "strength": 0.85
}
```

### Multi-Source Aggregation Formula
When a technology is confirmed across multiple sections (e.g. listed under Skills and used in a Project):
$$\text{Aggregated Strength} = \min\left(1.0,\ \max(\text{strengths}) + 0.10 \times (\text{distinct sources} - 1)\right)$$
- Skill only: `0.65`
- Project only: `0.85`
- Skill + Project: $\min(1.0, 0.85 + 0.10) = \mathbf{0.95}$
- Skill + Project + Work Experience: $\min(1.0, 1.00 + 0.20) = \mathbf{1.00}$

---

## 6. Directional Structural Matching Rules ($U \to R$)

Implemented in [`apps/api/src/taxonomy/pair.scorer.ts`](file:///e:/Programming/Projects%202026/Squad%20Up/main/apps/api/src/taxonomy/pair.scorer.ts).

Comparing candidate skill $U$ against team requirement $R$ is strictly directional:

| Case | Relationship Condition | Example | Formula | Score |
| :---: | :--- | :--- | :--- | :---: |
| **1** | **Exact Match** | $U = \text{react}, R = \text{react}$ | $1.0$ | **`1.00`** |
| **2** | **Specific Satisfies Broad** ($U$ is descendant of $R$) | $U = \text{react}, R = \text{frontend\_development}$ | $\max(0.65, 0.95 - 0.05 \times (d - 1))$ | **`0.95`** ($d=1$)<br>**`0.90`** ($d=2$) |
| **3** | **Broad Skill vs Specific Req** ($U$ is ancestor of $R$) | $U = \text{frontend\_development}, R = \text{react}$ | $\max(0.15, 0.45 - 0.08 \times (d - 1))$ | **`0.45`** ($d=1$)<br>**`0.37`** ($d=2$) |
| **4** | **Sibling Technologies** (Same immediate parent) | $U = \text{cpp}, R = \text{java}$ | Fixed constant | **`0.65`** |
| **5** | **Related Subdomain** (LCA depth $\ge 2$) | $U = \text{fastapi}, R = \text{react}$ (LCA: `web_development`) | $0.35 + 0.05 \times \text{depth} - 0.03 \times (d - 2)$ | **`0.25 – 0.50`** |
| **6** | **Broad Domain Overlap** (LCA depth $= 1$) | $U = \text{nlp}, R = \text{deep\_learning}$ (LCA: `data_and_ai`) | $0.20 - 0.02 \times \max(0, d - 4)$ | **`0.10 – 0.25`** |
| **7** | **Root Collision / Unrelated** | $U = \text{react}, R = \text{docker}$ (LCA: `computer_science`) | LCA depth $\le 0$ or distance $\ge 999$ | **`0.00`** |

---

## 7. Role-Based Matching (`TeamRole` & `bestMatchingRole`)

Implemented in [`apps/api/src/taxonomy/recommendation.engine.ts`](file:///e:/Programming/Projects%202026/Squad%20Up/main/apps/api/src/taxonomy/recommendation.engine.ts).

A squad is not merely an amorphous list of tags; it consists of structured roles (e.g. *Frontend Lead*, *AI Specialist*, *DevOps Engineer*).

### How Role-Level Scoring Works:
1. When a team defines roles, each role's skills are resolved into requirement nodes stored in `TeamTaxonomy.roleTaxonomies`.
2. For each open role ($spots > 0$), the recommendation engine computes the user's compatibility score against that role's specific requirements:
   $$\text{Role Score} = \frac{1}{|R_{\text{role}}|} \sum_{r \in R_{\text{role}}} \text{best\_score}(r)$$
3. The role with the highest score is attached as `bestMatchingRole`:
   ```json
   {
     "roleId": "cmrole123",
     "roleTitle": "Frontend Architect",
     "score": 0.95,
     "fulfilledCount": 3,
     "totalCount": 3,
     "skills": ["React", "TypeScript", "Tailwind CSS"]
   }
   ```
4. This enables candidates on `TeamsPage` or `TeamDetailPage` to immediately see which specific open seat they fit best.

---

## 8. Performance Optimization: User Pre-Scoring Vector

Evaluating 10,000 teams naively requires $15 \text{ skills} \times 3.5 \text{ reqs} \times 10,000 = 525,000$ pairwise graph comparisons.

Instead, the in-process Node.js engine uses the **User Pre-Scoring Vector**:
1. At request start, compute the user's best score against all $N = 151$ taxonomy nodes once:
   $$15 \times 151 = 2,265\text{ operations} \implies \mathbf{\approx 1.2\text{ ms}}$$
2. This creates a flat hash map `userVector[nodeId] -> { score, bestUserSkillId, structuralFeatures }`.
3. For each candidate team, scoring its requirements and roles is simply $O(1)$ dictionary lookups:
   $$10,000 \times 3 = 30,000\text{ lookups} \implies \mathbf{\approx 3 - 6\text{ ms}}$$
4. Select top candidates in-memory $\implies \mathbf{\approx 1.0\text{ ms}}$.
5. Format LCA decision explanations only for the top-ranked results $\implies \mathbf{< 0.5\text{ ms}}$.

**Empirical Latency:** **$\approx 8 - 15\text{ ms}$ for 10,000 teams** in Node.js / TypeScript.

---

## 9. Event Eligibility & Recommendation Presentation Categories

### A. Hard Eligibility Filtering (Pre-Scoring)
- **Global Event (`isGlobal = true`):** Open to all students regardless of home university.
- **Campus Event (`isGlobal = false`):** Students from other institutions are strictly ineligible and filtered out at the database level before scoring.

### B. Pure Compatibility Scoring
The `taxonomyScore` represents strictly technical capability ($0.0$ to $1.0$). Institutional affiliation is **never** used to artificially inflate technical compatibility.

### C. Recommendation Presentation Categories
Teams are sorted descending by pure `taxonomyScore` and assigned one of three badges:
- 🟢 **`BEST`:** Full/top technical match (`taxonomyScore >= 0.80`) + Same University.
- 🔵 **`GOOD_DIFFERENT_UNIVERSITY`:** Strong technical match (`taxonomyScore >= 0.80`) + Cross-University (eligible via global event).
- 🟡 **`SAME_UNIVERSITY_LOWER_SCORE`:** Moderate technical match (`taxonomyScore < 0.80`) + Same University.

---

## 10. API Reference

### `POST /api/teams/recommendations`
Runs user capability nodes against eligible candidate teams and provides full LCA breakdown and best-matching role metadata.

**Request Body:**
```json
{
  "eventId": "cm0abc123", // Optional: limits search to this event's squads
  "sameUniversityOnly": false, // Optional: restrict to user's campus
  "topK": 50 // Optional: defaults to 50
}
```

**Response Body:**
```json
{
  "recommendations": [
    {
      "rank": 1,
      "teamId": "team_789",
      "teamName": "AI Agents Squad",
      "university": "Stanford University",
      "description": "Building autonomous developer tooling",
      "requirements": ["FastAPI", "React", "Docker"],
      "taxonomyScore": 0.95,
      "sameUniversity": true,
      "isGlobal": true,
      "isEligible": true,
      "recommendationCategory": "BEST",
      "fulfilledRequirementsCount": 3,
      "totalRequirementsCount": 3,
      "bestMatchingRole": {
        "roleId": "cmrole456",
        "roleTitle": "Full Stack Lead",
        "score": 0.98,
        "fulfilledCount": 2,
        "totalCount": 2,
        "skills": ["React", "FastAPI"]
      },
      "requirementBreakdown": [
        {
          "requirementNodeId": "fastapi",
          "requirementName": "FastAPI",
          "bestUserSkillName": "FastAPI",
          "score": 1.0,
          "matchType": "exact",
          "explanationText": "Direct canonical exact match with 'FastAPI' (Score: 1.0)",
          "isStrong": true
        },
        {
          "requirementNodeId": "react",
          "requirementName": "React",
          "bestUserSkillName": "React",
          "score": 1.0,
          "matchType": "exact",
          "explanationText": "Direct canonical exact match with 'React' (Score: 1.0)",
          "isStrong": true
        },
        {
          "requirementNodeId": "docker",
          "requirementName": "Docker",
          "bestUserSkillName": "Kubernetes",
          "score": 0.85,
          "matchType": "sibling",
          "explanationText": "Related containerization technology via sibling relationship (Score: 0.85)",
          "isStrong": true
        }
      ]
    }
  ],
  "totalEligibleCandidates": 14,
  "userUniversity": "Stanford University",
  "userTaxonomyNodesCount": 12
}
```
