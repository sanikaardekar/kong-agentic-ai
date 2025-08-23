import React, { useState } from 'react';
import './App.css';
import { SearchForm } from './components/SearchForm';
import { JobCard } from './components/JobCard';
import { EmailDraft } from './components/EmailDraft';
import { Job, JobSearchForm, DraftedEmail } from './types';

function App() {
  const [form, setForm] = useState<JobSearchForm>({
    jobRole: '',
    experience: '',
    location: '',
    company: ''
  });
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [draftedEmail, setDraftedEmail] = useState<DraftedEmail | null>(null);
  const [draftingJobId, setDraftingJobId] = useState<number | null>(null);
  const [emailPanelWidth, setEmailPanelWidth] = useState(500);
  const [isResizing, setIsResizing] = useState(false);

  const searchJobs = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3000/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': 'hackathon-2024-key'
        },
        body: JSON.stringify(form)
      });
      const data = await response.json();
      setJobs(data.jobs || []);
    } catch (error) {
      console.error('Error searching jobs:', error);
    }
    setLoading(false);
  };

  const draftEmail = async (job: Job, index: number) => {
    setDraftingJobId(index);
    try {
      const response = await fetch('http://localhost:4000/draft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': 'hackathon-2024-key'
        },
        body: JSON.stringify({
          jobTitle: job.title,
          companyName: job.company,
          location: job.location,
          jobDescription: job.jobDescription,
          applyUrl: job.applyUrl,
          userProfile: "Software Engineer with experience in modern web technologies, passionate about building scalable applications.",
          source: job.source
        })
      });
      const data = await response.json();
      setDraftedEmail(data);
    } catch (error) {
      console.error('Error drafting email:', error);
    }
    setDraftingJobId(null);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();
  };

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = Math.min(Math.max(e.clientX, 300), 700);
      setEmailPanelWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  return (
    <div className="app">
      <div 
        className={`email-panel ${!draftedEmail ? 'hidden' : ''}`}
        style={{ width: draftedEmail ? `${emailPanelWidth}px` : 0 }}
      >
        {draftedEmail && (
          <>
            <EmailDraft 
              draftedEmail={draftedEmail}
              onClose={() => setDraftedEmail(null)}
            />
            <div 
              className="resize-handle"
              onMouseDown={handleMouseDown}
            />
          </>
        )}
      </div>
      
      <div className="main-panel">
        <div className="container">
          <h1>Job Helper Agent</h1>
          
          <SearchForm 
            form={form}
            setForm={setForm}
            onSearch={searchJobs}
            loading={loading}
          />

          {jobs.length > 0 && (
            <div className="jobs-section">
              <h2>Found {jobs.length} Jobs</h2>
              {jobs.map((job, index) => (
                <JobCard
                  key={index}
                  job={job}
                  index={index}
                  onDraftEmail={draftEmail}
                  draftingJobId={draftingJobId}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;