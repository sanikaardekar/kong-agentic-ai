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
    descriptionHtml: job?.description || job?.descriptionBody,
    postedAt: job?.createdAt ? new Date(job.createdAt).toISOString() : undefined,
    source: "lever",
    raw: job,
  };
}

export function normalizeIndeedJob(job: any, query: string): NormalizedJob {
  return {
    id: String(job.job_id || job.id || Math.random().toString(36)),
    title: job.title,
    company: job.company_name,
    location: job.location,
    remote: guessRemote(job.location, job.title),
    applyUrl: job.apply_options?.[0]?.link || job.share_link,
    descriptionHtml: job.description,
    postedAt: job.detected_extensions?.posted_at,
    source: "indeed",
    raw: job,
  };
}

export function normalizeNaukriJob(job: any, keywords: string): NormalizedJob {
  return {
    id: String(job.jobId || Math.random().toString(36)),
    title: job.title,
    company: job.company,
    location: job.location,
    remote: guessRemote(job.location, job.title),
    applyUrl: job.link,
    descriptionHtml: job.description,
    source: "naukri",
    raw: job,
  };
}

