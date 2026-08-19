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

PROFILE_SCHEMA = {
    "name": "string",
    "title": "string",
    "summary": "string",
    "skills": ["string"],
    "education": [
        {
            "degree": "string",
            "college": "string",
        }
    ],
    "experience": [
        {
            "company": "string",
            "role": "string",
            "duration": "string",
        }
    ],
    "projects": [
        {
            "name": "string",
            "description": "string",
        }
    ],
    "links": {
        "github": "string",
        "linkedin": "string",
    }
}

def extract_text_from_pdf(file_path: str) -> str:
    text = ""
    try:
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                extracted = page.extract_text()
                if extracted:
                    text += extracted + "\n"
    except Exception as e:
        raise Exception(f"Failed to extract text from PDF: {str(e)}")
    return text.strip()

def generate_profile_data(resume_text: str) -> dict:
    if not GROQ_API_KEY:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY environment variable is not set")
        
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }
    
    prompt = (
        "Extract a professional candidate profile from this resume text.\n\n"
        "Use this exact JSON shape:\n"
        f"{json.dumps(PROFILE_SCHEMA, indent=2)}\n\n"
        "If a field is missing, use an empty string or empty array.\n\n"
        "Resume text:\n"
        f"{resume_text}"
    )

    payload = {
        "model": GROQ_MODEL,
        "temperature": 0.2,
        "max_completion_tokens": 1400,
        "top_p": 1,
        "stream": False,
        "response_format": {"type": "json_object"},
        "messages": [
            {
                "role": "system",
                "content": "You convert resume text into clean JSON for a candidate profile. Return only valid JSON that matches the requested object shape. Do not wrap it in markdown."
            },
            {
                "role": "user",
                "content": prompt
            }
        ]
    }
    
    response = requests.post(GROQ_API_URL, headers=headers, json=payload)
    
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
