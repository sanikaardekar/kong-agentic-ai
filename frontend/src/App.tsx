import React, { useState } from 'react';
import './App.css';
import { JobCard } from './components/JobCard';
import { EmailDraft } from './components/EmailDraft';
import { EmailPopup } from './components/EmailPopup';
import { Job, JobSearchForm, DraftedEmail } from './types';
import { API_ENDPOINTS } from './config';

type MainTab = 'search' | 'linkedin';
type SearchSubTab = 'ai' | 'manual';

function App() {
  const [mainTab, setMainTab] = useState<MainTab>('search');
  const [searchSubTab, setSearchSubTab] = useState<SearchSubTab>('ai');

  // AI search
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [agentResponse, setAgentResponse] = useState('');
  const [agentJobs, setAgentJobs] = useState<Job[]>([]);

  // Manual search
  const [form, setForm] = useState<JobSearchForm>({ jobRole: '', experience: '', location: '', company: '' });
  const [manualLoading, setManualLoading] = useState(false);
  const [manualJobs, setManualJobs] = useState<Job[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  // LinkedIn scraped
  const [scrapedJobs, setScrapedJobs] = useState<Job[]>([]);
  const [scrapedLoading, setScrapedLoading] = useState(false);
  const [scrapedLoaded, setScrapedLoaded] = useState(false);

  // Email draft modal
  const [draftedEmail, setDraftedEmail] = useState<DraftedEmail | null>(null);
  const [draftingJobId, setDraftingJobId] = useState<number | null>(null);
  const [currentJob, setCurrentJob] = useState<Job | null>(null);

  // Email popup
  const [showEmailPopup, setShowEmailPopup] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState('');

  const handleAiSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiInput.trim() || aiLoading) return;
    setAiLoading(true);
    setAgentResponse('');
    setAgentJobs([]);
    try {
      const res = await fetch(`${API_ENDPOINTS.AGENT}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: aiInput })
      });
      const data = await res.json();
      if (data.success) {
        setAgentResponse(data.response);
        setAgentJobs(data.jobs ?? []);
      }
    } catch (err) {
      setAgentResponse('Could not connect to agent service.');
    }
    setAiLoading(false);
    setAiInput('');
  };

  const handleManualSearch = async () => {
    setManualLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`${API_ENDPOINTS.JOB}/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      setManualJobs(data.jobs || []);
      setMessage(data.message || null);
    } catch (err) {
      console.error(err);
    }
    setManualLoading(false);
  };

  const handleLoadScraped = async () => {
    setScrapedLoading(true);
    try {
      const res = await fetch(`${API_ENDPOINTS.JOB}/mongoData`);
      const data = await res.json();
      setScrapedJobs(data.jobs || []);
      setScrapedLoaded(true);
    } catch (err) {
      console.error(err);
    }
    setScrapedLoading(false);
  };

  const draftEmail = async (job: Job, index: number) => {
    setDraftingJobId(index);
    setCurrentJob(job);
    try {
      const res = await fetch(`${API_ENDPOINTS.EMAIL}/email/draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobTitle: job.title,
          companyName: job.company,
          location: job.location,
          jobDescription: job.jobDescription,
          applyUrl: job.applyUrl,
          userProfile: 'Software Engineer with experience in modern web technologies.',
          source: job.source
        })
      });
      const data = await res.json();
      setDraftedEmail(data);
    } catch (err) {
      console.error(err);
    }
    setDraftingJobId(null);
  };

  const jobs = searchSubTab === 'ai' ? agentJobs : manualJobs;
  const jobsLoading = searchSubTab === 'ai' ? aiLoading : manualLoading;

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <div className="header-brand">
          <div className="logo">🤖</div>
          <div>
            <h1>AI Job Assistant</h1>
            <div className="header-subtitle">Powered by Paprika AI</div>
          </div>
        </div>
      </header>

      {/* Main Tabs */}
      <div className="tabs">
        <button className={`tab-btn ${mainTab === 'search' ? 'active' : ''}`} onClick={() => setMainTab('search')}>
          🔍 Search Jobs
          {jobs.length > 0 && <span className="tab-badge">{jobs.length}</span>}
        </button>
        <button className={`tab-btn ${mainTab === 'linkedin' ? 'active' : ''}`} onClick={() => setMainTab('linkedin')}>
          💼 LinkedIn Scraped
          {scrapedJobs.length > 0 && <span className="tab-badge green">{scrapedJobs.length}</span>}
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">

        {/* ── Search Tab ── */}
        <div className={`tab-pane ${mainTab === 'search' ? 'active' : ''}`}>
          <div className="search-tab">

            {/* Top controls */}
            <div className="search-top">
              <div className="search-top-inner">
                <div className="search-subtabs">
                  <button className={`subtab-btn ${searchSubTab === 'ai' ? 'active' : ''}`} onClick={() => setSearchSubTab('ai')}>
                    🤖 AI Search
                  </button>
                  <button className={`subtab-btn ${searchSubTab === 'manual' ? 'active' : ''}`} onClick={() => setSearchSubTab('manual')}>
                    🔧 Manual Search
                  </button>
                </div>

                {searchSubTab === 'ai' ? (
                  <form className="ai-search-bar" onSubmit={handleAiSearch}>
                    <input
                      value={aiInput}
                      onChange={e => setAiInput(e.target.value)}
                      placeholder="e.g. 'Find React developer jobs in Mumbai' or 'Get recruiter emails for Google'"
                      disabled={aiLoading}
                    />
                    <button type="submit" className="ai-send-btn" disabled={aiLoading || !aiInput.trim()}>
                      {aiLoading ? 'Thinking...' : '✦ Ask AI'}
                    </button>
                  </form>
                ) : (
                  <div className="manual-search-bar">
                    <input placeholder="Job Role (e.g. Software Engineer)" value={form.jobRole} onChange={e => setForm({ ...form, jobRole: e.target.value })} />
                    <select value={form.experience} onChange={e => setForm({ ...form, experience: e.target.value })}>
                      <option value="">Experience</option>
                      <option value="0-1">0–1 yrs</option>
                      <option value="1-2">1–2 yrs</option>
                      <option value="2-3">2–3 yrs</option>
                      <option value="3-4">3–4 yrs</option>
                      <option value="4-5">4–5 yrs</option>
                    </select>
                    <input placeholder="Location (e.g. Mumbai)" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
                    <input placeholder="Company (optional)" value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} />
                    <button className="manual-search-btn" onClick={handleManualSearch} disabled={manualLoading || !form.jobRole || !form.experience || !form.location}>
                      {manualLoading ? 'Searching...' : 'Search'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Agent response banner */}
            {agentResponse && searchSubTab === 'ai' && (
              <div style={{ padding: '12px 32px 0', maxWidth: '964px', margin: '0 auto', width: '100%' }}>
                <div className="agent-response-banner">
                  <span className="ai-icon">🤖</span>
                  <p>{agentResponse}</p>
                </div>
              </div>
            )}

            {message && searchSubTab === 'manual' && (
              <div style={{ padding: '12px 32px 0' }}>
                <div className="message">{message}</div>
              </div>
            )}

            {/* Jobs list */}
            <div className="jobs-scroll">
              <div className="jobs-inner">
                {jobs.length > 0 ? (
                  <>
                    <div className="jobs-list-header">
                      <h2>
                        Results
                        <span className="count-pill">{jobs.length}</span>
                      </h2>
                      <span className={`source-pill ${searchSubTab === 'ai' ? 'live' : 'live'}`}>
                        {searchSubTab === 'ai' ? 'AI Search' : 'Live Search'}
                      </span>
                    </div>
                    {jobs.map((job, i) => (
                      <JobCard key={i} job={job} index={i} onDraftEmail={draftEmail} draftingJobId={draftingJobId} onFindEmails={c => { setSelectedCompany(c); setShowEmailPopup(true); }} />
                    ))}
                  </>
                ) : !jobsLoading ? (
                  <div className="empty-state">
                    <div className="empty-icon">{searchSubTab === 'ai' ? '🤖' : '🔍'}</div>
                    <h3>{searchSubTab === 'ai' ? 'Ask the AI to find jobs' : 'Search for jobs'}</h3>
                    <p>{searchSubTab === 'ai' ? 'Try: "Find React developer jobs in Bangalore"' : 'Fill in the fields above and hit Search'}</p>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {/* ── LinkedIn Tab ── */}
        <div className={`tab-pane ${mainTab === 'linkedin' ? 'active' : ''}`}>
          <div className="linkedin-tab">
            <div className="linkedin-header">
              <div className="linkedin-header-inner">
                <div className="linkedin-header-text">
                  <h2>💼 LinkedIn Scraped Jobs</h2>
                  <p>Jobs collected by the scraper from LinkedIn and stored in MongoDB</p>
                </div>
                <button className="load-scraped-btn" onClick={handleLoadScraped} disabled={scrapedLoading}>
                  {scrapedLoading ? '⏳ Loading...' : scrapedLoaded ? '🔄 Refresh' : '⬇ Load Jobs'}
                </button>
              </div>
            </div>

            <div className="jobs-scroll">
              <div className="jobs-inner">
                {scrapedJobs.length > 0 ? (
                  <>
                    <div className="jobs-list-header">
                      <h2>LinkedIn Jobs <span className="count-pill green">{scrapedJobs.length}</span></h2>
                      <span className="source-pill linkedin">LinkedIn Scraper</span>
                    </div>
                    {scrapedJobs.map((job, i) => (
                      <JobCard key={i} job={job} index={i} onDraftEmail={draftEmail} draftingJobId={draftingJobId} onFindEmails={c => { setSelectedCompany(c); setShowEmailPopup(true); }} />
                    ))}
                  </>
                ) : (
                  <div className="empty-state">
                    <div className="empty-icon">💼</div>
                    <h3>{scrapedLoaded ? 'No scraped jobs found' : 'Load LinkedIn jobs'}</h3>
                    <p>{scrapedLoaded ? 'Run the scraper to populate jobs' : 'Click "Load Jobs" to fetch from MongoDB'}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Email Draft Modal */}
      {draftedEmail && currentJob && (
        <EmailDraft
          draftedEmail={draftedEmail}
          jobTitle={currentJob.title}
          companyName={currentJob.company}
          onClose={() => setDraftedEmail(null)}
        />
      )}

      {/* Recruiter Email Popup */}
      {showEmailPopup && (
        <EmailPopup
          company={selectedCompany}
          onClose={() => setShowEmailPopup(false)}
          onCopyEmail={email => { navigator.clipboard.writeText(email); }}
        />
      )}
    </div>
  );
}

export default App;
