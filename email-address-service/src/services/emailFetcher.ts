import axios from "axios";
import dns from "dns";
import { promisify } from "util";

const resolveMx = promisify(dns.resolveMx);

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
}

interface EmailResult {
  email: string;
  name: string;
  title: string;
  verified: boolean;
  verifaliaStatus?: string;
}

export class EmailFetcher {
  private serpApiKey: string;
  private verifaliaApiKey: string;

  constructor(serpApiKey: string, verifaliaApiKey: string) {
    this.serpApiKey = serpApiKey;
    this.verifaliaApiKey = verifaliaApiKey;
  }

  async fetchJobsFromService(searchParams: any): Promise<Job[]> {
    try {
      const response = await axios.post('http://job-service:3000/jobs', searchParams);
      return response.data.jobs || [];
    } catch (error) {
      console.error('Error fetching jobs:', error);
      return [];
    }
  }

  async findHRContacts(companyName: string): Promise<Array<{name: string, title: string}>> {
    try {
      const searchQuery = `"${companyName}" (recruiter OR "HR" OR "talent acquisition" OR "hiring manager") site:linkedin.com`;
      
      const response = await axios.get('https://serpapi.com/search.json', {
        params: {
          engine: 'google',
          q: searchQuery,
          api_key: this.serpApiKey,
          num: 5
        }
      });

      const results = response.data.organic_results || [];
      const contacts: Array<{name: string, title: string}> = [];

      for (const result of results) {
        const name = this.extractNameFromLinkedIn(result.title);
        const title = this.extractTitleFromLinkedIn(result.title);
        
        if (name && title) {
          contacts.push({ name, title });
        }
      }

      return contacts;
    } catch (error) {
      console.error('Error finding HR contacts:', error);
      return [];
    }
  }

  private extractNameFromLinkedIn(title: string): string | null {
    // Extract name from LinkedIn title patterns like "John Doe - HR Manager at Company"
    const patterns = [
      /^([^-|]+?)\s*[-|]/,
      /^([A-Z][a-z]+\s+[A-Z][a-z]+)/
    ];

    for (const pattern of patterns) {
      const match = title.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }
    return null;
  }

  private extractTitleFromLinkedIn(title: string): string | null {
    // Extract job title from LinkedIn patterns
    const patterns = [
      /[-|]\s*([^-|]+?)\s*at\s+/i,
      /[-|]\s*([^-|]+?)$/i
    ];

    for (const pattern of patterns) {
      const match = title.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }
    return null;
  }

  generateEmailVariations(name: string, companyName: string): string[] {
    const firstName = name.split(' ')[0].toLowerCase();
    const lastName = name.split(' ').slice(1).join('').toLowerCase();
    const domain = this.guessDomain(companyName);

    return [
      `${firstName}.${lastName}@${domain}`,
      `${firstName}${lastName}@${domain}`,
      `${firstName}_${lastName}@${domain}`,
      `${firstName}@${domain}`,
      `${firstName[0]}${lastName}@${domain}`,
      `${firstName}.${lastName[0]}@${domain}`
    ];
  }

  private guessDomain(companyName: string): string {
    const name = companyName.toLowerCase().trim();
    
    // Handle common company name patterns
    const domainMappings: { [key: string]: string } = {
      'tcs': 'tcs.com',
      'tata consultancy services': 'tcs.com',
      'infosys': 'infosys.com',
      'wipro': 'wipro.com',
      'accenture': 'accenture.com',
      'cognizant': 'cognizant.com',
      'hcl': 'hcltech.com',
      'tech mahindra': 'techmahindra.com',
      'capgemini': 'capgemini.com',
      'microsoft': 'microsoft.com',
      'google': 'google.com',
      'amazon': 'amazon.com',
      'meta': 'meta.com',
      'facebook': 'meta.com',
      'apple': 'apple.com',
      'netflix': 'netflix.com',
      'uber': 'uber.com',
      'airbnb': 'airbnb.com',
      'flipkart': 'flipkart.com',
      'paytm': 'paytm.com',
      'zomato': 'zomato.com',
      'swiggy': 'swiggy.in',
      'ola': 'olacabs.com',
      'byju\'s': 'byjus.com',
      'phonepe': 'phonepe.com'
    };
    
    // Check for exact matches first
    if (domainMappings[name]) {
      return domainMappings[name];
    }
    
    // Check for partial matches
    for (const [key, domain] of Object.entries(domainMappings)) {
      if (name.includes(key) || key.includes(name)) {
        return domain;
      }
    }
    
    // Clean company name for generic domain
    let cleanName = name
      .replace(/\b(pvt|ltd|limited|inc|corp|corporation|llc|llp|private|public)\b/g, '')
      .replace(/[^a-z0-9]/g, '')
      .trim();
    
    // Handle special cases
    if (cleanName.includes('bombay')) {
      cleanName = cleanName.replace('bombay', 'mumbai');
    }
    
    return `${cleanName}.com`;
  }

  // ✅ Combined MX + Verifalia validation with Bearer token
  async verifyEmail(email: string): Promise<{ valid: boolean; status: string }> {
    try {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return { valid: false, status: "invalid-format" };
      }

      // Check MX records first
      const domain = email.split("@")[1];
      const mxRecords = await resolveMx(domain);
      if (!mxRecords || mxRecords.length === 0) {
        return { valid: false, status: "no-mx" };
      }

      // Submit email validation to Verifalia
      const response = await axios.post(
        "https://api.verifalia.com/v2.4/email-validations",
        { emailAddress: email },
        {
          headers: {
            "Authorization": `Bearer ${this.verifaliaApiKey}`,
            "Content-Type": "application/json"
          }
        }
      );

      // Get validation ID and poll for results
      const validationId = response.data.overview.id;
      let status = response.data.overview.status;
      let result = response.data;

      // Poll until completion (max 30 seconds)
      let attempts = 0;
      while ((status === "InProgress" || status === "Pending") && attempts < 15) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
        
        const pollResponse = await axios.get(
          `https://api.verifalia.com/v2.4/email-validations/${validationId}`,
          {
            headers: {
              "Authorization": `Bearer ${this.verifaliaApiKey}`,
              "Content-Type": "application/json"
            }
          }
        );
        
        status = pollResponse.data.overview.status;
        result = pollResponse.data;
        attempts++;
      }

      // Extract result from first entry
      const entry = result.entries?.[0];
      if (!entry) {
        return { valid: false, status: "no-result" };
      }

      return {
        valid: entry.classification === "Deliverable",
        status: entry.classification || status,
      };
    } catch (error:any) {
      console.error(`Error verifying email ${email}:`, error.response?.data || error.message);
      return { valid: false, status: "error" };
    }
  }

  async fetchEmailsForJob(job: Job): Promise<EmailResult[]> {
    const contacts = await this.findHRContacts(job.company);
    const emailResults: EmailResult[] = [];

    for (const contact of contacts) {
      const emailVariations = this.generateEmailVariations(contact.name, job.company);

      for (const email of emailVariations) {
        const result = await this.verifyEmail(email);

        emailResults.push({
          email,
          name: contact.name,
          title: contact.title,
          verified: result.valid,
          verifaliaStatus: result.status,
        });

        if (result.valid) break; // stop at first deliverable email
      }
    }

    return emailResults.filter((result) => result.verified);
  }
}