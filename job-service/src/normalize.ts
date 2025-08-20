import type { NormalizedJob } from "./types.js";

export function guessRemote(location?: string, title?: string): boolean {
  const s = `${location ?? ""} ${title ?? ""}`.toLowerCase();
  return /remote|wfh|work\s*from\s*home|anywhere/.test(s);
}

export function normalizeGreenhouseJob(job: any, company: string): NormalizedJob {
  return {
    id: String(job.id),
    title: job.title,
    company,
    location: job?.location?.name ?? undefined,
    remote: guessRemote(job?.location?.name, job?.title),
    applyUrl: job?.absolute_url,
    // description is not available in list endpoint; could be fetched via /jobs/:id if needed
    postedAt: job?.updated_at ?? job?.created_at ?? undefined,
    source: "greenhouse",
    raw: job,
  };
}

export function normalizeLeverJob(job: any, company: string): NormalizedJob {
  return {
    id: String(job.id),
    title: job.text,
    company,
    location: job?.categories?.location ?? undefined,
    remote: guessRemote(job?.categories?.location, job?.text),
    applyUrl: job?.hostedUrl ?? job?.applyUrl,
    postedAt: job?.createdAt ? new Date(job.createdAt).toISOString() : undefined,
    source: "lever",
    raw: job,
  };
}