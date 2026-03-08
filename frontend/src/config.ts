const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost';

export const API_ENDPOINTS = {
  AGENT: `${API_BASE_URL}:6001`,
  JOB: `${API_BASE_URL}:3000`,
  EMAIL: `${API_BASE_URL}:4000`,
  EMAIL_FINDER: `${API_BASE_URL}:5000`,
};
