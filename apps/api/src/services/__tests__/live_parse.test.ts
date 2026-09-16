import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { parseResume } from "../resume.parser.js";
import { TaxonomyService } from "../../taxonomy/taxonomy.service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Manually parse and load root .env if not loaded
function loadEnv() {
  const envPath = path.resolve(__dirname, "../../../../../.env");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim();
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

async function runLiveResumeToProfileTest() {
  console.log("=== SquadUp 2.0: Testing Live Resume -> Profile -> UserTaxonomy Pipeline ===");
  loadEnv();

  const samplePdfPath = path.resolve(
    __dirname,
    "../../../../../../Prototyping/TaxonomyRecSys/squadup_taxonomy_test_resumes/01_berkeley_backend_devops.pdf"
  );

  if (!fs.existsSync(samplePdfPath)) {
    console.error(`[ERROR] Sample PDF not found at ${samplePdfPath}`);
    return;
  }

  const pdfBuffer = fs.readFileSync(samplePdfPath);
  console.log(`[1/3] Read PDF file (${pdfBuffer.length} bytes)`);

  const t0 = performance.now();
  console.log("[2/3] Extracting text & calling Groq LLM...");
  const profileData = await parseResume(pdfBuffer, "01_berkeley_backend_devops.pdf");
  const t1 = performance.now();

  console.log(`[PASS] Resume parsed in ${((t1 - t0) / 1000).toFixed(2)}s`);
  console.log("Extracted Candidate Profile Data:");
  console.log("---------------------------------");
  console.log("Name:", profileData.name);
  console.log("Title:", profileData.title);
  console.log("Summary:", profileData.summary);
  console.log("Skills:", profileData.skills);
  console.log("Education:", profileData.education);
  console.log("Experience Count:", profileData.experience?.length);
  console.log("Experience:", JSON.stringify(profileData.experience, null, 2));
  console.log("Achievements Count:", profileData.achievements?.length);
  console.log("Achievements:", JSON.stringify(profileData.achievements, null, 2));
  console.log("Projects Count:", profileData.projects?.length);
  console.log("Projects:", JSON.stringify(profileData.projects, null, 2));
  console.log("Links:", profileData.links);

  console.log("\n[3/3] Resolving UserTaxonomy with V2 Multi-source Provenance Evidence...");
  const t2 = performance.now();
  const taxResult = TaxonomyService.resolveUserTaxonomy("test_user_berkeley", profileData);
  const t3 = performance.now();

  console.log(`[PASS] UserTaxonomy resolved in ${(t3 - t2).toFixed(2)}ms`);
  console.log("Resolved Taxonomy Node IDs:", taxResult.taxonomy_node_ids);
  console.log(`Captured Evidence Items (${taxResult.evidence.length}):`);
  for (const ev of taxResult.evidence) {
    console.log(`  - [${ev.source.toUpperCase()}] ${ev.nodeId} (strength: ${ev.strength}): "${ev.snippet}"`);
  }

  console.log("\n=== End-to-End Resume -> Profile -> Taxonomy Verification Complete! ===");
}

runLiveResumeToProfileTest().catch(console.error);
