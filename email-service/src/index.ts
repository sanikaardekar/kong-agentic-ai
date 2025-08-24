import express from "express";
import morgan from "morgan";
import cors from "cors";
import { generateEmail, refineEmail } from "./services/ollama.js";
import { DraftEmailSchema } from "./schemas/validation.js";

const app = express();
app.use(morgan("dev"));
app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => res.json({ ok: true }));

app.post("/email/draft", async (req, res) => {
  try {
    const parsed = DraftEmailSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const { jobTitle, companyName, jobDescription, applyUrl, location, userProfile, source } = parsed.data;

    try {
      const emailText = await generateEmail(
        jobTitle,
        companyName,
        jobDescription,
        userProfile,
        location,
        applyUrl
      );

      res.json({ 
        success: true,
        emailSubject: `Application for ${jobTitle} at ${companyName}`,
        emailText,
        jobDetails: {
          title: jobTitle,
          company: companyName,
          location: location,
          applyUrl: applyUrl,
          source: source
        }
      });
    } catch (ollamaError) {
      console.error("Ollama Error:", ollamaError);
      return res.status(500).json({ 
        success: false, 
        error: "Failed to generate email content", 
        details: (ollamaError as any)?.message || "Ollama API error" 
      });
    }
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ success: false, error: err?.message ?? "Failed to draft email" });
  }
});

app.post("/email/refine", async (req, res) => {
  try {
    const { currentEmail, userFeedback, jobTitle, companyName } = req.body;
    
    if (!currentEmail || !userFeedback) {
      return res.status(400).json({ error: "Missing currentEmail or userFeedback" });
    }

    const refinedEmail = await refineEmail(currentEmail, userFeedback, jobTitle, companyName);
    
    res.json({
      success: true,
      refinedEmail
    });
  } catch (error) {
    console.error('Error refining email:', error);
    res.status(500).json({ success: false, error: 'Failed to refine email' });
  }
});

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
  console.log(`email-service listening on :${port}`);
});