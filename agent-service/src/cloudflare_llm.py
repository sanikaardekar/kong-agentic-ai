import os
import requests

class CloudflareLLM:
    """Direct Cloudflare AI wrapper."""
    
    def __init__(self):
        self.account_id = os.getenv("CLOUDFLARE_ACCOUNT_ID")
        self.api_token = os.getenv("CLOUDFLARE_API_TOKEN")
        self.model = "@cf/meta/llama-3.3-70b-instruct-fp8-fast"
    
    def call(self, prompt: str) -> str:
        """Call Cloudflare AI API directly."""
        if not self.account_id or not self.api_token:
            return "Error: Cloudflare credentials not configured"
        
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
            print("[CLOUDFLARE_AI] Making API call")
            response = requests.post(url, headers=headers, json=data, timeout=30)
            response.raise_for_status()
            result = response.json()
            
            if result.get("success"):
                return result["result"]["response"]
            else:
                return "Error: Cloudflare AI request failed"
        except Exception as e:
            print(f"[CLOUDFLARE_AI] Error: {str(e)}")
            return f"Error: {str(e)}"
