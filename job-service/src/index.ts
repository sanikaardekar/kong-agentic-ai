import express from "express";
import cors from "cors";
import { connectToMongoDB, getJobsCollection } from "./db.js";
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Connect to MongoDB on startup
connectToMongoDB().catch(err => {
  console.error("Failed to connect to MongoDB:", err.message);
});

// Health check
app.get("/health", (_req, res) => {
  console.log("Health Endpoint Called");
  res.json({ ok: true, service: "job-service" });
});

// GET /jobs - Fetch jobs from MongoDB with optional filters
app.get("/jobs", async (req, res) => {
  try {
    const { jobRole, location, company, limit = "20" } = req.query;

    const filter: Record<string, any> = {};

    if (jobRole) filter.title = { $regex: jobRole, $options: "i" };
    if (location) filter.location = { $regex: location, $options: "i" };
    if (company) filter.company = { $regex: company, $options: "i" };

    const jobsCollection = getJobsCollection();
    const jobs = await jobsCollection
      .find(filter)
      .sort({ scrapedAt: -1 })
      .limit(parseInt(limit as string))
      .toArray();
    
    console.log(`✓ Fetched ${jobs.length} jobs with filters:`, filter);

    res.json({
      success: true,
      totalJobs: jobs.length,
      jobs
    });

  } catch (err: any) {
    console.error("GET /jobs error:", err.message);
    res.status(500).json({ success: false, error: err.message ?? "Failed to fetch jobs" });
  }
});

// POST /jobs - Bulk upsert jobs from scraper
app.post("/jobs", async (req, res) => {
  try {
    const { jobs, source } = req.body;

    if (!jobs || !Array.isArray(jobs) || jobs.length === 0) {
      console.log("POST /jobs - Invalid payload:", req.body);
      return res.status(400).json({
        success: false,
        error: "Expected { jobs: [...], source: 'scraper-name' }"
      });
    }

    const jobsCollection = getJobsCollection();

    const bulkOps = jobs.map(job => {
      const jobId = job.id || `${job.company.slice(0,10)}-${job.title.slice(0,10)}`.replace(/\s+/g, "-").toLowerCase();
      return {
        updateOne: {
          filter: { jobId },
          update: {
            $set: {
              ...job,
              jobId,
              source: source || job.source || "scraper",
              scrapedAt: new Date(),
              createdAt: job.createdAt || new Date()
            }
          },
          upsert: true
        }
      };
    });

    const result = await jobsCollection.bulkWrite(bulkOps);

    console.log(`✓ Bulk upsert: ${result.upsertedCount} inserted, ${result.modifiedCount} updated`);

    res.json({
      success: true,
      inserted: result.upsertedCount,
      updated: result.modifiedCount,
      total: jobs.length
    });

  } catch (err: any) {
    console.error("POST /jobs error:", err.message);
    res.status(500).json({ success: false, error: err.message ?? "Failed to upsert jobs" });
  }
});

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
  console.log(`job-service listening on :${port}`);
});
