export type Source = "greenhouse" | "lever" | "indeed" | "naukri";

export interface NormalizedJob {
  id: string;
  title: string;
  company: string;
  location: string;
  remote?: boolean;
  applyUrl?: string;
  descriptionHtml?: string;
  postedAt?: string; // ISO string if available
  source: Source;
  raw?: unknown; // original payload (optional for debugging)
}