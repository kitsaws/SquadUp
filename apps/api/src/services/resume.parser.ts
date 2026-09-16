import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import type { CandidateProfileData } from "@squadup/shared";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve path to canonical schema in @squadup/shared
const SCHEMA_PATH = path.resolve(__dirname, "../../../../packages/shared/schemas/profile.schema.json");

let PROFILE_SCHEMA: any;
try {
  if (fs.existsSync(SCHEMA_PATH)) {
    PROFILE_SCHEMA = JSON.parse(fs.readFileSync(SCHEMA_PATH, "utf-8"));
  } else {
    throw new Error(`Schema file not found at ${SCHEMA_PATH}`);
  }
} catch (err) {
  console.warn(`[ResumeParser] Warning: Could not load schema from ${SCHEMA_PATH}. Using default schema.`);
  PROFILE_SCHEMA = {
    name: "string",
    title: "string",
    summary: "string",
    skills: ["string"],
    education: [{ degree: "string", college: "string", year: "string" }],
    experience: [
      {
        company: "string",
        role: "string",
        duration: "string",
        bullet_points: ["string"],
        technologies: ["string"],
      },
    ],
    achievements: [
      {
        title: "string",
        organization: "string",
        award_tier: "string",
        year: "string",
        description: "string",
        technologies: ["string"],
      },
    ],
    projects: [
      {
        name: "string",
        description: "string",
        bullet_points: ["string"],
        technologies: ["string"],
      },
    ],
    links: { github: "string", linkedin: "string" },
  };
}

export interface ExtractedPdfContent {
  resumeText: string;
  hyperlinks: string[];
}

/**
 * Extracts plain text and hyperlink annotations from a PDF buffer using pdfjs-dist.
 */
export async function extractPdfTextAndLinks(buffer: Buffer): Promise<ExtractedPdfContent> {
  if (!buffer || buffer.length === 0) {
    throw new Error("Empty or invalid PDF buffer provided.");
  }

  const data = new Uint8Array(buffer);
  const loadingTask = pdfjsLib.getDocument({
    data,
    useSystemFonts: true,
    disableFontFace: true,
  });

  const pdf = await loadingTask.promise;
  const pages: string[] = [];
  const hyperlinks: string[] = [];
  const seenUrls = new Set<string>();

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);

    // 1. Text extraction
    const textContent = await page.getTextContent();
    const pageStrings = textContent.items.map((item: any) => item.str || "");
    pages.push(pageStrings.join(" "));

    // 2. Annotation & hyperlink extraction
    try {
      const annotations = await page.getAnnotations();
      for (const anno of annotations) {
        const url = anno.url || anno.uri;
        if (url && typeof url === "string" && !seenUrls.has(url)) {
          seenUrls.add(url);
          hyperlinks.push(url);
        }
      }
    } catch {
      // Annotations are optional; non-fatal if missing
    }
  }

  const resumeText = pages.join("\n\n").trim();
  return { resumeText, hyperlinks };
}

/**
 * Calls Groq API to synthesize structured CandidateProfileData from extracted resume text.
 */
