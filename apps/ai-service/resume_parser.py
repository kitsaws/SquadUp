import os
import json
import requests
import pdfplumber
from fastapi import UploadFile, HTTPException
from dotenv import load_dotenv, find_dotenv

load_dotenv(find_dotenv())

GROQ_API_URL = os.environ.get("GROQ_API_URL", "https://api.groq.com/openai/v1/chat/completions")
GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
GROQ_MODEL = os.environ.get("GROQ_MODEL", "mixtral-8x7b-32768")

# Resolve path to canonical schema in @squadup/shared
SCHEMA_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "packages", "shared", "schemas", "profile.schema.json")
)

try:
    with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
        PROFILE_SCHEMA = json.load(f)
except Exception as err:
    print(f"[resume_parser] Warning: Could not load schema from {SCHEMA_PATH}: {err}. Using default.")
    PROFILE_SCHEMA = {
        "name": "string",
        "title": "string",
        "summary": "string",
        "skills": ["string"],
        "education": [{"degree": "string", "college": "string", "year": "string"}],
        "experience": [{"company": "string", "role": "string", "duration": "string", "bullet_points": ["string"], "technologies": ["string"]}],
        "achievements": [{"title": "string", "organization": "string", "award_tier": "string", "year": "string", "description": "string", "technologies": ["string"]}],
        "projects": [{"name": "string", "description": "string", "bullet_points": ["string"], "technologies": ["string"]}],
        "links": {"github": "string", "linkedin": "string"}
    }

def extract_text_from_pdf(file_path: str):
    text = ""
    hyperlinks = []
    try:
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                extracted = page.extract_text()
                if extracted:
                    text += extracted + "\n"
                if page.hyperlinks:
                    for hl in page.hyperlinks:
                        uri = hl.get("uri")
                        if uri and uri not in hyperlinks:
                            hyperlinks.append(uri)
    except Exception as e:
        raise Exception(f"Failed to extract text from PDF: {str(e)}")
    return text.strip(), hyperlinks

def generate_profile_data(resume_text: str, hyperlinks: list = None) -> dict:
    if not GROQ_API_KEY:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY environment variable is not set")
        
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }

    links_section = ""
    if hyperlinks:
        links_section = "\n\nDetected URLs / Hyperlinks from PDF document annotations:\n" + "\n".join(f"- {l}" for l in hyperlinks)
    
    prompt = (
        "Extract and synthesize a complete, professional candidate profile from this resume text.\n\n"
        "Use this exact JSON shape:\n"
        f"{json.dumps(PROFILE_SCHEMA, indent=2)}\n\n"
        "CRITICAL EXTRACTION GUIDELINES:\n"
        "1. 'name': Extract the candidate's full name from the header/contact section.\n"
        "2. 'title': Synthesize an accurate, high-impact professional headline (e.g. 'Full Stack Developer', 'AI/ML Engineer & Systems Builder', 'Backend & Cloud Engineer', 'Software Engineering Student') that best summarizes their stack and capabilities. NEVER leave title empty or blank.\n"
        "3. 'summary': Write a concise, compelling 2 to 3 sentence professional bio highlighting their core technical competencies, top projects, and engineering achievements. NEVER leave summary empty or blank.\n"
        "4. 'skills': Extract all technical skills (languages, frameworks, libraries, databases, cloud, dev tools) into clean string items.\n"
        "5. 'education': Extract all degrees, universities or colleges, graduation dates or ranges, and GPA/marks if mentioned.\n"
        "6. 'experience': Strictly extract formal employment, corporate internships, company roles, or paid research fellowships. Do NOT put hackathon wins, student club leadership, or awards into 'experience'. If the candidate has no formal corporate employment, leave 'experience' as an empty array [].\n"
        "7. 'achievements': Extract all hackathons (e.g., JPMorgan Code for Good, Israeli-Indian Hackathon), coding competitions, academic honors, scholarships, fellowship wins, and open source awards. For each achievement, provide 'title', 'organization', 'award_tier' (e.g., '1st Place Winner', '3rd Place', 'Finalist', 'Top 5', 'Participant'), 'year', concise 'description', and 'technologies' used.\n"
        "8. 'projects': Extract ALL software projects, apps, platforms, or tools mentioned. NEVER skip any project. For each project, extract clean 'name', 1-2 sentence 'description', specific 'bullet_points', and list of 'technologies' used.\n"
        "9. 'links': Extract their GitHub URL and LinkedIn URL. Use the detected hyperlinks provided below if available.\n\n"
        f"Resume text:\n"
        f"{resume_text}"
        f"{links_section}"
    )

    payload = {
        "model": GROQ_MODEL,
        "temperature": 0.2,
        "max_completion_tokens": 4096,
        "top_p": 1,
        "stream": False,
        "response_format": {"type": "json_object"},
        "messages": [
            {
                "role": "system",
                "content": "You convert resume text into clean, structured JSON for a technical candidate profile. Accurately identify technical skills, tools, and libraries used in each project and work experience item. Return only valid JSON that matches the requested object shape. Do not wrap it in markdown."
            },
            {
                "role": "user",
                "content": prompt
            }
        ]
    }
    
    response = requests.post(GROQ_API_URL, headers=headers, json=payload, timeout=60)
    
    if not response.ok:
        raise HTTPException(status_code=response.status_code, detail=f"LLM request failed: {response.text}")
        
    data = response.json()
    try:
        content = data["choices"][0]["message"]["content"]
    except KeyError:
        raise HTTPException(status_code=500, detail="The LLM response did not include profile JSON.")
        
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="The LLM returned invalid JSON. Try again or adjust the prompt/model.")
