const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const aiRoutes = require('./routes/ai');

const app = express();
const PORT = process.env.PORT || 7000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/ai', aiRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'ai-gateway-service',
    timestamp: new Date().toISOString(),
    providers: ['cloudflare', 'openai', 'anthropic']
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('AI Gateway Error:', err);
  res.status(500).json({ 
    error: 'AI Gateway service error',
    message: err.message 
  });
});

app.listen(PORT, () => {
  console.log(`AI Gateway Service running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});