import React, { useState } from 'react';

interface DraftedEmail {
  success: boolean;
  emailSubject: string;
  emailText: string;
}

interface EmailVersion {
  id: string;
  content: string;
  timestamp: Date;
  userRequest?: string;
}

interface EmailDraftProps {
  draftedEmail: DraftedEmail;
  jobTitle: string;
  companyName: string;
  onClose: () => void;
}

export const EmailDraft: React.FC<EmailDraftProps> = ({ 
  draftedEmail, 
  jobTitle, 
  companyName, 
  onClose 
}) => {
  const [emailVersions, setEmailVersions] = useState<EmailVersion[]>([
    {
      id: '1',
      content: draftedEmail.emailText,
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const currentEmail = emailVersions[emailVersions.length - 1];

  const copyToClipboard = () => {
    navigator.clipboard.writeText(currentEmail.content);
  };

  const handleRefineEmail = async () => {
    if (!inputValue.trim() || isLoading) return;

    setIsLoading(true);
    const userRequest = inputValue;
    setInputValue('');

    try {
      const response = await fetch('http://localhost:8000/email/refine', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': 'hackathon-2024-key'
        },
        body: JSON.stringify({
          currentEmail: currentEmail.content,
          userFeedback: userRequest,
          jobTitle,
          companyName
        })
      });

      const data = await response.json();
      
      const newVersion: EmailVersion = {
        id: Date.now().toString(),
        content: data.refinedEmail,
        timestamp: new Date(),
        userRequest
      };

      setEmailVersions(prev => [...prev, newVersion]);
    } catch (error) {
      console.error('Error refining email:', error);
    }
    
    setIsLoading(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleRefineEmail();
    }
  };

  return (
    <div className="email-section">
      <div className="email-header">
        <h2>Email Draft for {jobTitle} at {companyName}</h2>
        <button onClick={onClose} className="close-btn">×</button>
      </div>
      
      <div className="email-versions">
        {emailVersions.map((version, index) => (
          <div key={version.id} className={`email-version ${index === emailVersions.length - 1 ? 'current' : ''}`}>
            {version.userRequest && (
              <div className="user-request">
                <strong>Your request:</strong> {version.userRequest}
              </div>
            )}
            <div className="email-card">
              <div className="version-header">
                <span className="version-label">
                  {index === 0 ? 'Original Draft' : `Version ${index + 1}`}
                </span>
                <span className="timestamp">
                  {version.timestamp.toLocaleTimeString()}
                </span>
              </div>
              <div className="email-body">
                <pre>{version.content}</pre>
              </div>
              {index === emailVersions.length - 1 && (
                <div className="email-actions">
                  <button onClick={copyToClipboard}>
                    Copy Email
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="refine-input">
        <div className="input-header">
          <h3>Refine your email</h3>
          <p>Tell me how you'd like to improve the email above</p>
        </div>
        <div className="input-group">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="e.g., 'Make it more formal', 'Add my Python experience', 'Make it shorter'"
            disabled={isLoading}
            rows={3}
          />
          <button 
            onClick={handleRefineEmail}
            disabled={!inputValue.trim() || isLoading}
            className="refine-btn"
          >
            {isLoading ? 'Refining...' : 'Refine Email'}
          </button>
        </div>
      </div>
    </div>
  );
};