from fastapi import FastAPI, UploadFile, File, HTTPException
from pydantic import BaseModel
import shutil
import os
from resume_parser import extract_text_from_pdf, generate_profile_data

app = FastAPI(title="SquadUp AI Service")

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "ai-service"}

@app.post("/api/parse-resume")
async def parse_resume(file: UploadFile = File(...)):
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
        
    temp_file_path = f"temp_{file.filename}"
    try:
        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        resume_text = extract_text_from_pdf(temp_file_path)
        if not resume_text:
            raise HTTPException(status_code=400, detail="No readable text found in PDF.")
            
        profile = generate_profile_data(resume_text)
        return profile
    finally:
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
