const axios = require('axios');
const API = require('./config');

async function testAgent() {
  console.log('Testing Agent Service...\n');
  
  const tests = [
    { name: 'Health Check', url: `${API.AGENT}/health`, method: 'get' },
    { name: 'Job Search', url: `${API.AGENT}/chat`, method: 'post', data: { message: 'Find React jobs in Mumbai' } },
    { name: 'Email Finder', url: `${API.AGENT}/chat`, method: 'post', data: { message: 'Get recruiter emails for Google' } },
    { name: 'Email Draft', url: `${API.AGENT}/chat`, method: 'post', data: { message: 'Draft email for software engineer at Netflix' } }
  ];
  
  for (const test of tests) {
    try {
      console.log(`\n${test.name}:`);
      const response = test.method === 'get' 
        ? await axios.get(test.url)
        : await axios.post(test.url, test.data);
      
      console.log('✓ Success');
      console.log(JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.log('✗ Failed:', error.message);
    }
  }
}

testAgent();
