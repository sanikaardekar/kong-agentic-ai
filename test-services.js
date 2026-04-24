const axios = require('axios');
const API = require('./config');

const services = [
  { name: 'Agent Service', url: `${API.AGENT}/health` },
  { name: 'Job Service', url: `${API.JOB}/health` },
  { name: 'Email Service', url: `${API.EMAIL}/health` },
  { name: 'Email Finder', url: `${API.EMAIL_FINDER}/health` }
];

async function testServices() {
  console.log('Testing all services...\n');
  
  for (const service of services) {
    try {
      const response = await axios.get(service.url, { timeout: 5000 });
      console.log(`✓ ${service.name}: OK - ${JSON.stringify(response.data)}`);
    } catch (error) {
      console.log(`✗ ${service.name}: FAILED - ${error.message}`);
    }
  }
  
  console.log('\nTesting Agent Chat endpoint...');
  try {
    const response = await axios.post(`${API.AGENT}/chat`, {
      message: 'Hello'
    }, { timeout: 10000 });
    console.log('✓ Agent Chat: OK'+ JSON.stringify(response.data));
  } catch (error) {
    console.log(`✗ Agent Chat: FAILED - ${error.message}`);
  }
}

testServices();
