import express from "express";
import morgan from "morgan";
import cors from "cors";
import { z } from "zod";
import { fetchGreenhouseJobs } from "./sources/greenhouse.js";
import { fetchLeverJobs } from "./sources/lever.js";
import type { NormalizedJob, Source } from "./types.js";

const app = express();
app.use(morgan("dev"));
app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => res.json({ ok: true }));

const QuerySchema = z.object({
  source: z.enum(["greenhouse", "lever"]).transform((s) => s as Source),
  token: z.string().optional(),
  company: z.string().optional(),
});

app.get("/jobs", async (req, res) => {
  try {
    const parsed = QuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const { source, token, company } = parsed.data;
    let jobs: NormalizedJob[] = [];

    if (source === "greenhouse") {
      if (!token) return res.status(400).json({ error: "Missing ?token=<boardToken> for Greenhouse" });
      jobs = await fetchGreenhouseJobs(token);
    } else if (source === "lever") {
      const handle = company ?? token; // allow either param name
      if (!handle) return res.status(400).json({ error: "Missing ?company=<leverCompany> (or ?token=) for Lever" });
      jobs = await fetchLeverJobs(handle);
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