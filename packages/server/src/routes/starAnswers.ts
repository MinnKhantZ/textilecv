import { Router, Request, Response } from 'express';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { Document } from '@langchain/core/documents';
import { getVectorStore } from '../lib/vectorStore.js';
import { starPrompt, loadAboutMe } from '../lib/prompts.js';
import { logGeneration } from '../lib/db.js';
import { getChatModel } from '../lib/llm.js';

const router = Router();

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { questions } = req.body as { questions?: unknown };

    if (
      !Array.isArray(questions) ||
      questions.length === 0 ||
      questions.length > 10 ||
      questions.some((q) => typeof q !== 'string' || (q as string).trim().length === 0)
    ) {
      res.status(400).json({
        error: 'questions must be a non-empty array of strings (max 10 items)',
      });
      return;
    }

    const validQuestions = (questions as string[]).map((q) => q.slice(0, 1000).trim());

    const vectorStore = await getVectorStore();

    // Use MMR per question to get diverse, relevant stories
    const seenContent = new Set<string>();
    const allDocs: Document[] = [];

    for (const question of validQuestions) {
      const docs = vectorStore.maxMarginalRelevanceSearch
        ? await vectorStore.maxMarginalRelevanceSearch(question, { k: 5, fetchK: 20 }, undefined)
        : await vectorStore.similaritySearch(question, 5);
      for (const doc of docs) {
        const key = doc.pageContent.slice(0, 120);
        if (!seenContent.has(key)) {
          seenContent.add(key);
          allDocs.push(doc);
        }
      }
    }

    const context = allDocs.map((d) => d.pageContent).join('\n\n---\n\n');
    const questionsText = validQuestions
      .map((q, i) => `Question ${i + 1}: ${q}`)
      .join('\n\n');

    const llm = await getChatModel({ modelName: 'gpt-5.4-mini', temperature: 0.4 });

    const aboutMe = loadAboutMe();
    const aboutMeSection = aboutMe
      ? `\n\n---\n\nAbout Me / Identity:\n${aboutMe}\n\n`
      : '';

    const chain = starPrompt.pipe(llm).pipe(new StringOutputParser());
    const result = await chain.invoke({ context, questions: questionsText, aboutMeSection });

    await logGeneration({
      type: 'star_answers',
      questions: validQuestions,
      outputText: result,
      compatible: true,
    });

    res.json({ result });
  } catch (error: unknown) {
    console.error('[/generate-star-answers] Error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to generate STAR answers',
    });
  }
});

export default router;
