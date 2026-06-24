import { randomUUID } from 'crypto';

const MAX_ITEMS = 200;
const artifacts = new Map<string, string>();

export function saveResumeLatex(latex: string): string {
  const id = randomUUID();
  artifacts.set(id, latex);

  if (artifacts.size > MAX_ITEMS) {
    const firstKey = artifacts.keys().next().value as string | undefined;
    if (firstKey) {
      artifacts.delete(firstKey);
    }
  }

  return id;
}

export function getResumeLatex(id: string): string | undefined {
  return artifacts.get(id);
}
