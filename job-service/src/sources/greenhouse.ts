import axios from "axios";
import { normalizeGreenhouseJob } from "../normalize.js";
import type { NormalizedJob } from "../types.js";

/**
 * Fetch jobs from Greenhouse Job Board API using the board token, e.g. token for https://boards.greenhouse.io/<token>
 * Endpoint: https://boards-api.greenhouse.io/v1/boards/{board_token}/jobs
 */
export async function fetchGreenhouseJobs(boardToken: string): Promise<NormalizedJob[]> {
  const url = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(boardToken)}/jobs`;
  const { data } = await axios.get(url, { timeout: 15000 });
  const jobs = Array.isArray(data?.jobs) ? data.jobs : [];
  return jobs.map((j: any) => normalizeGreenhouseJob(j, boardToken));
}