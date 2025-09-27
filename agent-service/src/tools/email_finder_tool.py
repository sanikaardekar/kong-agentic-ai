import json
import requests
from langchain.tools import Tool

def email_finder_func(input_str: str) -> str:
    """Find recruiter emails for a company."""
    print(f"[EMAIL_FINDER] Tool called with input: {input_str}")
    
    try:
        data = json.loads(input_str)
        company = data.get('company')
        print(f"[EMAIL_FINDER] Searching emails for company: {company}")
        print("[EMAIL_FINDER] Making API call to email-finder-service...")
        
        response = requests.post('http://email-finder-service:5000/emails', json={"company": company}, timeout=30)
        response.raise_for_status()
        result_data = response.json()
        
        print(f"[EMAIL_FINDER] API response received: company={result_data.get('company')}, totalEmails={result_data.get('totalEmails', 0)}")
        
        result = {
            "success": True,
            "company": result_data.get('company'),
            "emails": result_data.get('emails', [])[:5]
        }
        
        print("[EMAIL_FINDER] Tool execution completed successfully")
        return json.dumps(result)
        
    except Exception as error:
        print(f"[EMAIL_FINDER] Tool execution failed: {str(error)}")
        return json.dumps({"success": False, "error": "Failed to find emails"})

email_finder_tool = Tool(
    name="find_emails",
    description="Find recruiter emails for a company. Use this when user asks to find emails, get contact info, or find recruiters for a specific company. Input should be JSON with company name.",
    func=email_finder_func
)