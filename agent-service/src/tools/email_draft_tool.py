import json
import requests
from langchain.tools import Tool

def email_draft_func(input_str: str) -> str:
    """Draft a professional email for job application."""
    print(f"✏️ [EMAIL_DRAFT] Tool called with input: {input_str}")
    
    try:
        params = json.loads(input_str)
        print(f"✏️ [EMAIL_DRAFT] Parsed parameters: jobTitle={params.get('jobTitle')}, companyName={params.get('companyName')}")
        print("✏️ [EMAIL_DRAFT] Making API call to email-service...")
        
        # Add default user profile
        params['userProfile'] = "Software Engineer with experience in modern web technologies, passionate about building scalable applications."
        
        response = requests.post('http://email-service:4000/email/draft', json=params, timeout=30)
        response.raise_for_status()
        data = response.json()
        
        print(f"✏️ [EMAIL_DRAFT] API response received: success={data.get('success')}, hasSubject={bool(data.get('emailSubject'))}")
        
        result = {
            "success": True,
            "emailSubject": data.get('emailSubject'),
            "emailText": data.get('emailText')
        }
        
        print("✏️ [EMAIL_DRAFT] Tool execution completed successfully")
        return json.dumps(result)
        
    except Exception as error:
        print(f"❌ [EMAIL_DRAFT] Tool execution failed: {str(error)}")
        return json.dumps({"success": False, "error": "Failed to draft email"})

email_draft_tool = Tool(
    name="draft_email",
    description="Draft a professional email for job application. Use this when user asks to write email, draft application, or create cover letter for a specific job. Input should be JSON with jobTitle, companyName, location, jobDescription, and applyUrl.",
    func=email_draft_func
)