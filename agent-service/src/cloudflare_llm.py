import os
import requests
from typing import List, Optional, Any
from langchain.llms.base import LLM
from langchain.callbacks.manager import CallbackManagerForLLMRun

class KongAIGatewayLLM(LLM):
    """Kong AI Gateway LLM wrapper for LangChain with multi-provider support."""
    
    gateway_url: str = "http://localhost:8000"
    api_key: str = "hackathon-2024-key"
    provider: str = "cloudflare"
    model: str = "@cf/meta/llama-3.3-70b-instruct-fp8-fast"
    
    def __init__(self, **kwargs):
        # Use Kong AI Gateway endpoint
        gateway_url = os.getenv("KONG_AI_GATEWAY_URL", "http://localhost:8000")
        api_key = os.getenv("KONG_API_KEY", "hackathon-2024-key")
        provider = os.getenv("AI_PROVIDER", "cloudflare")
        
        super().__init__(
            gateway_url=gateway_url, 
            api_key=api_key, 
            provider=provider,
            **kwargs
        )
    
    @property
    def _llm_type(self) -> str:
        return "kong-ai-gateway"
    
    def _call(
        self,
        prompt: str,
        stop: Optional[List[str]] = None,
        run_manager: Optional[CallbackManagerForLLMRun] = None,
        **kwargs: Any,
    ) -> str:
        """Call Kong AI Gateway API with multi-provider support."""
        url = f"{self.gateway_url}/ai/chat"
        
        headers = {
            "apikey": self.api_key,
            "Content-Type": "application/json",
            "X-AI-Provider": self.provider
        }
        
        data = {
            "message": prompt,
            "provider": self.provider,
            "model": self.model,
            "options": {
                "max_tokens": 1024,
                "temperature": 0.7
            }
        }
        
        try:
            print(f"[KONG_AI_GATEWAY] Routing to {self.provider} via Kong AI Gateway")
            response = requests.post(url, headers=headers, json=data, timeout=30)
            response.raise_for_status()
            result = response.json()
            
            if result.get("success"):
                print(f"[KONG_AI_GATEWAY] Response from {result.get('provider', self.provider)}")
                return result["response"]
            else:
                return "Error: Failed to get response from Kong AI Gateway"
                
        except Exception as e:
            print(f"[KONG_AI_GATEWAY] Error: {str(e)}")
            # Fallback to direct Cloudflare if Kong AI Gateway fails
            return self._fallback_cloudflare(prompt)
    
    def _fallback_cloudflare(self, prompt: str) -> str:
        """Fallback to direct Cloudflare AI if Kong AI Gateway fails."""
        account_id = os.getenv("CLOUDFLARE_ACCOUNT_ID")
        api_token = os.getenv("CLOUDFLARE_API_TOKEN")
        
        if not account_id or not api_token:
            return "Error: No fallback credentials available"
        
        url = f"https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/run/{self.model}"
        headers = {
            "Authorization": f"Bearer {api_token}",
            "Content-Type": "application/json"
        }
        data = {
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": 1024
        }
        
        try:
            print("[FALLBACK] Using direct Cloudflare AI")
            response = requests.post(url, headers=headers, json=data, timeout=30)
            response.raise_for_status()
            result = response.json()
            
            if result.get("success"):
                return result["result"]["response"]
            else:
                return "Error: Fallback request failed"
        except Exception as e:
            return f"Error: Fallback failed - {str(e)}"

# Backward compatibility
CloudflareLLM = KongAIGatewayLLM