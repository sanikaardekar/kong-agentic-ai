import os
import json
import re
from cloudflare_llm import CloudflareLLM
from tools.job_search_tool import job_search_tool
from tools.email_finder_tool import email_finder_tool
from tools.email_draft_tool import email_draft_tool

# Initialize Cloudflare LLM
llm = CloudflareLLM()

# Define tools
tools = {
    "job_search": job_search_tool,
    "find_emails": email_finder_tool,
    "draft_email": email_draft_tool
}

def determine_intent_and_execute(user_input: str) -> str:
    user_input_lower = user_input.lower()
    
    if any(word in user_input_lower for word in ['find jobs', 'search jobs', 'job search', 'jobs in', 'positions']):
        print("[INTENT] Detected: JOB_SEARCH")
        
        role_match = re.search(r'(\w+)\s+(?:jobs|developer|engineer|position)', user_input_lower)
        location_match = re.search(r'in\s+(\w+)', user_input_lower)
        
        params = {
            "jobRole": role_match.group(1) if role_match else "software engineer",
            "location": location_match.group(1) if location_match else "mumbai",
            "experience": "2"
        }
        
        return tools["job_search"].func(json.dumps(params))
    
    elif any(word in user_input_lower for word in ['find emails', 'get emails', 'recruiter emails', 'contact']):
        print("[INTENT] Detected: EMAIL_FINDER")
        
        company_match = re.search(r'(?:for|at)\s+(\w+)', user_input_lower)
        company = company_match.group(1) if company_match else "google"
        
        params = {"company": company}
        return tools["find_emails"].func(json.dumps(params))
    
    elif any(word in user_input_lower for word in ['draft email', 'write email', 'compose email']):
        print("[INTENT] Detected: EMAIL_DRAFT")
        
        company_match = re.search(r'(?:for|at)\s+(\w+)', user_input_lower)
        role_match = re.search(r'(\w+)\s+(?:engineer|developer|position|job|role)', user_input_lower)
        
        params = {
            "jobTitle": role_match.group(1).title() + " Engineer" if role_match else "Software Engineer",
            "companyName": company_match.group(1).title() if company_match else "Tech Company",
            "location": "Remote",
            "jobDescription": f"Exciting opportunity for {role_match.group(1) if role_match else 'software'} development",
            "applyUrl": "https://company-careers.com",
            "userPrompt": user_input
        }
        
        return tools["draft_email"].func(json.dumps(params))
    
    else:
        return "I can help you with: 1) Finding jobs 2) Getting recruiter emails 3) Drafting application emails. Please try: 'Find React jobs in Mumbai' or 'Get recruiter emails for Google'"

def process_user_input(user_input: str) -> str:
    print("\n" + "=" * 80)
    print(f"[AGENT] New user request received: {user_input}")
    print("=" * 80)
    
    try:
        print("[AGENT] Analyzing user intent...")
        print(f"[AGENT] Available tools: {', '.join(tools.keys())}")
        
        result = determine_intent_and_execute(user_input)
        
        try:
            result_data = json.loads(result)
            if result_data.get('success'):
                if 'jobs' in result_data:
                    jobs = result_data['jobs']
                    total_jobs = result_data.get('totalJobs', len(jobs))
                    response = f"Found {total_jobs} jobs! Here are the matches:\n\n"
                    for i, job in enumerate(jobs, 1):
                        apply_url = job.get('applyUrl', '#')
                        response += f"{i}. {job.get('title', 'N/A')} at {job.get('company', 'N/A')}\n   Location: {job.get('location', 'N/A')}\n   URL: {apply_url}\n\n"
                elif 'emails' in result_data:
                    emails = result_data['emails'][:5]
                    response = f"Found {len(emails)} recruiter emails for {result_data.get('company', 'the company')}:\n\n"
                    for email in emails:
                        response += f"• {email.get('email', 'N/A')} ({email.get('confidence', 'unknown')} confidence)\n"
                elif 'emailText' in result_data:
                    response = f"Email drafted successfully!\n\nSubject: {result_data.get('emailSubject', 'Job Application')}\n\n{result_data.get('emailText', 'Email content generated')}"
                else:
                    response = "Task completed successfully!"
            else:
                response = f"Sorry, I encountered an issue: {result_data.get('error', 'Unknown error')}"
        except:
            response = result
        
        print("[AGENT] Response generated successfully")
        print("=" * 80 + "\n")
        
        return response
        
    except Exception as error:
        print(f"[AGENT] Error during processing: {str(error)}")
        print("=" * 80 + "\n")
        return "I encountered an error processing your request. Please try again or be more specific."