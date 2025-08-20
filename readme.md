curl "http://localhost:8000/jobs?source=greenhouse&token=airbnb"
# Result: 212 jobs from Airbnb
curl "http://localhost:8000/jobs?source=lever&company=leverdemo" 
# Result: 398 jobs from Lever demo

curl -X POST "http://localhost:8000/email/send-for-job" \
  -H "apikey: demo-key-123" \
  -H "Content-Type: application/json" \
  -d '{
    "recipient": "sanikaardekar@gmail.com",
    "jobId": "cd1ea494-1629-4cb1-a1c7-5dbcc9dea545",
    "source": "lever",
    "company": "leverdemo",
    "userProfile": "Software Engineer with 2 years experience in Node.js, JavaScript, MongoDB, Redis, and AWS. Built scalable APIs and microservices. Passionate about real-time applications and modern web frameworks like DerbyJS. Experience with startup environments and collaborative development."
  }' | jq '.emailText' | head -10