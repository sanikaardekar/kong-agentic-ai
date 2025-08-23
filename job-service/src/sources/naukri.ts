import axios from "axios";
import { normalizeNaukriJob } from "../normalize.js";
import type { NormalizedJob } from "../types.js";

/**
 * Fetch jobs from Naukri using SerpAPI (bypasses bot protection)
 */
export async function fetchNaukriJobs(jobRole: string, location: string, experience?: string): Promise<NormalizedJob[]> {
  try {
    const SERPAPI_KEY = process.env.SERPAPI_KEY;
    if (!SERPAPI_KEY) {
      console.warn("SERPAPI_KEY not set, skipping Naukri jobs");
      return [];
    }

    let searchQuery = `${jobRole} site:naukri.com`;
    if (experience) {
      searchQuery += ` ${experience} years`;
    }
    if (location) {
      searchQuery += ` ${location}`;
    }

    const url = `https://serpapi.com/search.json`;
    const params = {
      engine: "google",
      q: searchQuery,
      location: location,
      api_key: SERPAPI_KEY,
      num: 10
    };

    const { data } = await axios.get(url, { params, timeout: 15000 });
    const results = data.organic_results || [];
    
    // Filter and format Naukri results
    const naukriJobs = results
      .filter((result: any) => result.link && result.link.includes('naukri.com'))
      .map((result: any) => ({
        title: result.title,
        company: extractCompanyFromTitle(result.title),
        location: location,
        description: result.snippet,
        link: result.link
      }));
    
    return naukriJobs.map((job: any) => normalizeNaukriJob(job, jobRole));
  } catch (error) {
    console.error("Naukri SerpAPI error:", error);
    return [];
  }
}

function extractCompanyFromTitle(title: string): string {
  // Extract company name from job title patterns
  const patterns = [
    /at\s+([^-]+?)\s*-/i,
    /\|\s*([^|]+?)\s*$/i,
    /-\s*([^-]+?)\s*$/i
  ];
  
  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }
  
  return "Company not specified";
}