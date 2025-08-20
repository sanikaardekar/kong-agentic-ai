import express from "express";
import morgan from "morgan";
import cors from "cors";
import nodemailer from "nodemailer";
import { z } from "zod";
import OpenAI from "openai";
import axios from "axios";

const app = express();
app.use(morgan("dev"));
app.use(cors());
app.use(express.json({ limit: "1mb" }));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

app.get("/health", (_req, res) => res.json({ ok: true }));

const EmailSchema = z.object({
  recipient: z.string().email(),
  jobTitle: z.string(),
  companyName: z.string(),
  userProfile: z.string(),
});

const JobEmailSchema = z.object({
  recipient: z.string().email(),
  jobId: z.string(),
  source: z.enum(["greenhouse", "lever"]),
  token: z.string().optional(),
  company: z.string().optional(),
  userProfile: z.string(),
});

app.post("/send", async (req, res) => {
  try {
    const parsed = EmailSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const { recipient, jobTitle, companyName, userProfile } = parsed.data;

    let emailText;
    
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are an assistant that writes concise, professional cold emails for job applications." },
          { role: "user", content: `Write a cold email to ${companyName}'s recruiter about a ${jobTitle} position. Candidate profile: ${userProfile}` },
        ],
      });
      emailText = completion.choices[0].message?.content || "Unable to generate email content";
    } catch (openaiError) {
      // Fallback template when OpenAI fails
      emailText = `Dear Hiring Manager,

I am writing to express my interest in the ${jobTitle} position at ${companyName}. ${userProfile}

I am excited about the opportunity to contribute to your team and would welcome the chance to discuss how my skills align with your needs.

Thank you for your consideration.

Best regards,
Software Engineer`;
    }

    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: recipient,
      subject: `Application for ${jobTitle} at ${companyName}`,
      text: emailText,
    });

    res.json({ success: true, message: "Email sent successfully", emailText });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ success: false, error: err?.message ?? "Failed to send email" });
  }
});

app.post("/send-for-job", async (req, res) => {
  try {
    const parsed = JobEmailSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const { recipient, jobId, source, token, company, userProfile } = parsed.data;

    // Fetch jobs from job service
    const jobServiceUrl = process.env.JOB_SERVICE_URL || "http://job-service:3000";
    let jobsResponse;
    
    if (source === "greenhouse" && token) {
      jobsResponse = await axios.get(`${jobServiceUrl}/jobs?source=greenhouse&token=${token}`);
    } else if (source === "lever" && company) {
      jobsResponse = await axios.get(`${jobServiceUrl}/jobs?source=lever&company=${company}`);
    } else {
      return res.status(400).json({ error: "Missing required parameters for job source" });
    }

    // Find the specific job
    const job = jobsResponse.data.jobs.find((j: any) => j.id === jobId);
    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    // Extract job description from raw data
    const jobDescription = job.raw?.descriptionPlain || job.raw?.description || "No description available";
    const responsibilities = job.raw?.lists?.[0]?.content || "";
    
    let emailText;
    
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { 
            role: "system", 
            content: "You are an expert at writing personalized, professional cold emails for job applications. Write concise, engaging emails that highlight relevant experience and show genuine interest in the specific role and company." 
          },
          { 
            role: "user", 
            content: `Write a personalized cold email for this job application:

Job Title: ${job.title}
Company: ${job.company}
Location: ${job.location || "Remote/Not specified"}
Apply URL: ${job.applyUrl}

Job Description:
${jobDescription}

Responsibilities:
${responsibilities}

Candidate Profile:
${userProfile}

Write a professional email that:
1. Shows specific interest in this role and company
2. Highlights relevant skills from the candidate profile that match the job requirements
3. Mentions specific technologies or responsibilities from the job description
4. Includes the application URL
5. Keeps it concise but engaging` 
          },
        ],
      });
      emailText = completion.choices[0].message?.content || "Unable to generate email content";
    } catch (openaiError) {
      console.error("OpenAI Error:", openaiError);
      // Enhanced fallback template with job details
      emailText = `Dear Hiring Manager,

I am writing to express my strong interest in the ${job.title} position at ${job.company}. ${userProfile}

Based on the job description, I am particularly excited about the opportunity to work with the technologies and responsibilities outlined in this role. My experience aligns well with your requirements, and I am eager to contribute to your team's success.

I would welcome the opportunity to discuss how my skills and passion can benefit ${job.company}.

Application Link: ${job.applyUrl}

Thank you for your consideration.

Best regards,
Software Engineer`;
    }

    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: recipient,
      subject: `Application for ${job.title} at ${job.company}`,
      text: emailText,
    });

    res.json({ 
      success: true, 
      message: "Email sent successfully", 
      emailText,
      jobDetails: {
        title: job.title,
        company: job.company,
        location: job.location,
        applyUrl: job.applyUrl
      }
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ success: false, error: err?.message ?? "Failed to send email" });
  }
});

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
  console.log(`email-service listening on :${port}`);
});