import axios from "axios";

/**
 * Fetch individual job details from Greenhouse Job Board API
 * Endpoint: https://boards-api.greenhouse.io/v1/boards/{board_token}/jobs/{job_id}
 */
export async function fetchGreenhouseJobDetail(boardToken: string, jobId: string): Promise<any> {
  const url = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(boardToken)}/jobs/${encodeURIComponent(jobId)}`;
  const { data } = await axios.get(url, { timeout: 15000 });
  return data;
}