import axios from "axios";

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const MODEL = process.env.OLLAMA_MODEL || "llama2";

export async function generateEmail(
  jobTitle: string,
  companyName: string,
  jobDescription: string,
  userProfile: string,
  location?: string,
  applyUrl?: string
): Promise<string> {
  const prompt = `You are an expert at writing personalized, professional cold emails for job applications. Write a concise, engaging email that highlights relevant experience and shows genuine interest in the specific role and company.

Write a personalized cold email for this job application:

Job Title: ${jobTitle}
Company: ${companyName}
Location: ${location || "Remote/Not specified"}
Apply URL: ${applyUrl || "Not provided"}

Job Description:
${jobDescription}

Candidate Profile:
${userProfile}

Write a professional email that:
1. Shows specific interest in this role and company
2. Highlights relevant skills from the candidate profile that match the job requirements
3. Mentions specific technologies or responsibilities from the job description
4. ${applyUrl ? "References where you found this opportunity naturally (e.g., 'I came across this position on [platform]' or 'I found this role through [source]')" : ""}
5. Keeps it concise but engaging (under 200 words)
6. Uses a professional but friendly tone
7. Ends with signature including placeholders for:
   - [Your Name]
   - LinkedIn: [LinkedIn Profile URL]
   - GitHub: [GitHub Profile URL] (for technical roles)
   - Portfolio: [Portfolio Website URL]

Email:`;

  const response = await axios.post(`${OLLAMA_URL}/api/generate`, {
    model: MODEL,
    prompt: prompt,
    stream: false
  });

  return response.data.response || "Unable to generate email content";
}