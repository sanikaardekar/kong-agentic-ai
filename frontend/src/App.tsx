import React, { useState } from 'react';
import './App.css';
import { SearchForm } from './components/SearchForm';
import { JobCard } from './components/JobCard';
import { EmailDraft } from './components/EmailDraft';
import { EmailPopup } from './components/EmailPopup';
import { AgentChat } from './components/AgentChat';
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
  const [message, setMessage] = useState<string | null>(null);
  const [draftedEmail, setDraftedEmail] = useState<DraftedEmail | null>(null);
  const [draftingJobId, setDraftingJobId] = useState<number | null>(null);
  const [currentJob, setCurrentJob] = useState<Job | null>(null);
  const [emailPanelWidth, setEmailPanelWidth] = useState(500);
  const [isResizing, setIsResizing] = useState(false);
  const [showEmailPopup, setShowEmailPopup] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [agentResponse, setAgentResponse] = useState<string>('');

  const searchJobs = async () => {
    setLoading(true);
    setDraftedEmail(null); // Clear email panel when searching
    try {
      const response = await fetch('http://localhost:8000/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': 'hackathon-2024-key'
        },
        body: JSON.stringify(form)
      });
      const data = await response.json();
      setJobs(data.jobs || []);
      setMessage(data.message || null);
    } catch (error) {
      console.error('Error searching jobs:', error);
    }
    setLoading(false);
  };

  const draftEmail = async (job: Job, index: number) => {
    setDraftingJobId(index);
    setCurrentJob(job);
    try {
      const response = await fetch('http://localhost:8000/email/draft', {
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

  const handleFindEmails = (company: string) => {
    setSelectedCompany(company);
    setShowEmailPopup(true);
  };

  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    alert(`Email copied: ${email}`);
  };

  const handleAgentResponse = (response: string) => {
    setAgentResponse(response);
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
              jobTitle={currentJob?.title || ''}
              companyName={currentJob?.company || ''}
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
          <h1>AI Job Assistant</h1>
          
          <AgentChat onResponse={handleAgentResponse} />
          
          {agentResponse && (
            <div className="agent-response">
              <h3>Assistant Response:</h3>
              <div className="response-content">
                {agentResponse.split('\n').map((line, index) => {
                  // Check if line contains a URL
                  const urlRegex = /(https?:\/\/[^\s]+)/;
                  const match = line.match(urlRegex);
                  
                  if (match) {
                    const url = match[1];
                    const parts = line.split(url);
                    return (
                      <div key={index} style={{ marginBottom: '4px' }}>
                        {parts[0]}
                        <a 
                          href={url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="job-link"
                          style={{
                            backgroundColor: '#ff4500',
                            color: 'white',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            textDecoration: 'none',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            marginLeft: '8px'
                          }}
                        >
                          Apply Here
                        </a>
                        {parts[1]}
                      </div>
                    );
                  }
                  
                  return (
                    <div key={index} style={{ marginBottom: '4px' }}>
                      {line || '\u00A0'}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          <div className="manual-search">
            <h3>Manual Search (Optional)</h3>
            <SearchForm 
              form={form}
              setForm={setForm}
              onSearch={searchJobs}
              loading={loading}
            />
          </div>

          {message && (
            <div className="message">
              {message}
            </div>
          )}

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
                  onFindEmails={handleFindEmails}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      
      {showEmailPopup && (
        <EmailPopup
          company={selectedCompany}
          onClose={() => setShowEmailPopup(false)}
          onCopyEmail={handleCopyEmail}
        />
      )}
    </div>
  );
}

export default App;