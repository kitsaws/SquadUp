// ai.service.ts
// Communicates with the Python FastAPI AI Microservice

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

export class AIService {
  /**
   * Sends a PDF resume buffer to the AI microservice for parsing.
   * @param fileBuffer The raw buffer of the PDF file
   * @param filename The name of the file
   * @returns Parsed JSON profile data
   */
  static async parseResume(fileBuffer: Buffer, filename: string): Promise<any> {
    const formData = new FormData();
    const blob = new Blob([fileBuffer as any], { type: 'application/pdf' });
    formData.append('file', blob, filename);

    try {
      const response = await fetch(`${AI_SERVICE_URL}/api/parse-resume`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AI Service returned ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error calling AI microservice:', error);
      throw error;
    }
  }
}
