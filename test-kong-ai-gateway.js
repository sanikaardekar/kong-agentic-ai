const axios = require('axios');

const KONG_AI_GATEWAY_URL = 'http://localhost:8000';
const API_KEY = 'hackathon-2024-key';

async function testKongAIGateway() {
  console.log('🧪 Testing Kong AI Gateway Integration...\n');

  // Test 1: Get available AI providers
  try {
    console.log('1️⃣ Testing AI Providers Endpoint...');
    const providersResponse = await axios.get(`${KONG_AI_GATEWAY_URL}/ai/providers`, {
      headers: { 'apikey': API_KEY }
    });
    
    console.log('✅ Available AI Providers:');
    providersResponse.data.providers.forEach(provider => {
      console.log(`   - ${provider.name}: ${provider.model} (Available: ${provider.available})`);
    });
    console.log();
  } catch (error) {
    console.log('❌ Providers test failed:', error.message);
  }

  // Test 2: Chat with Cloudflare AI via Kong AI Gateway
  try {
    console.log('2️⃣ Testing AI Chat with Cloudflare...');
    const chatResponse = await axios.post(`${KONG_AI_GATEWAY_URL}/ai/chat`, {
      message: "Hello! Can you help me find a software engineering job?",
      provider: "cloudflare",
      options: {
        max_tokens: 100,
        temperature: 0.7
      }
    }, {
      headers: { 
        'apikey': API_KEY,
        'Content-Type': 'application/json',
        'X-AI-Provider': 'cloudflare'
      }
    });
    
    console.log('✅ Cloudflare AI Response:');
    console.log(`   Provider: ${chatResponse.data.provider}`);
    console.log(`   Model: ${chatResponse.data.model}`);
    console.log(`   Response: ${chatResponse.data.response.substring(0, 100)}...`);
    console.log();
  } catch (error) {
    console.log('❌ Cloudflare chat test failed:', error.response?.data || error.message);
  }

  // Test 3: Email generation via Kong AI Gateway
  try {
    console.log('3️⃣ Testing AI Email Generation...');
    const emailResponse = await axios.post(`${KONG_AI_GATEWAY_URL}/ai/email`, {
      jobTitle: "Senior Software Engineer",
      companyName: "Google",
      location: "Mountain View, CA",
      jobDescription: "We are looking for a senior software engineer to join our team.",
      provider: "cloudflare"
    }, {
      headers: { 
        'apikey': API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Email Generation Response:');
    console.log(`   Provider: ${emailResponse.data.provider}`);
    console.log(`   Email Preview: ${emailResponse.data.email.substring(0, 150)}...`);
    console.log();
  } catch (error) {
    console.log('❌ Email generation test failed:', error.response?.data || error.message);
  }

  // Test 4: Model switching
  try {
    console.log('4️⃣ Testing Model Switching...');
    const switchResponse = await axios.post(`${KONG_AI_GATEWAY_URL}/ai/switch-model`, {
      provider: "openai",
      model: "gpt-4"
    }, {
      headers: { 
        'apikey': API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Model Switch Response:');
    console.log(`   Message: ${switchResponse.data.message}`);
    console.log(`   New Provider: ${switchResponse.data.provider}`);
    console.log(`   New Model: ${switchResponse.data.model}`);
    console.log();
  } catch (error) {
    console.log('❌ Model switch test failed:', error.response?.data || error.message);
  }

  // Test 5: Agent service via Kong AI Gateway
  try {
    console.log('5️⃣ Testing Agent Service Integration...');
    const agentResponse = await axios.post(`${KONG_AI_GATEWAY_URL}/chat`, {
      message: "Find React developer jobs in San Francisco"
    }, {
      headers: { 
        'apikey': API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Agent Service Response:');
    console.log(`   Status: ${agentResponse.data.success ? 'Success' : 'Failed'}`);
    console.log(`   Response: ${agentResponse.data.response?.substring(0, 100) || 'No response'}...`);
    console.log();
  } catch (error) {
    console.log('❌ Agent service test failed:', error.response?.data || error.message);
  }

  console.log('🏁 Kong AI Gateway testing completed!');
}

// Run tests
testKongAIGateway().catch(console.error);