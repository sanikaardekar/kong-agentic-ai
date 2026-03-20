import React, { useState } from 'react';
import { API_ENDPOINTS } from '../config';

interface DraftedEmail { success: boolean; emailSubject: string; emailText: string; }
interface EmailVersion { id: string; content: string; timestamp: Date; userRequest?: string; }

interface EmailDraftProps {
  draftedEmail: DraftedEmail;
  jobTitle: string;
  companyName: string;
  onClose: () => void;
}

export const EmailDraft: React.FC<EmailDraftProps> = ({ draftedEmail, jobTitle, companyName, onClose }) => {
  const [versions, setVersions] = useState<EmailVersion[]>([{ id: '1', content: draftedEmail.emailText, timestamp: new Date() }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const current = versions[versions.length - 1];

  const copy = () => {
    navigator.clipboard.writeText(`Subject: ${draftedEmail.emailSubject}\n\n${current.content}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const refine = async () => {
    if (!input.trim() || loading) return;
    setLoading(true);
    const req = input;
    setInput('');
    try {
      const res = await fetch(`${API_ENDPOINTS.EMAIL}/email/refine`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentEmail: current.content, userFeedback: req, jobTitle, companyName })
      });
      const data = await res.json();
      setVersions(v => [...v, { id: Date.now().toString(), content: data.refinedEmail, timestamp: new Date(), userRequest: req }]);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <div className="email-modal-overlay" onClick={onClose}>
      <div className="email-modal" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="email-modal-header">
          <div className="email-modal-title">
            <h2>✉️ Draft Email</h2>
            <p>{jobTitle} · {companyName} · v{versions.length}</p>
          </div>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>

        {/* Subject */}
        <div className="email-subject-bar">
          <span className="subject-label">Subject</span>
          <span className="subject-value">{draftedEmail.emailSubject}</span>
        </div>

        {/* Body — all versions */}
        <div className="email-body-scroll">
          {versions.map((v, i) => (
            <div key={v.id}>
              {v.userRequest && (
                <div className="user-request-bubble">
                  <strong>Your request: </strong>{v.userRequest}
                </div>
              )}
              <div className="email-version-label">
                <span className="version-tag">{i === 0 ? 'Original' : `Version ${i + 1}`}</span>
                <span className="version-time">{v.timestamp.toLocaleTimeString()}</span>
              </div>
              <div className="email-text-box">
                <pre>{v.content}</pre>
              </div>
            </div>
          ))}
          {/* Copy button at bottom of latest */}
          <div className="email-copy-row">
            <button className="copy-btn" onClick={copy}>
              {copied ? '✓ Copied!' : '📋 Copy Email'}
            </button>
          </div>
        </div>

        {/* Refine footer */}
        <div className="email-refine-footer">
          <div className="refine-label">Refine with AI</div>
          <div className="refine-row">
            <textarea
              rows={2}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); refine(); } }}
              placeholder="e.g. 'Make it shorter', 'Add my Python skills', 'More formal tone'"
              disabled={loading}
            />
            <button className="refine-submit-btn" onClick={refine} disabled={!input.trim() || loading}>
              {loading ? '...' : 'Refine ✦'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
