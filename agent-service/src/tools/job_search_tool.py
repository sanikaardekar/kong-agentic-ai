import json
import requests
from langchain.tools import Tool

def job_search_func(input_str: str) -> str:
    """Search for jobs based on role, experience, location, and optionally company."""
    print(f"🔍 [JOB_SEARCH] Tool called with input: {input_str}")
    
    try:
        params = json.loads(input_str)
        print(f"🔍 [JOB_SEARCH] Parsed parameters: {params}")
        print("🔍 [JOB_SEARCH] Making API call to job-service...")
        
        response = requests.post('http://job-service:3000/jobs', json=params, timeout=30)
        response.raise_for_status()
        data = response.json()
        
        print(f"🔍 [JOB_SEARCH] API response received: totalJobs={data.get('totalJobs', 0)}, jobsFound={len(data.get('jobs', []))}")
        
        result = {
            "success": True,
            "totalJobs": data.get('totalJobs', 0),
            "jobs": data.get('jobs', [])[:15],  # Show more jobs
            "message": data.get('message')
        }
        
        print("🔍 [JOB_SEARCH] Tool execution completed successfully")
        return json.dumps(result)
        
    except Exception as error:
        print(f"❌ [JOB_SEARCH] Tool execution failed: {str(error)}")
        return json.dumps({"success": False, "error": "Failed to search jobs"})

job_search_tool = Tool(
    name="job_search",
    description="Search for jobs based on role, experience, location, and optionally company. Use this when user asks to find jobs, search positions, or look for opportunities. Input should be JSON with jobRole, experience, location, and optionally company.",
    func=job_search_func
)