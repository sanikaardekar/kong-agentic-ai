import express from "express";
import morgan from "morgan";
import cors from "cors";
import { z } from "zod";
import { fetchGreenhouseJobs } from "./sources/greenhouse.js";
import { fetchGreenhouseJobDetail } from "./sources/greenhouse-detail.js";
import { fetchLeverJobs } from "./sources/lever.js";
import { fetchIndeedJobs } from "./sources/indeed.js";
import { fetchNaukriJobs } from "./sources/naukri.js";
import type { NormalizedJob, Source } from "./types.js";
import { connectToMongoDB, getJobsCollection } from "./db.js";

const app = express();
app.use(morgan("dev"));
app.use(cors());
app.use(express.json({ limit: "1mb" }));

connectToMongoDB().catch(err => console.error("MongoDB connection error:", err.message));

app.get("/health", (_req, res) => res.json({ ok: true }));

const QuerySchema = z.object({
  source: z.enum(["greenhouse", "lever", "indeed", "naukri"]).transform((s) => s as Source),
  token: z.string().optional(),
  company: z.string().optional(),
  jobRole: z.string().optional(),
  location: z.string().optional(),
  experience: z.string().optional(),
});

const SearchSchema = z.object({
  jobRole: z.string().min(1, "Job role is required"),
  experience: z.string().min(1, "Experience is required"),
  location: z.string().min(1, "Location is required"),
  company: z.string().optional(),
});

app.get("/job/:source/:id", async (req, res) => {
  try {
    const { source, id } = req.params;
    const { token, company } = req.query;

    if (source === "greenhouse") {
      if (!token) return res.status(400).json({ error: "Missing ?token=<boardToken> for Greenhouse" });
      const jobDetail = await fetchGreenhouseJobDetail(String(token), id);
      res.json({ job: jobDetail });
    } else if (source === "lever") {
      const handle = company ?? token;
      if (!handle) return res.status(400).json({ error: "Missing ?company=<leverCompany> for Lever" });
      const jobs = await fetchLeverJobs(String(handle));
      const job = jobs.find(j => j.id === id);
      if (!job) return res.status(404).json({ error: "Job not found" });
      res.json({ job });
    } else {
      res.status(400).json({ error: "Individual job fetch only supported for greenhouse and lever" });
    }
  } catch (err: any) {
    console.error(err);
    res.status(502).json({ error: err?.message ?? "upstream error" });
  }
});

app.post("/jobs", async (req, res) => {
  if (req.body.jobRole) {
    return handleSearch(req, res);
  }
  return res.status(400).json({ error: "Invalid request" });
});

async function handleSearch(req: any, res: any) {
  try {
    const parsed = SearchSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ 
        error: "Missing required parameters", 
        required: ["jobRole", "experience", "location"],
        optional: ["company"],
        details: parsed.error.flatten()
      });
    }

    const { jobRole, experience, location, company } = parsed.data;
    let allJobs: NormalizedJob[] = [];

    console.log(`DEBUG: company parameter = '${company}'`);

    if (company) {
      console.log(`DEBUG: COMPANY BRANCH - Searching for ${jobRole} at ${company} only`);
      
      try {
        const greenhouseJobs = await fetchGreenhouseJobs(company);
        const filtered = greenhouseJobs.filter(job => 
          job.title.toLowerCase().includes(jobRole.toLowerCase())
        );
        allJobs.push(...filtered);
        console.log(`Found ${filtered.length} Greenhouse jobs at ${company}`);
      } catch (err) {
        console.error(`Greenhouse fetch failed for ${company}:`, err);
      }

      try {
        const leverJobs = await fetchLeverJobs(company);
        const filtered = leverJobs.filter(job => 
          job.title.toLowerCase().includes(jobRole.toLowerCase())
        );
        allJobs.push(...filtered);
        console.log(`Found ${filtered.length} Lever jobs at ${company}`);
      } catch (err) {
        console.log(`Lever fetch failed for ${company}:`, err);
      }
    } else {
      console.log(`DEBUG: NO COMPANY BRANCH - Fetching from all sources`);
      
      try {
        const indeedJobs = await fetchIndeedJobs(jobRole, location, experience);
        allJobs.push(...indeedJobs);
        console.log(`Found ${indeedJobs.length} Indeed jobs`);
      } catch (err) {
        console.error("Indeed fetch failed:", err);
      }

      try {
        const naukriJobs = await fetchNaukriJobs(jobRole, location, experience);
        allJobs.push(...naukriJobs);
        console.log(`Found ${naukriJobs.length} Naukri jobs`);
      } catch (err) {
        console.error("Naukri fetch failed:", err);
      }
      
      console.log(`Found ${allJobs.length} total jobs from all sources`);
    }

    const uniqueJobs = allJobs.filter((job, index, self) => 
      index === self.findIndex(j => j.title === job.title && j.company === job.company)
    );

    const sortedJobs = uniqueJobs.sort((a, b) => {
      const aLocationMatch = a.location.toLowerCase().includes(location.toLowerCase());
      const bLocationMatch = b.location.toLowerCase().includes(location.toLowerCase());
      
      if (aLocationMatch && !bLocationMatch) return -1;
      if (!aLocationMatch && bLocationMatch) return 1;
      return 0;
    });

    const formattedJobs = sortedJobs.map(job => ({
      id: job.id,
      title: job.title,
      company: job.company,
      location: job.location,
      source: job.source,
      applyUrl: job.applyUrl,
      jobDescription: job.descriptionHtml || (job.raw as any)?.descriptionPlain || (job.raw as any)?.description || "No description available",
      postedAt: job.postedAt,
      isRemote: job.remote || false,
      rawData: job.raw
    }));

    const message = (company && formattedJobs.length === 0) 
      ? `No jobs found for ${company}. We suggest you go to their careers page.`
      : null;

    res.json({
      searchParams: { jobRole, experience, location, company },
      totalJobs: formattedJobs.length,
      jobs: formattedJobs,
      sources: [...new Set(allJobs.map(j => j.source))],
      message
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err?.message ?? "Search failed" });
  }
}

