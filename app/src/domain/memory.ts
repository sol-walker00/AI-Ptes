import type { MemorySummary } from './petTypes';

export const emptyMemory = (nowIso: string): MemorySummary => ({
  facts: [],
  recentSummary: '',
  updatedAt: nowIso,
});

export function updateMemorySummary(
  memory: MemorySummary,
  newFact: string,
  nowIso: string,
): MemorySummary {
  const trimmedFact = newFact.trim();
  const facts = trimmedFact.length > 0 ? [...memory.facts, trimmedFact].slice(-6) : memory.facts.slice(-6);
  const recentSummary = [memory.recentSummary, trimmedFact]
    .filter((part) => part.trim().length > 0)
    .join(' ')
    .slice(-600);

  return {
    facts,
    recentSummary,
    updatedAt: nowIso,
  };
}
