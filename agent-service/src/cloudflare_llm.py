import os
import requests
from typing import List, Optional, Any
from langchain.llms.base import LLM
from langchain.callbacks.manager import CallbackManagerForLLMRun

class CloudflareLLM(LLM):
    """Custom Cloudflare AI LLM wrapper for LangChain."""
    
    account_id: str = ""
    api_token: str = ""
    model: str = "@cf/meta/llama-3.3-70b-instruct-fp8-fast"
    
    def __init__(self, **kwargs):
        # Get credentials from environment
        account_id = os.getenv("CLOUDFLARE_ACCOUNT_ID", "")
        api_token = os.getenv("CLOUDFLARE_API_TOKEN", "")
        
        if not account_id or not api_token:
            raise ValueError("CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN must be set")
            
        # Pass to parent init
        super().__init__(account_id=account_id, api_token=api_token, **kwargs)
    
    @property
    def _llm_type(self) -> str:
        return "cloudflare"
    
    def _call(
        self,
        prompt: str,
        stop: Optional[List[str]] = None,
        run_manager: Optional[CallbackManagerForLLMRun] = None,
        **kwargs: Any,
    ) -> str:
        """Call Cloudflare AI API."""
        url = f"https://api.cloudflare.com/client/v4/accounts/{self.account_id}/ai/run/{self.model}"
        
        headers = {
            "Authorization": f"Bearer {self.api_token}",
            "Content-Type": "application/json"
        }
        
        data = {
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": 1024
        }
        
        try:
            response = requests.post(url, headers=headers, json=data, timeout=30)
            response.raise_for_status()
            result = response.json()
            
            if result.get("success"):
                return result["result"]["response"]
            else:
                return "Error: Failed to get response from Cloudflare AI"
                
        except Exception as e:
            print(f"❌ [CLOUDFLARE_LLM] Error: {str(e)}")
            return f"Error: {str(e)}"