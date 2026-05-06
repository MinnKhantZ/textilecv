import { Router, Request, Response } from 'express';
import { ChatOpenAI } from '@langchain/openai';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { getVectorStore } from '../lib/vectorStore';
import { coverLetterPrompt, compatibilityPrompt, loadAboutMe } from '../lib/prompts';
import { logGeneration } from '../lib/db';

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
    const docs = await vectorStore.similaritySearch(jobDescription.trim(), 10);
    const context = docs.map((d) => d.pageContent).join('\n\n---\n\n');

    if (!forceGenerate) {
      const checkLlm = new ChatOpenAI({
        modelName: 'gpt-4o-mini',
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
      modelName: 'gpt-4o',
      temperature: 0.5,
      openAIApiKey: process.env.OPENAI_API_KEY,
    });

    const aboutMe = loadAboutMe();
    const aboutMeSection = aboutMe
      ? `\n\n---\n\nAbout Me / Identity:\n${aboutMe}\n\n`
      : '';

    const chain = coverLetterPrompt.pipe(llm).pipe(new StringOutputParser());
    const result = await chain.invoke({ context, jobDescription, aboutMeSection });

    await logGeneration({
      type: 'cover_letter',
      jobDescription: jobDescription.slice(0, 2000),
      outputText: result,
      compatible: true,
      preferences: typeof preferences === 'string' ? preferences : undefined,
    });

    res.json({ compatible: true, result });
  } catch (error: unknown) {
    console.error('[/generate-cover-letter] Error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to generate cover letter',
    });
  }
});

export default router;
