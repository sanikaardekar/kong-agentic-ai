export interface Job {
  title: string;
  company: string;
  location: string;
  jobDescription: string;
  applyUrl: string;
  source: string;
}

export interface JobSearchForm {
  jobRole: string;
  experience: string;
  location: string;
  company?: string;
}

export interface DraftedEmail {
  success: boolean;
  emailSubject: string;
  emailText: string;
}