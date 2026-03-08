import React, { useState } from 'react';
import { API_ENDPOINTS } from '../config';

interface AgentChatProps {
  onResponse: (response: string) => void;
}

export const AgentChat: React.FC<AgentChatProps> = ({ onResponse }) => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_ENDPOINTS.AGENT}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: input })
      });

      const data = await response.json();
      if (data.success) {
        onResponse(data.response);
      } else {
        onResponse('Sorry, I encountered an error processing your request.');
      }
    } catch (error) {
      onResponse('Sorry, I could not connect to the agent service.');
    } finally {
      setLoading(false);
      setInput('');
    }
  };

  return (
    <div className="agent-chat">
      <h2>AI Job Assistant</h2>
      <p>Ask me to search jobs, find recruiter emails, or draft application emails!</p>
      
      <form onSubmit={handleSubmit} className="chat-form">
        <div className="input-group">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g., 'Find software engineer jobs in Mumbai' or 'Get recruiter emails for Google'"
            disabled={loading}
            className="chat-input"
          />
          <button type="submit" disabled={loading || !input.trim()} className="send-btn">
            {loading ? 'Processing...' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  );
};