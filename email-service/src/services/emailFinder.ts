import axios from "axios";

const HUNTER_API_KEY = process.env.HUNTER_API_KEY;
const HUNTER_URL = "https://api.hunter.io/v2";

export async function findCompanyEmails(companyName: string, domain?: string): Promise<{
  emails: string[];
  hrEmails: string[];
  recruitingEmails: string[];
  domain: string;
}> {
  if (!HUNTER_API_KEY) {
    console.warn("HUNTER_API_KEY not set, skipping email finder");
    return { emails: [], hrEmails: [], recruitingEmails: [], domain: domain || "" };
  }

  try {
    // If no domain provided, try to find it first
    let companyDomain = domain;
    if (!companyDomain) {
      companyDomain = await findCompanyDomain(companyName);
    }

    if (!companyDomain) {
      return { emails: [], hrEmails: [], recruitingEmails: [], domain: "" };
    }

    // Find emails for the domain
    const response = await axios.get(`${HUNTER_URL}/domain-search`, {
      params: {
        domain: companyDomain,
        api_key: HUNTER_API_KEY,
        limit: 10
      }
    });

    const emails = response.data.data?.emails || [];
    
    // Filter HR and recruiting emails
    const hrEmails = emails
      .filter((email: any) => 
        email.type === "generic" && 
        (email.value.includes("hr") || 
         email.value.includes("careers") || 
         email.value.includes("jobs") ||
         email.value.includes("recruiting") ||
         email.value.includes("talent"))
      )
      .map((email: any) => email.value);

    const recruitingEmails = emails
      .filter((email: any) => 
        email.department === "hr" || 
        email.position?.toLowerCase().includes("recruiter") ||
        email.position?.toLowerCase().includes("hr")
      )
      .map((email: any) => email.value);

    const allEmails = emails.map((email: any) => email.value);

    return {
      emails: allEmails,
      hrEmails,
      recruitingEmails,
      domain: companyDomain
    };

  } catch (error) {
    console.error("Hunter.io API error:", error);
    return { emails: [], hrEmails: [], recruitingEmails: [], domain: domain || "" };
  }
}

async function findCompanyDomain(companyName: string): Promise<string | null> {
  try {
    const response = await axios.get(`${HUNTER_URL}/domain-search`, {
      params: {
        company: companyName,
        api_key: HUNTER_API_KEY,
        limit: 1
      }
    });

    return response.data.data?.domain || null;
  } catch (error) {
    console.error("Domain search error:", error);
    return null;
  }
}

// Fallback email generator
export function generatePossibleEmails(companyName: string, domain: string): string[] {
  const commonPatterns = [
    "hr@",
    "careers@", 
    "jobs@",
    "recruiting@",
    "talent@",
    "info@",
    "contact@"
  ];

  return commonPatterns.map(pattern => `${pattern}${domain}`);
}