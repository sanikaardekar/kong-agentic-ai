import json
import re
import requests
import os

def detect_intent_with_ai(user_input: str) -> dict:
    """Use Cloudflare AI to detect user intent and extract parameters."""
    account_id = os.getenv("CLOUDFLARE_ACCOUNT_ID")
    api_token = os.getenv("CLOUDFLARE_API_TOKEN")
    model = os.getenv("CLOUDFLARE_MODEL", "@cf/meta/llama-3.3-70b-instruct-fp8-fast")
    
    if not account_id or not api_token:
        return {"intent": "unknown", "params": {}}
    
    prompt = f"""Analyze this user request and respond with ONLY a JSON object (no other text):

User request: "{user_input}"

Determine the intent and extract parameters. Return JSON in this exact format:
{{
  "intent": "job_search" | "email_finder" | "email_draft" | "unknown",
  "params": {{
    "jobRole": "extracted role or null",
    "location": "extracted location or null",
    "company": "extracted company or null",
    "jobTitle": "extracted job title or null"
  }}
}}

Examples:
- "Find React jobs in Mumbai" -> {{"intent": "job_search", "params": {{"jobRole": "react", "location": "mumbai"}}}}
- "Get recruiter emails for Google" -> {{"intent": "email_finder", "params": {{"company": "google"}}}}
- "Draft email for software engineer at Netflix" -> {{"intent": "email_draft", "params": {{"jobTitle": "software engineer", "company": "netflix"}}}}

Respond with ONLY the JSON object:"""
    
    try:
        url = f"https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/run/{model}"
        response = requests.post(
            url,
            headers={
                "Authorization": f"Bearer {api_token}",
                "Content-Type": "application/json"
            },
            json={
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": 256
            },
            timeout=10
        )
        response.raise_for_status()
        result = response.json()
        
        if result.get("success"):
            ai_response = result["result"]["response"].strip()
            # Extract JSON from response
            json_match = re.search(r'\{.*\}', ai_response, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
        
        return {"intent": "unknown", "params": {}}
        
    except Exception as e:
        print(f"[AI] Intent detection failed: {str(e)}")
        return {"intent": "unknown", "params": {}}

def process_user_input(user_input: str) -> str:
    """Process user input using AI-based intent detection."""
    print(f"\n[AGENT] Processing: {user_input}")
    
    # Use AI to detect intent
    intent_data = detect_intent_with_ai(user_input)
    intent = intent_data.get("intent", "unknown")
    params = intent_data.get("params", {})
    
    print(f"[AGENT] AI detected intent: {intent}")
    print(f"[AGENT] Extracted params: {params}")
    
    if intent == "job_search":
        return handle_job_search(params)
    elif intent == "email_finder":
        return handle_email_finder(params)
    elif intent == "email_draft":
        return handle_email_draft(params)
    else:
        return "I can help you with:\n1) Finding jobs - Try: 'Find React jobs in Mumbai'\n2) Getting recruiter emails - Try: 'Get recruiter emails for Google'\n3) Drafting application emails - Try: 'Draft email for software engineer at Netflix'"

def handle_job_search(params: dict) -> str:
    """Handle job search requests."""
    print("[AGENT] Intent: JOB_SEARCH")
    
    job_role = params.get("jobRole") or "software engineer"
    location = params.get("location") or "mumbai"
    
    search_params = {
        "jobRole": job_role,
        "location": location,
        "experience": "2"
    }
    
    print(f"[AGENT] Calling job-service with: {search_params}")
    
    try:
        response = requests.post(
            'http://job-service:3000/jobs',
            json=search_params,
            timeout=30
        )
        response.raise_for_status()
        data = response.json()
        
        jobs = data.get('jobs', [])
        total = data.get('totalJobs', len(jobs))
        
        if not jobs:
            return f"No jobs found for {job_role} in {location}. Try different keywords."
        
        result = f"Found {total} jobs! Here are the matches:\n\n"
        for i, job in enumerate(jobs[:10], 1):
            result += f"{i}. {job.get('title', 'N/A')} at {job.get('company', 'N/A')}\n"
            result += f"   Location: {job.get('location', 'N/A')}\n"
            result += f"   URL: {job.get('applyUrl', '#')}\n\n"
        
        print(f"[AGENT] Success: {len(jobs)} jobs found")
        return result
        
    except Exception as e:
        print(f"[AGENT] Error: {str(e)}")
        return f"Sorry, I couldn't search for jobs right now. Error: {str(e)}"

def handle_email_finder(params: dict) -> str:
    """Handle email finder requests."""
    print("[AGENT] Intent: EMAIL_FINDER")
    
    company = params.get("company") or "google"
    
    print(f"[AGENT] Calling email-finder-service for: {company}")
    
    try:
        response = requests.post(
            'http://email-finder-service:5000/emails',
            json={"company": company},
            timeout=30
        )
        response.raise_for_status()
        data = response.json()
        
        emails = data.get('emails', [])
        
        if not emails:
            return f"No emails found for {company}."
        
        result = f"Found {len(emails)} recruiter emails for {company}:\n\n"
        for email in emails[:5]:
            result += f"• {email.get('email', 'N/A')} ({email.get('confidence', 'unknown')} confidence)\n"
        
        print(f"[AGENT] Success: {len(emails)} emails found")
        return result
        
    except Exception as e:
        print(f"[AGENT] Error: {str(e)}")
        return f"Sorry, I couldn't find emails right now. Error: {str(e)}"

def handle_email_draft(params: dict) -> str:
    """Handle email draft requests."""
    print("[AGENT] Intent: EMAIL_DRAFT")
    
    company = params.get("company") or "Tech Company"
    job_title = params.get("jobTitle") or "Software Engineer"
    
    email_params = {
        "jobTitle": job_title.title(),
        "companyName": company.title(),
        "location": "Remote",
        "jobDescription": f"Exciting {job_title} opportunity at {company}",
        "applyUrl": "https://company-careers.com",
        "userProfile": "Software Engineer with experience in modern web technologies"
    }
    
    print(f"[AGENT] Calling email-service with: {email_params}")
    
    try:
        response = requests.post(
            'http://email-service:4000/email/draft',
            json=email_params,
            timeout=30
        )
        response.raise_for_status()
        data = response.json()
        
        subject = data.get('emailSubject', 'Job Application')
        body = data.get('emailText', 'Email content generated')
        
        result = f"Email drafted successfully!\n\nSubject: {subject}\n\n{body}"
        
        print("[AGENT] Success: Email drafted")
        return result
        
    except Exception as e:
        print(f"[AGENT] Error: {str(e)}")
        return f"Sorry, I couldn't draft the email right now. Error: {str(e)}"
