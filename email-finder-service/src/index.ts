import express from "express";
import morgan from "morgan";
import cors from "cors";
import { z } from "zod";
import { findCompanyEmails } from "./services/emailFinder.js";

const app = express();
app.use(morgan("dev"));
app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => res.json({ ok: true }));

const EmailSearchSchema = z.object({
  company: z.string().min(1, "Company name is required")
});

app.post("/emails", async (req, res) => {
  try {
    const parsed = EmailSearchSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ 
        error: "Missing required parameters",
        required: ["company"],
        details: parsed.error.flatten()
      });
    }

    const { company } = parsed.data;
    const emails = await findCompanyEmails(company);
    
    console.log('Sample email object:', JSON.stringify(emails[0], null, 2));

    res.json({
      company,
      totalEmails: emails.length,
      emails: emails.map(e => ({
        email: e.email,
        confidence: e.confidence,
        source: e.source,
        title: e.title
      }))
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err?.message ?? "Failed to find emails" });
  }
});

app.get("/emails/:company", async (req, res) => {
  try {
    const { company } = req.params;
    if (!company) {
      return res.status(400).json({ error: "Company name is required" });
    }

    const emails = await findCompanyEmails(company);

    res.json({
      company,
      totalEmails: emails.length,
      emails: emails.map(e => ({
        email: e.email,
        confidence: e.confidence,
        source: e.source,
        title: e.title
      }))
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err?.message ?? "Failed to find emails" });
  }
});

const port = Number(process.env.PORT ?? 5000);
app.listen(port, () => {
  console.log(`email-finder-service listening on :${port}`);
});