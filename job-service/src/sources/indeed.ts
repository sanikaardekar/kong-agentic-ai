import axios from "axios";
import { normalizeIndeedJob } from "../normalize.js";
import type { NormalizedJob } from "../types.js";

export async function fetchIndeedJobs(jobRole: string, location: string, experience?: string): Promise<NormalizedJob[]> {
  try {
    const SERPAPI_KEY = process.env.SERPAPI_KEY;
    if (!SERPAPI_KEY) {
      console.warn("SERPAPI_KEY not set, skipping Indeed jobs");
      return [];
    }

    let searchQuery = jobRole;
    if (experience) {
      searchQuery += ` ${experience} years experience`;
    }

    const url = `https://serpapi.com/search.json`;
    const params = {
      engine: "google_jobs",
      q: searchQuery,
      location: location,
      api_key: SERPAPI_KEY
    };

    const { data } = await axios.get(url, { params, timeout: 15000 });
    const jobs = data.jobs_results || [];
    
    return jobs.map((job: any) => normalizeIndeedJob(job, jobRole));
  } catch (error) {
    console.error("Indeed SerpAPI error:", error);
    return [];
  }
}