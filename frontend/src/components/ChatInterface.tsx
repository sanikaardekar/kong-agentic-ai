import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, ChatSession } from '../types/chat';

interface ChatInterfaceProps {
  chatSession: ChatSession;
  onUpdateEmail: (newEmail: string) => void;
  onClose: () => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  chatSession,
  onUpdateEmail,
  onClose
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(chatSession.messages);
  const [currentEmail, setCurrentEmail] = useState(chatSession.currentEmail);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:8000/email/refine', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': 'hackathon-2024-key'
        },
        body: JSON.stringify({
          currentEmail: currentEmail,
          userFeedback: inputValue,
          jobTitle: chatSession.jobTitle,
          companyName: chatSession.companyName
        })
      });

      const data = await response.json();
      
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: 'I\'ve updated your email based on your feedback.',
        timestamp: new Date(),
        emailContent: data.refinedEmail
      };

      setMessages(prev => [...prev, assistantMessage]);
      setCurrentEmail(data.refinedEmail);
      onUpdateEmail(data.refinedEmail);
    } catch (error) {
      console.error('Error refining email:', error);
    }
    
    setIsLoading(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="chat-interface">
      <div className="chat-header">
        <h3>Email Refinement Chat</h3>
        <button onClick={onClose} className="close-btn">×</button>
      </div>
      
      <div className="chat-messages">
        <div className="current-email-preview">
          <h4>Current Email:</h4>
          <pre>{currentEmail}</pre>
        </div>
        {messages.map((message) => (
          <div key={message.id} className={`message ${message.type}`}>
            <div className="message-content">
              {message.content}
            </div>
            <div className="message-time">
              {message.timestamp.toLocaleTimeString()}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="message assistant loading">
            <div className="message-content">Updating your email...</div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input">
        <textarea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ask me to modify the email (e.g., 'Make it more formal' or 'Add my Python experience')"
          disabled={isLoading}
        />
        <button 
          onClick={handleSendMessage}
          disabled={!inputValue.trim() || isLoading}
          className="send-btn"
        >
          Send
        </button>
      </div>
    </div>
  );
};