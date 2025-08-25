import axios from 'axios';

interface EmailResult {
  email: string;
  confidence: 'high' | 'medium' | 'low';
  source: 'hunter' | 'google' | 'clearbit';
  title?: string;
  snippet?: string;
}

// Common email patterns for companies
const EMAIL_PATTERNS = [
  '{first}.{last}@{domain}',
  '{first}{last}@{domain}',
  '{f}{last}@{domain}',
  '{first}@{domain}',
  '{first}_{last}@{domain}'
];

// Common first names for pattern generation
const COMMON_NAMES = [
  'john', 'jane', 'michael', 'sarah', 'david', 'lisa', 'robert', 'jennifer',
  'william', 'mary', 'james', 'patricia', 'richard', 'linda', 'charles', 'barbara'
];

export async function findCompanyEmails(companyName: string): Promise<EmailResult[]> {
  const emails: EmailResult[] = [];

  // Try Google search first (most accurate)
  if (process.env.SERPAPI_KEY) {
    try {
      const googleEmails = await searchGoogleForEmails(companyName);
      emails.push(...googleEmails);
    } catch (error) {
      console.log('Google search failed:', error);
    }
  }

  // Try Hunter.io if API key available
  if (process.env.HUNTER_API_KEY && emails.length < 5) {
    try {
      const domain = await getCompanyDomain(companyName);
      if (domain) {
        const hunterEmails = await fetchHunterEmails(domain);
        emails.push(...hunterEmails);
      }
    } catch (error) {
      console.log('Hunter.io failed:', error);
    }
  }

  // Remove duplicates and limit to 10
  const uniqueEmails = emails.filter((email, index, self) => 
    index === self.findIndex(e => e.email === email.email)
  );

  return uniqueEmails.slice(0, 10);
}

async function getCompanyDomain(companyName: string): Promise<string | null> {
  try {
    // Try Clearbit API for domain lookup (free tier available)
    if (process.env.CLEARBIT_API_KEY) {
      const response = await axios.get(`https://company.clearbit.com/v1/domains/find?name=${encodeURIComponent(companyName)}`, {
        headers: { 'Authorization': `Bearer ${process.env.CLEARBIT_API_KEY}` }
      });
      return response.data.domain;
    }
    
    // Fallback: generate likely domain
    return generateLikelyDomain(companyName);
  } catch (error) {
    return generateLikelyDomain(companyName);
  }
}

function generateLikelyDomain(companyName: string): string {
  return companyName.toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/inc|corp|ltd|llc|company|co$/g, '') + '.com';
}

async function fetchHunterEmails(domain: string): Promise<EmailResult[]> {
  const response = await axios.get(`https://api.hunter.io/v2/domain-search`, {
    params: {
      domain: domain,
      api_key: process.env.HUNTER_API_KEY,
      limit: 10
    }
  });

  return response.data.data.emails.map((email: any) => ({
    email: email.value,
    confidence: email.confidence > 80 ? 'high' : email.confidence > 50 ? 'medium' : 'low',
    source: 'hunter' as const
  }));
}



async function searchGoogleForEmails(companyName: string): Promise<EmailResult[]> {
  const queries = [
    `"${companyName}" recruiter email contact`,
    `"${companyName}" HR email contact`,
    `"${companyName}" talent acquisition email`,
    `site:linkedin.com "${companyName}" recruiter email`
  ];

  const emails: EmailResult[] = [];
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;

  for (const query of queries) {
    try {
      const response = await axios.get('https://serpapi.com/search', {
        params: {
          q: query,
          api_key: process.env.SERPAPI_KEY,
          num: 10
        }
      });

      const results = response.data.organic_results || [];
      
      for (const result of results) {
        const text = `${result.title} ${result.snippet}`.toLowerCase();
        const foundEmails = text.match(emailRegex) || [];
        
        for (const email of foundEmails) {
          if (email.includes(companyName.toLowerCase().replace(/\s+/g, '')) || 
              text.includes('recruiter') || text.includes('hr') || text.includes('talent')) {
            emails.push({
              email: email,
              confidence: 'high',
              source: 'google',
              title: result.title,
              snippet: result.snippet
            });
          }
        }
      }
    } catch (error) {
      console.log(`Google search failed for query: ${query}`, error);
    }
  }

  return emails;
}