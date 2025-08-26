import express from "express";
import morgan from "morgan";
import cors from "cors";
import { z } from "zod";
import { EmailFetcher } from "./services/emailFetcher.js";

const app = express();
app.use(morgan("dev"));
app.use(cors());
app.use(express.json({ limit: "1mb" }));

const SERPAPI_KEY = process.env.SERPAPI_KEY;
const VERIFALIA_API_KEY = process.env.VERIFALIA_API_KEY;

if (!SERPAPI_KEY) {
  console.error("SERPAPI_KEY environment variable is required");
  process.exit(1);
}

if (!VERIFALIA_API_KEY) {
  console.error("VERIFALIA_API_KEY environment variable is required");
  process.exit(1);
}

const emailFetcher = new EmailFetcher(SERPAPI_KEY, VERIFALIA_API_KEY);

app.get("/health", (_req, res) => res.json({ ok: true }));

const SearchSchema = z.object({
  jobRole: z.string().min(1),
  experience: z.string().min(1),
  location: z.string().min(1),
  company: z.string().optional(),
});

const JobEmailSchema = z.object({
  jobId: z.string(),
  company: z.string(),
  title: z.string(),
  location: z.string(),
});

// Fetch emails for jobs based on search criteria
app.post("/emails/search", async (req, res) => {
  try {
    const parsed = SearchSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ 
        error: "Invalid search parameters", 
        details: parsed.error.flatten() 
      });
    }

    const jobs = await emailFetcher.fetchJobsFromService(parsed.data);
    const emailResults = [];

    // Process first 3 jobs to avoid overwhelming the API
    for (const job of jobs.slice(0, 3)) {
      const emails = await emailFetcher.fetchEmailsForJob(job);
      if (emails.length > 0) {
        emailResults.push({
          job: {
            id: job.id,
            title: job.title,
            company: job.company,
            location: job.location
          },
          emails
        });
      }
    }

    res.json({
      success: true,
      totalJobs: jobs.length,
      processedJobs: Math.min(jobs.length, 3),
      results: emailResults
    });
  } catch (error) {
    console.error("Error in email search:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch emails" 
    });
  }
});

// Fetch emails for a specific job
app.post("/emails/job", async (req, res) => {
  try {
    const parsed = JobEmailSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ 
        error: "Invalid job parameters", 
        details: parsed.error.flatten() 
      });
    }

    const { jobId, company, title, location } = parsed.data;
    const job = { id: jobId, company, title, location };
    
    const emails = await emailFetcher.fetchEmailsForJob(job);

    res.json({
      success: true,
      job,
      emails,
      totalEmails: emails.length
    });
  } catch (error) {
    console.error("Error fetching job emails:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch emails for job" 
    });
  }
});

const port = Number(process.env.PORT ?? 5000);
app.listen(port, () => {
  console.log(`email-address-service listening on :${port}`);
});