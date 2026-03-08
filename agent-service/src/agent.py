import json
import re
import requests

def process_user_input(user_input: str) -> str:
    """Process user input and route to appropriate service."""
    print(f"\n[AGENT] Processing: {user_input}")
    
    user_input_lower = user_input.lower()
    
    # Job Search Intent
    if any(word in user_input_lower for word in ['find jobs', 'search jobs', 'job search', 'jobs in', 'jobs for', 'positions']):
        return handle_job_search(user_input, user_input_lower)
    
    # Email Finder Intent
    elif any(word in user_input_lower for word in ['find emails', 'get emails', 'recruiter emails', 'contact', 'emails for']):
        return handle_email_finder(user_input, user_input_lower)
    
    # Email Draft Intent
    elif any(word in user_input_lower for word in ['draft email', 'write email', 'compose email', 'create email']):
        return handle_email_draft(user_input, user_input_lower)
    
    else:
        return "I can help you with:\n1) Finding jobs - Try: 'Find React jobs in Mumbai'\n2) Getting recruiter emails - Try: 'Get recruiter emails for Google'\n3) Drafting application emails - Try: 'Draft email for software engineer at Netflix'"

def handle_job_search(user_input: str, user_input_lower: str) -> str:
    """Handle job search requests."""
    print("[AGENT] Intent: JOB_SEARCH")
    
    # Extract job role
    role_match = re.search(r'([\w\s]+?)\s+(?:jobs|developer|engineer|position)', user_input_lower)
    job_role = role_match.group(1).strip() if role_match else "software engineer"
    
    # Extract location
    location_match = re.search(r'in\s+([\w\s]+?)(?:\s|$)', user_input_lower)
    location = location_match.group(1).strip() if location_match else "mumbai"
    
    params = {
        "jobRole": job_role,
        "location": location,
        "experience": "2"
    }
    
    print(f"[AGENT] Calling job-service with: {params}")
    
    try:
        response = requests.post(
            'http://job-service:3000/jobs',
            json=params,
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

def handle_email_finder(user_input: str, user_input_lower: str) -> str:
    """Handle email finder requests."""
    print("[AGENT] Intent: EMAIL_FINDER")
    
    # Extract company name
    company_match = re.search(r'(?:for|at)\s+([\w\s]+?)(?:\s|$)', user_input_lower)
    company = company_match.group(1).strip() if company_match else "google"
    
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

def handle_email_draft(user_input: str, user_input_lower: str) -> str:
    """Handle email draft requests."""
    print("[AGENT] Intent: EMAIL_DRAFT")
    
    # Extract company name
    company_match = re.search(r'(?:for|at)\s+([\w\s]+?)(?:\s|$)', user_input_lower)
    company = company_match.group(1).strip().title() if company_match else "Tech Company"
    
    # Extract job role
    role_match = re.search(r'([\w\s]+?)\s+(?:engineer|developer|position|job|role)', user_input_lower)
    job_title = role_match.group(1).strip().title() + " Engineer" if role_match else "Software Engineer"
    
    params = {
        "jobTitle": job_title,
        "companyName": company,
        "location": "Remote",
        "jobDescription": f"Exciting {job_title} opportunity at {company}",
        "applyUrl": "https://company-careers.com",
        "userProfile": "Software Engineer with experience in modern web technologies"
    }
    
    print(f"[AGENT] Calling email-service with: {params}")
    
    try:
        response = requests.post(
            'http://email-service:4000/email/draft',
            json=params,
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