export async function generateProfileData(
  resumeText: string,
  hyperlinks: string[] = []
): Promise<CandidateProfileData> {
  const apiKey = process.env.GROQ_API_KEY;
  const apiUrl = process.env.GROQ_API_URL || "https://api.groq.com/openai/v1/chat/completions";
  const model = process.env.GROQ_MODEL || "gpt-oss-140b";

  if (!apiKey || apiKey === "gsk_your_groq_api_key_here" || apiKey === "paste-your-groq-api-key-here") {
    throw new Error("GROQ_API_KEY environment variable is not configured.");
  }

  let linksSection = "";
  if (hyperlinks.length > 0) {
    linksSection = "\n\nDetected URLs / Hyperlinks from PDF document annotations:\n" + hyperlinks.map((l) => `- ${l}`).join("\n");
  }

  const prompt = [
    "Extract and synthesize a complete, professional candidate profile from this resume text.",
    "",
    "Use this exact JSON shape:",
    JSON.stringify(PROFILE_SCHEMA, null, 2),
    "",
    "CRITICAL EXTRACTION GUIDELINES:",
    "1. 'name': Extract the candidate's full name from the header/contact section.",
    "2. 'title': Synthesize an accurate, high-impact professional headline (e.g. 'Full Stack Developer', 'AI/ML Engineer & Systems Builder', 'Backend & Cloud Engineer', 'Software Engineering Student') that best summarizes their stack and capabilities. NEVER leave title empty or blank.",
    "3. 'summary': Write a concise, compelling 2 to 3 sentence professional bio highlighting their core technical competencies, top projects, and engineering achievements. NEVER leave summary empty or blank.",
    "4. 'skills': Extract all technical skills (languages, frameworks, libraries, databases, cloud, dev tools) into clean string items.",
    "5. 'education': Extract all degrees, universities or colleges, graduation dates or ranges, and GPA/marks if mentioned.",
    "6. 'experience': Strictly extract formal employment, corporate internships, company roles, or paid research fellowships. Do NOT put hackathon wins, student club leadership, or awards into 'experience'. If the candidate has no formal corporate employment, leave 'experience' as an empty array [].",
    "7. 'achievements': Extract all hackathons (e.g., JPMorgan Code for Good, Israeli-Indian Hackathon), coding competitions, academic honors, scholarships, fellowship wins, and open source awards. For each achievement, provide 'title', 'organization', 'award_tier' (e.g., '1st Place Winner', '3rd Place', 'Finalist', 'Top 5', 'Participant'), 'year', concise 'description', and 'technologies' used.",
    "8. 'projects': Extract ALL software projects, apps, platforms, or tools mentioned. NEVER skip any project. For each project, extract clean 'name', 1-2 sentence 'description', specific 'bullet_points', and list of 'technologies' used.",
    "9. 'links': Extract their GitHub URL and LinkedIn URL. Use the detected hyperlinks provided below if available.",
    "",
    "Resume text:",
    resumeText,
    linksSection,
  ].join("\n");

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_completion_tokens: 3000,
      top_p: 1,
      stream: false,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You convert resume text into clean, structured JSON for a technical candidate profile. Accurately identify technical skills, tools, and libraries used in each project and work experience item. Return only valid JSON that matches the requested object shape. Do not wrap it in markdown.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq LLM request failed (${response.status}): ${errorText}`);
  }

  const data: any = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("The LLM response did not include profile JSON.");
  }

  return parseProfileJson(content);
}

/**
 * Cleans markdown fences and parses the JSON response safely.
 */
function parseProfileJson(content: string): CandidateProfileData {
  const cleanJson = content
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    const parsed = JSON.parse(cleanJson);
    return {
      name: parsed.name || undefined,
      title: parsed.title || undefined,
      summary: parsed.summary || undefined,
      skills: Array.isArray(parsed.skills) ? parsed.skills : [],
      education: Array.isArray(parsed.education) ? parsed.education : [],
      experience: Array.isArray(parsed.experience) ? parsed.experience : [],
      achievements: Array.isArray(parsed.achievements) ? parsed.achievements : [],
      projects: Array.isArray(parsed.projects) ? parsed.projects : [],
      links: parsed.links || {},
    };
  } catch (err: any) {
    throw new Error(`Failed to parse LLM JSON response: ${err.message}`);
  }
}

/**
 * End-to-end resume parser: takes a PDF Buffer and extracts candidate profile JSON.
 */
export async function parseResume(buffer: Buffer, _filename?: string): Promise<CandidateProfileData> {
  const { resumeText, hyperlinks } = await extractPdfTextAndLinks(buffer);

  if (!resumeText || resumeText.length === 0) {
    throw new Error("No readable text found in PDF resume.");
  }

  return generateProfileData(resumeText, hyperlinks);
}
