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

const app = express();
app.use(morgan("dev"));
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'apikey']
}));
app.use(express.json({ limit: "1mb" }));

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
      // Lever already includes full descriptions in list API
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

app.post("/search", async (req, res) => {
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

    // Fetch from Indeed (most reliable)
    try {
      const indeedJobs = await fetchIndeedJobs(jobRole, location, experience);
      allJobs.push(...indeedJobs);
    } catch (err) {
      console.log("Indeed fetch failed:", err);
    }

    // Fetch from Greenhouse if company specified
    if (company) {
      try {
        const greenhouseJobs = await fetchGreenhouseJobs(company);
        const filtered = greenhouseJobs.filter(job => 
          job.title.toLowerCase().includes(jobRole.toLowerCase())
        );
        allJobs.push(...filtered);
      } catch (err) {
        console.log(`Greenhouse fetch failed for ${company}:`, err);
      }

      try {
        const leverJobs = await fetchLeverJobs(company);
        const filtered = leverJobs.filter(job => 
          job.title.toLowerCase().includes(jobRole.toLowerCase())
        );
        allJobs.push(...filtered);
      } catch (err) {
        console.log(`Lever fetch failed for ${company}:`, err);
      }
    }

    // Fetch from Naukri
    try {
      const naukriJobs = await fetchNaukriJobs(jobRole, location, experience);
      allJobs.push(...naukriJobs);
    } catch (err) {
      console.log("Naukri fetch failed:", err);
    }

    // Remove duplicates
    const uniqueJobs = allJobs.filter((job, index, self) => 
      index === self.findIndex(j => j.title === job.title && j.company === job.company)
    );

    // Format for frontend with full job descriptions
    const formattedJobs = uniqueJobs.map(job => ({
      id: job.id,
      title: job.title,
      company: job.company,
      location: job.location,
      source: job.source,
      applyUrl: job.applyUrl,
      jobDescription: job.descriptionHtml || (job.raw as any)?.descriptionPlain || (job.raw as any)?.description || "No description available",
      postedAt: job.postedAt,
      isRemote: job.remote || false,
      rawData: job.raw // Full raw data for email service
    }));

    res.json({
      searchParams: { jobRole, experience, location, company },
      totalJobs: formattedJobs.length,
      jobs: formattedJobs,
      sources: [...new Set(allJobs.map(j => j.source))]
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err?.message ?? "Search failed" });
  }
});

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

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
  console.log(`job-service listening on :${port}`);
});