import React from 'react';

interface Job {
  title: string;
  company: string;
  location: string;
  jobDescription: string;
  applyUrl: string;
  source: string;
}

interface JobCardProps {
  job: Job;
  index: number;
  onDraftEmail: (job: Job, index: number) => void;
  draftingJobId: number | null;
  onFindEmails: (company: string) => void;
}

export const JobCard: React.FC<JobCardProps> = ({ job, index, onDraftEmail, draftingJobId, onFindEmails }) => {
  return (
    <div className="job-card">
      <div className="job-header">
        <h3>{job.title}</h3>
        <span className="company">{job.company}</span>
        <span className="location">{job.location}</span>
        <span className="source">via {job.source}</span>
      </div>
      <div className="job-description">
        <p>{job.jobDescription.substring(0, 200)}...</p>
      </div>
      <div className="job-actions">
        <a href={job.applyUrl} target="_blank" rel="noopener noreferrer" className="apply-btn">
          View Job
        </a>
        <button 
          onClick={() => onDraftEmail(job, index)}
          disabled={draftingJobId === index}
          className="draft-btn"
        >
          {draftingJobId === index ? 'Drafting...' : 'Draft Email'}
        </button>
        <button 
          onClick={() => onFindEmails(job.company)}
          className="find-emails-btn"
        >
          Get Recruiter Emails
        </button>
      </div>
    </div>
  );
};