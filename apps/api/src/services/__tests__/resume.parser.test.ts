import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { extractPdfTextAndLinks } from "../resume.parser.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testPdfExtraction() {
  console.log("=== Testing Node PDF Text & Link Extraction ===");

  const samplePdfPath = path.resolve(
    __dirname,
    "../../../../../../Prototyping/TaxonomyRecSys/squadup_taxonomy_test_resumes/01_berkeley_backend_devops.pdf"
  );

  if (!fs.existsSync(samplePdfPath)) {
    console.warn(`[WARN] Sample PDF not found at ${samplePdfPath}`);
    return;
  }

  const pdfBuffer = fs.readFileSync(samplePdfPath);
  const result = await extractPdfTextAndLinks(pdfBuffer);

  console.log(`[PASS] PDF Extracted successfully (${result.resumeText.length} characters)`);
  console.log("Sample extracted text preview:");
  console.log("---");
  console.log(result.resumeText.slice(0, 300));
  console.log("---");
  console.log(`Hyperlinks detected: ${result.hyperlinks.length}`);
  console.log("=== PDF Extraction Test Complete! ===");
}

testPdfExtraction().catch(console.error);
