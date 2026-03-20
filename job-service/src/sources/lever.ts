import axios from "axios";
import { normalizeLeverJob } from "../normalize.js";
import type { NormalizedJob } from "../types.js";

/**
 * Fetch jobs from Lever Postings API using the company handle.
 * Endpoint: https://api.lever.co/v0/postings/{company}?mode=json
 */
export async function fetchLeverJobs(companyHandle: string): Promise<NormalizedJob[]> {
  const url = `https://api.lever.co/v0/postings/${encodeURIComponent(companyHandle)}?mode=json`;
  const { data } = await axios.get(url, { timeout: 15000 });
  const jobs = Array.isArray(data) ? data : [];
  return jobs.map((j: any) => normalizeLeverJob(j, companyHandle));
}