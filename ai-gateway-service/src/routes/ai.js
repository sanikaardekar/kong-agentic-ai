const express = require('express');
const axios = require('axios');
const router = express.Router();

// AI Provider configurations
const AI_PROVIDERS = {
  cloudflare: {
    baseURL: 'https://api.cloudflare.com/client/v4/accounts',
    model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
    headers: (token) => ({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    })
  },
  openai: {
    baseURL: 'https://api.openai.com/v1',
    model: 'gpt-4',
    headers: (token) => ({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    })
  },
  anthropic: {
    baseURL: 'https://api.anthropic.com/v1',
    model: 'claude-3-sonnet-20240229',
    headers: (token) => ({
      'x-api-key': token,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01'
    })
  }
};

// Route AI requests based on provider
router.post('/chat', async (req, res) => {
  try {
    const { message, provider = 'cloudflare', model, options = {} } = req.body;
    const aiProvider = req.headers['x-ai-provider'] || provider;
    
    console.log(`AI Gateway: Routing to ${aiProvider}`);
    
    const response = await routeToProvider(aiProvider, {
      message,
      model,
      options
    });
    
    res.json({
      success: true,
      provider: aiProvider,
      model: response.model,
      response: response.content,
      usage: response.usage
    });
    
  } catch (error) {
    console.error('AI Chat Error:', error.message);
    res.status(500).json({
      success: false,
      error: 'AI processing failed',
      message: error.message
    });
  }
});

// Email generation with AI routing
router.post('/email', async (req, res) => {
  try {
    const { 
      jobTitle, 
      companyName, 
      jobDescription, 
      location, 
      provider = 'cloudflare' 
    } = req.body;
    
    const prompt = `Write a personalized job application email for:
Job Title: ${jobTitle}
Company: ${companyName}
Location: ${location || 'Remote'}
Description: ${jobDescription}

Make it professional, concise (under 200 words), and engaging.
Include placeholders for name and contact info.`;
    
    const response = await routeToProvider(provider, {
      message: prompt,
      options: { max_tokens: 512, temperature: 0.7 }
    });
    
    res.json({
      success: true,
      provider,
      email: response.content,
      usage: response.usage
    });
    
  } catch (error) {
    console.error('AI Email Error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Email generation failed',
      message: error.message
    });
  }
});

// Model switching endpoint
router.post('/switch-model', async (req, res) => {
  try {
    const { provider, model } = req.body;
    
    if (!AI_PROVIDERS[provider]) {
      return res.status(400).json({
        success: false,
        error: 'Unsupported provider',
        available: Object.keys(AI_PROVIDERS)
      });
    }
    
    res.json({
      success: true,
      message: `Switched to ${provider}:${model}`,
      provider,
      model
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Model switch failed',
      message: error.message
    });
  }
});

// Get available providers and models
router.get('/providers', (req, res) => {
  const providers = Object.keys(AI_PROVIDERS).map(name => ({
    name,
    model: AI_PROVIDERS[name].model,
    available: !!getApiKey(name)
  }));
  
  res.json({
    success: true,
    providers
  });
});

// Route request to specific AI provider
async function routeToProvider(provider, { message, model, options = {} }) {
  const config = AI_PROVIDERS[provider];
  if (!config) {
    throw new Error(`Unsupported provider: ${provider}`);
  }
  
  const apiKey = getApiKey(provider);
  if (!apiKey) {
    throw new Error(`API key not configured for ${provider}`);
  }
  
  switch (provider) {
    case 'cloudflare':
      return await callCloudflare(message, model || config.model, options, apiKey);
    case 'openai':
      return await callOpenAI(message, model || config.model, options, apiKey);
    case 'anthropic':
      return await callAnthropic(message, model || config.model, options, apiKey);
    default:
      throw new Error(`Provider ${provider} not implemented`);
  }
}

// Cloudflare AI implementation
async function callCloudflare(message, model, options, apiKey) {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;
  
  const response = await axios.post(url, {
    messages: [{ role: 'user', content: message }],
    max_tokens: options.max_tokens || 1024,
    temperature: options.temperature || 0.7
  }, {
    headers: AI_PROVIDERS.cloudflare.headers(apiKey),
    timeout: 30000
  });
  
  if (!response.data.success) {
    throw new Error('Cloudflare AI request failed');
  }
  
  return {
    content: response.data.result.response,
    model,
    usage: response.data.result.usage || {}
  };
}

// OpenAI implementation
async function callOpenAI(message, model, options, apiKey) {
  const response = await axios.post('https://api.openai.com/v1/chat/completions', {
    model,
    messages: [{ role: 'user', content: message }],
    max_tokens: options.max_tokens || 1024,
    temperature: options.temperature || 0.7
  }, {
    headers: AI_PROVIDERS.openai.headers(apiKey),
    timeout: 30000
  });
  
  return {
    content: response.data.choices[0].message.content,
    model,
    usage: response.data.usage
  };
}

// Anthropic implementation
async function callAnthropic(message, model, options, apiKey) {
  const response = await axios.post('https://api.anthropic.com/v1/messages', {
    model,
    max_tokens: options.max_tokens || 1024,
    messages: [{ role: 'user', content: message }]
  }, {
    headers: AI_PROVIDERS.anthropic.headers(apiKey),
    timeout: 30000
  });
  
  return {
    content: response.data.content[0].text,
    model,
    usage: response.data.usage
  };
}

// Get API key for provider
function getApiKey(provider) {
  switch (provider) {
    case 'cloudflare':
      return process.env.CLOUDFLARE_API_TOKEN;
    case 'openai':
      return process.env.OPENAI_API_KEY;
    case 'anthropic':
      return process.env.ANTHROPIC_API_KEY;
    default:
      return null;
  }
}

module.exports = router;