import React, { useState, useEffect } from 'react';

interface Email {
  email: string;
  confidence: 'high' | 'medium' | 'low';
  source: string;
}

interface EmailPopupProps {
  company: string;
  onClose: () => void;
  onCopyEmail: (email: string) => void;
}

export const EmailPopup: React.FC<EmailPopupProps> = ({ company, onClose, onCopyEmail }) => {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEmails = async () => {
      try {
        const response = await fetch('http://localhost:8000/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': 'hackathon-2024-key'
          },
          body: JSON.stringify({ company })
        });
        
        if (!response.ok) throw new Error('Failed to fetch emails');
        
        const data = await response.json();
        setEmails(data.emails || []);
      } catch (err) {
        setError('Failed to load emails');
        console.error('Email fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchEmails();
  }, [company]);

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return '#4CAF50';
      case 'medium': return '#FF9800';
      case 'low': return '#f44336';
      default: return '#757575';
    }
  };

  return (
    <div className="email-popup-overlay" onClick={onClose}>
      <div className="email-popup" onClick={e => e.stopPropagation()}>
        <div className="popup-header">
          <h3>Contact {company}</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="popup-content">
          {loading && <div className="loading">Finding emails...</div>}
          
          {error && <div className="error">{error}</div>}
          
          {!loading && !error && emails.length === 0 && (
            <div className="no-emails">No emails found for {company}</div>
          )}
          
          {emails.length > 0 && (
            <div className="emails-list">
              <p className="emails-count">Found {emails.length} potential contacts:</p>
              {emails.map((email, index) => (
                <div key={index} className="email-item">
                  <div className="email-info">
                    <span className="email-address">{email.email}</span>
                    <span 
                      className="confidence-badge"
                      style={{ backgroundColor: getConfidenceColor(email.confidence) }}
                    >
                      {email.confidence}
                    </span>
                    <span className="source-badge">{email.source}</span>
                  </div>
                  <button 
                    className="copy-email-btn"
                    onClick={() => onCopyEmail(email.email)}
                  >
                    Copy Email
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};