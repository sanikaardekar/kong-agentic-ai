# Job Scraper

## Setup

1. **Install dependencies:**
```bash
cd scraper
pip install -r requirements.txt
```

2. **Configure MongoDB:**
Add to `.env` file in root:
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/job-search-db?retryWrites=true&w=majority
```

3. **Update job-service:**
```bash
cd ../job-service
npm install
```

4. **Run scraper:**
```bash
python job_scraper.py
```

## MongoDB Atlas Setup

1. Go to https://www.mongodb.com/cloud/atlas
2. Create free cluster
3. Create database user
4. Whitelist IP (0.0.0.0/0 for development)
5. Get connection string
6. Add to `.env` as `MONGODB_URI`

## API Endpoint

**POST** `http://localhost:3000/jobs/bulk`

**Request Body:**
```json
{
  "jobs": [
    {
      "id": "unique-id",
      "title": "Software Engineer",
      "company": "Tech Corp",
      "location": "Mumbai",
      "applyUrl": "https://...",
      "jobDescription": "...",
      "postedAt": "2024-01-01T00:00:00Z",
      "remote": false
    }
  ],
  "source": "my-scraper"
}
```

**Response:**
```json
{
  "success": true,
  "inserted": 5,
  "updated": 2,
  "total": 7
}
```

## Periodic Execution

**Using cron (Linux/Mac):**
```bash
# Run every hour
0 * * * * cd /path/to/scraper && python job_scraper.py
```

**Using Task Scheduler (Windows):**
1. Open Task Scheduler
2. Create Basic Task
3. Set trigger (e.g., daily at 9 AM)
4. Action: Start a program
5. Program: `python`
6. Arguments: `job_scraper.py`
7. Start in: `C:\path\to\scraper`
