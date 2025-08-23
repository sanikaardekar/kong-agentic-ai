import React from 'react';

interface DraftedEmail {
  success: boolean;
  emailSubject: string;
  emailText: string;
}

interface EmailDraftProps {
  draftedEmail: DraftedEmail;
  onClose: () => void;
}

export const EmailDraft: React.FC<EmailDraftProps> = ({ draftedEmail, onClose }) => {
  const copyToClipboard = () => {
    navigator.clipboard.writeText(draftedEmail.emailText);
  };

  return (
    <div className="email-section">
      <h2>Drafted Email</h2>
      <div className="email-card">
        <div className="email-body">
          <pre>{draftedEmail.emailText}</pre>
        </div>
        <div className="email-actions">
          <button onClick={copyToClipboard}>
            Copy Email
          </button>
          <button onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};