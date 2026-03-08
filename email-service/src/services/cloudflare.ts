import axios from "axios";

const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const MODEL = process.env.CLOUDFLARE_MODEL || "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

export async function generateEmail(
  jobTitle: string,
  companyName: string,
  jobDescription: string,
  userProfile: string,
  location?: string,
  applyUrl?: string,
  userPrompt?: string
): Promise<string> {
  const prompt = `Write a personalized job application email based on this request: "${userPrompt || 'Draft email for job application'}"

Job Details:
- Position: ${jobTitle}
- Company: ${companyName}
- Location: ${location || "Remote"}
- Description: ${jobDescription}

Write a professional, personalized email that:
1. Addresses the specific role and company mentioned
2. Shows genuine interest and enthusiasm
3. Highlights relevant skills for ${jobTitle}
4. Mentions why you want to work at ${companyName}
5. Uses a professional but engaging tone
6. Keeps it concise (under 200 words)
7. Ends with proper signature placeholders

Email:`;

  try {
    const response = await axios.post(
      `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/ai/run/${MODEL}`,
      {
        messages: [{ role: "user", content: prompt }],
        max_tokens: 512
      },
      {
        headers: {
          "Authorization": `Bearer ${CLOUDFLARE_API_TOKEN}`,
          "Content-Type": "application/json"
        }
      }
    );

    if (response.data.success) {
      return response.data.result.response;
    } else {
      return generateFallbackEmail(jobTitle, companyName, location || 'Remote');
    }
  } catch (error) {
    console.log('Cloudflare AI error, using fallback');
    return generateFallbackEmail(jobTitle, companyName, location || 'Remote');
  }
}

export async function refineEmail(
  currentEmail: string,
  userFeedback: string,
  jobTitle: string,
  companyName: string
): Promise<string> {
  const prompt = `Refine this email based on feedback:

Current Email: ${currentEmail}
Feedback: ${userFeedback}

Return the improved email:`;

  try {
    const response = await axios.post(
      `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/ai/run/${MODEL}`,
      {
        messages: [{ role: "user", content: prompt }],
        max_tokens: 512
      },
      {
        headers: {
          "Authorization": `Bearer ${CLOUDFLARE_API_TOKEN}`,
          "Content-Type": "application/json"
        }
      }
    );

    if (response.data.success) {
      return response.data.result.response;
    } else {
      return currentEmail;
    }
  } catch (error) {
    console.log('Cloudflare AI error, returning original email');
    return currentEmail;
  }
}

function generateFallbackEmail(jobTitle: string, companyName: string, location: string): string {
  return `Dear Hiring Manager,

I am writing to express my interest in the ${jobTitle} position at ${companyName}. With my background in software development, I am confident I can contribute effectively to your team in ${location}.

I would welcome the opportunity to discuss how my skills align with your needs.

Best regards,
[Your Name]
LinkedIn: [LinkedIn Profile URL]
Portfolio: [Portfolio Website URL]`;
}