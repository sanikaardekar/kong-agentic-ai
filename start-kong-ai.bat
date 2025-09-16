@echo off
echo 🚀 Starting Kong AI Gateway - Agentic Job Search Assistant
echo.
echo 🏗️  Architecture:
echo    ├── Kong AI Gateway (Port 8000) - Multi-provider AI routing
echo    ├── AI Gateway Service (Port 7000) - AI orchestration
echo    ├── Agent Service (Port 6000) - LangChain integration
echo    ├── Job Service (Port 3000) - Job search
echo    ├── Email Service (Port 4000) - Email drafting
echo    ├── Email Finder (Port 5000) - Recruiter discovery
echo    └── Frontend (Port 3001) - React UI
echo.
echo 🤖 AI Providers:
echo    ├── Cloudflare AI (Llama 3.3 70B) - Primary
echo    ├── OpenAI (GPT-4) - Fallback
echo    └── Anthropic (Claude 3) - Alternative
echo.
echo 📋 Starting services...

docker-compose up -d

echo.
echo ✅ Services started! Access points:
echo    🌐 Frontend: http://localhost:3001
echo    🚪 Kong AI Gateway: http://localhost:8000
echo    🤖 AI Chat: http://localhost:8000/ai/chat
echo    📧 AI Email: http://localhost:8000/ai/email
echo    🔄 AI Providers: http://localhost:8000/ai/providers
echo    💊 Health Check: http://localhost:8000/health
echo.
echo 🧪 Test Commands:
echo    node test-kong-ai-gateway.js
echo.
echo 💬 Try these in the chat:
echo    "Find React jobs in Mumbai"
echo    "Switch to OpenAI for better responses"
echo    "Draft email for Google software engineer position using Claude"
echo.
pause