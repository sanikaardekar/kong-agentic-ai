import React from 'react';

interface EmailResult {
  email: string;
  name: string;
  title: string;
  verified: boolean;
  verifaliaStatus?: string;
}

interface EmailListProps {
  emails: EmailResult[];
  jobTitle: string;
  companyName: string;
  onClose: () => void;
}

export const EmailList: React.FC<EmailListProps> = ({ emails, jobTitle, companyName, onClose }) => {
  const copyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
  };

  return (
    <div className="email-modal-overlay" onClick={onClose}>
      <div className="email-modal" onClick={(e) => e.stopPropagation()}>
        <div className="email-modal-header">
          <h2>HR Contacts for {jobTitle} at {companyName}</h2>
          <button onClick={onClose} className="close-btn">×</button>
        </div>
        
        {emails.length === 0 ? (
          <div className="no-emails">
            <p>No verified emails found for this company.</p>
            <p>This could be due to:</p>
            <ul>
              <li>Limited LinkedIn search results</li>
              <li>Email verification service credits</li>
              <li>Company domain guessing accuracy</li>
            </ul>
          </div>
        ) : (
          <div className="emails-grid">
            {emails.map((emailResult, index) => (
              <div key={index} className="email-card">
                <div className="contact-info">
                  <h4>{emailResult.name}</h4>
                  <p className="contact-title">{emailResult.title}</p>
                </div>
                <div className="email-info">
                  <div className="email-address">
                    <span>{emailResult.email}</span>
                    <button 
                      onClick={() => copyEmail(emailResult.email)}
                      className="copy-email-btn"
                      title="Copy email"
                    >
                      Copy
                    </button>
                  </div>
                  <div className="verification-status">
                    <span className={`status ${emailResult.verified ? 'verified' : 'unverified'}`}>
                      {emailResult.verified ? '✓ Verified' : '✗ Unverified'}
                    </span>
                    {emailResult.verifaliaStatus && (
                      <span className="verifalia-status">
                        ({emailResult.verifaliaStatus})
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};