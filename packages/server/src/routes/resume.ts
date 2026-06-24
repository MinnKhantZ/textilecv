import { Router, Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { ChatOpenAI } from '@langchain/openai';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { getVectorStore, retrieveContext } from '../lib/vectorStore.js';
import { resumePrompt, compatibilityPrompt, loadAboutMe } from '../lib/prompts.js';
import { saveResumeLatex, getResumeLatex } from '../lib/resumeArtifacts.js';
import { compileLatexToPdfBuffer } from '../lib/latex.js';
import { logGeneration } from '../lib/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SAMPLES_DIR = path.join(__dirname, '../../samples');

function loadResumeTemplate(): string {
  const templatePath = path.join(SAMPLES_DIR, 'resume_template.tex');
  return fs.readFileSync(templatePath, 'utf-8');
}

const router = Router();

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { jobDescription, forceGenerate, preferences } = req.body as {
      jobDescription?: unknown;
      forceGenerate?: unknown;
      preferences?: unknown;
    };

    if (typeof jobDescription !== 'string' || jobDescription.trim().length === 0) {
      res.status(400).json({ error: 'jobDescription must be a non-empty string' });
      return;
    }
    if (jobDescription.length > 15000) {
      res.status(400).json({ error: 'jobDescription exceeds the 15,000 character limit' });
      return;
    }

    const preferencesSection =
      typeof preferences === 'string' && preferences.trim()
        ? `\n\n---\n\nCandidate Preferences (also factor these into your fit assessment):\n${preferences.trim().slice(0, 500)}\n`
        : '';

    const vectorStore = await getVectorStore();
    const docs = await retrieveContext(vectorStore, jobDescription.trim());
    const context = docs.map((d) => d.pageContent).join('\n\n---\n\n');

    if (!forceGenerate) {
      const checkLlm = new ChatOpenAI({
        modelName: 'gpt-5.4-mini',
        temperature: 0,
        openAIApiKey: process.env.OPENAI_API_KEY,
      });
      const checkChain = compatibilityPrompt.pipe(checkLlm).pipe(new StringOutputParser());
      const checkRaw = await checkChain.invoke({ context, jobDescription, preferencesSection });
      const check = JSON.parse(checkRaw) as { compatible: boolean; reason?: string };
      if (!check.compatible) {
        res.json({ compatible: false, reason: check.reason ?? 'This role may not match your background.' });
        return;
      }
    }

    const llm = new ChatOpenAI({
      modelName: 'gpt-5.4-mini',
      temperature: 0.2,
      openAIApiKey: process.env.OPENAI_API_KEY,
    });

    const aboutMe = loadAboutMe();
    const aboutMeSection = aboutMe
      ? `\n\n---\n\nAbout Me / Identity:\n${aboutMe}\n\n`
      : '';

    const templateTex = loadResumeTemplate();
    const chain = resumePrompt.pipe(llm).pipe(new StringOutputParser());
    const latex = await chain.invoke({ context, jobDescription, aboutMeSection, templateTex });
    const resumeId = saveResumeLatex(latex);

    await logGeneration({
      type: 'resume',
      jobDescription: jobDescription.slice(0, 2000),
      outputText: latex,
      compatible: true,
      preferences: typeof preferences === 'string' ? preferences : undefined,
    });

    res.json({ compatible: true, latex, resumeId });
  } catch (error: unknown) {
    console.error('[/generate-resume] Error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to generate resume',
    });
  }
});

router.get('/pdf/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id;
    const latex = getResumeLatex(id);

    if (!latex) {
      res.status(404).json({ error: 'Resume artifact not found or expired' });
      return;
    }

    const pdfBuffer = await compileLatexToPdfBuffer(latex);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="tailored-resume-${id}.pdf"`);
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).send(pdfBuffer);
  } catch (error: unknown) {
    console.error('[/generate-resume/pdf/:id] Error:', error);
    res.status(500).json({
      error:
        error instanceof Error
          ? `Failed to compile LaTeX to PDF: ${error.message}`
          : 'Failed to compile LaTeX to PDF',
    });
  }
});

router.get('/source/:id', (req: Request, res: Response): void => {
  const id = req.params.id;
  const latex = getResumeLatex(id);

  if (!latex) {
    res.status(404).json({ error: 'Resume artifact not found or expired' });
    return;
  }

  res.json({ resumeId: id, latex });
});

/**
 * POST /generate-resume/compile
 * Accepts raw LaTeX source and returns a compiled PDF.
 * Used by the activity log to render historical resume entries as PDF.
 */
router.post('/compile', async (req: Request, res: Response): Promise<void> => {
  try {
    const { latex } = req.body as { latex?: unknown };

    if (typeof latex !== 'string' || latex.trim().length === 0) {
      res.status(400).json({ error: 'latex must be a non-empty string' });
      return;
    }
    if (latex.length > 500_000) {
      res.status(400).json({ error: 'latex exceeds the 500,000 character limit' });
      return;
    }

    const pdfBuffer = await compileLatexToPdfBuffer(latex);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="resume.pdf"');
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).send(pdfBuffer);
  } catch (error: unknown) {
    console.error('[/generate-resume/compile] Error:', error);
    res.status(500).json({
      error: error instanceof Error
        ? `Failed to compile LaTeX to PDF: ${error.message}`
        : 'Failed to compile LaTeX to PDF',
    });
  }
});

export default router;
