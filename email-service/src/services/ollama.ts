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
2. assume the user has experience in the field: ${jobTitle} and highlights relevant skills from the candidate profile that match the job requirements
3. Mentions specific technologies or responsibilities from the job description
4. ${applyUrl ? "References where you found this opportunity naturally (e.g., 'I came across this position on [platform]' or 'I found this role through [source]')" : ""}
5. Keeps it concise but engaging (under 200 words)
6. Uses a professional but friendly tone
7. STRICTLY NO EMOJIS - Use only plain text, no symbols, emoticons, or emojis whatsoever
8. Ends with signature including placeholders for:
   - [Your Name]
   - LinkedIn: [LinkedIn Profile URL]
   - Portfolio: [Portfolio Website URL]

Email:`;

  const response = await axios.post(`${OLLAMA_URL}/api/generate`, {
    model: MODEL,
    prompt: prompt,
    stream: false
  });

  const emailContent = response.data.response || "Unable to generate email content";
  // Remove any emojis that might have slipped through
  return emailContent.replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '');
}

export async function refineEmail(
  currentEmail: string,
  userFeedback: string,
  jobTitle: string,
  companyName: string
): Promise<string> {
  const prompt = `You are an expert at refining and improving job application emails based on user feedback.

Current Email:
${currentEmail}

User Feedback/Request:
${userFeedback}

Job Context:
- Position: ${jobTitle}
- Company: ${companyName}

Please modify the email based on the user's feedback while maintaining:
1. Professional tone
2. All important content from the original email (don't remove key details unless specifically requested)
3. Relevant content for the ${jobTitle} position at ${companyName}
4. STRICTLY NO EMOJIS - Use only plain text, no symbols, emoticons, or emojis whatsoever
5. Proper email structure with greeting, body, and signature
6. Keep it concise but complete (under 200 words)

IMPORTANT: Only make the specific changes requested by the user. Preserve all other content from the original email.

Return only the refined email content:`;

  const response = await axios.post(`${OLLAMA_URL}/api/generate`, {
    model: MODEL,
    prompt: prompt,
    stream: false
  });

  const emailContent = response.data.response || "Unable to refine email content";
  // Remove any emojis that might have slipped through
  return emailContent.replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '');
}