app.get("/jobs", async (req, res) => {
  try {
    const parsed = QuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const { source, token, company, jobRole, location, experience } = parsed.data;
    let jobs: NormalizedJob[] = [];

    if (source === "greenhouse") {
      if (!token) {
        return res.status(400).json({ 
          error: "Greenhouse requires company token",
          examples: ["airbnb", "netflix", "stripe", "shopify"],
          usage: "?source=greenhouse&token=airbnb"
        });
      }
      jobs = await fetchGreenhouseJobs(token);
    } else if (source === "lever") {
      const handle = company ?? token;
      if (!handle) {
        return res.status(400).json({ 
          error: "Lever requires company handle",
          examples: ["leverdemo", "netflix", "stripe"],
          usage: "?source=lever&company=leverdemo"
        });
      }
      jobs = await fetchLeverJobs(handle);
    } else if (source === "indeed") {
      if (!jobRole) return res.status(400).json({ error: "Missing ?jobRole=<role> for Indeed" });
      if (!location) return res.status(400).json({ error: "Missing ?location=<location> for Indeed" });
      jobs = await fetchIndeedJobs(jobRole, location, experience);
    } else if (source === "naukri") {
      if (!jobRole) return res.status(400).json({ error: "Missing ?jobRole=<role> for Naukri" });
      if (!location) return res.status(400).json({ error: "Missing ?location=<location> for Naukri" });
      jobs = await fetchNaukriJobs(jobRole, location, experience);
    }

    res.json({ count: jobs.length, jobs });
  } catch (err: any) {
    console.error(err);
    res.status(502).json({ error: err?.message ?? "upstream error" });
  }
});

// GET /mongoData - fetch scraped jobs from MongoDB
app.get("/mongoData", async (req, res) => {
  try {
    const { jobRole, location, company, limit = "20" } = req.query;
    const filter: Record<string, any> = {};
    if (jobRole) filter.title = { $regex: jobRole, $options: "i" };
    if (location) filter.location = { $regex: location, $options: "i" };
    if (company) filter.company = { $regex: company, $options: "i" };
    const jobs = await getJobsCollection().find(filter).sort({ scrapedAt: -1 }).limit(parseInt(limit as string)).toArray();
    res.json({ success: true, totalJobs: jobs.length, jobs });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message ?? "Failed to fetch jobs" });
  }
});

// POST /mongoData - bulk upsert scraped jobs
app.post("/mongoData", async (req, res) => {
  try {
    const { jobs, source } = req.body;
    if (!jobs || !Array.isArray(jobs) || jobs.length === 0) {
      return res.status(400).json({ success: false, error: "Expected { jobs: [...], source: 'scraper-name' }" });
    }
    const bulkOps = jobs.map(job => {
      const jobId = job.jobId || job.id || `${String(job.company).slice(0,10)}-${String(job.title).slice(0,10)}`.replace(/\s+/g, "-").toLowerCase();
      return {
        updateOne: {
          filter: { jobId },
          update: { $set: { ...job, jobId, source: source || job.source || "scraper", scrapedAt: new Date() } },
          upsert: true
        }
      };
    });
    const result = await getJobsCollection().bulkWrite(bulkOps);
    res.json({ success: true, inserted: result.upsertedCount, updated: result.modifiedCount, total: jobs.length });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message ?? "Failed to upsert jobs" });
  }
});

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
  console.log(`job-service listening on :${port}`);
});