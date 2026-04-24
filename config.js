const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost';

module.exports = {
  AGENT: `${API_BASE_URL}:6001`,
  JOB: `${API_BASE_URL}:3000`,
  EMAIL: `${API_BASE_URL}:4000`,
  EMAIL_FINDER: `${API_BASE_URL}:5000`,
};
