import type { DailyCare, DailyTask, DailyTaskKind, PetEvent, PetJournalEntry, PetState } from './petTypes';

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

const dayKey = (iso: string) => iso.slice(0, 10);

const taskTemplates: Array<Omit<DailyTask, 'id' | 'completedAt'>> = [
  { kind: 'feed', label: '喂一次', rewardCoins: 6, rewardExperience: 10 },
  { kind: 'chat', label: '陪聊一次', rewardCoins: 8, rewardExperience: 12 },
  { kind: 'focus', label: '完成一个专注任务', rewardCoins: 16, rewardExperience: 24 },
  { kind: 'rest', label: '让宠物休息', rewardCoins: 6, rewardExperience: 10 },
  { kind: 'reflect', label: '记录一句今天的心情', rewardCoins: 10, rewardExperience: 14 },
];

export function createDailyTasks(date: string): DailyTask[] {
  return taskTemplates.map((task) => ({
    ...task,
    id: `${date}-${task.kind}`,
  }));
}

export function ensureDailyCare(care: DailyCare | null | undefined, nowIso: string): DailyCare {
  const date = dayKey(nowIso);
  if (care?.date === date) return care;
  return { date, tasks: createDailyTasks(date) };
}

export function completeDailyTask(care: DailyCare, kind: DailyTaskKind, completedAt: string): DailyCare {
  return {
    ...care,
    tasks: care.tasks.map((task) =>
      task.kind === kind && !task.completedAt
        ? { ...task, completedAt }
        : task,
    ),
  };
}

export function taskRewardFor(care: DailyCare, kind: DailyTaskKind): DailyTask | undefined {
  return care.tasks.find((task) => task.kind === kind && !task.completedAt);
}

export function applyTaskRewardToState(state: PetState, task: DailyTask | undefined): PetState {
  if (!task) return state;
  const experience = clamp(state.experience + task.rewardExperience);
  const level = experience >= 100 ? Math.max(state.level, 2) : state.level;

  return {
    ...state,
    coins: clamp(state.coins + task.rewardCoins),
    experience,
    level,
    lifeStage: level >= 2 ? 'teen' : state.lifeStage,
    trust: clamp(state.trust + 1),
  };
}

export function taskForEventKind(kind: PetEvent['kind']): DailyTaskKind | null {
  if (kind === 'feed' || kind === 'chat' || kind === 'focus' || kind === 'rest' || kind === 'reflect') return kind;
  return null;
}

export function createJournalEntry(
  createdAt: string,
  state: PetState,
  events: PetEvent[],
  remembered: string[],
): PetJournalEntry {
  const date = dayKey(createdAt);
  const dayEvents = events.filter((event) => dayKey(event.createdAt) === date);
  const notesFor = (kind: PetEvent['kind']) =>
    dayEvents
      .filter((event) => event.kind === kind)
      .map((event) => event.note || fallbackNote(kind))
      .slice(0, 4);

  return {
    date,
    createdAt,
    meals: notesFor('feed'),
    conversations: notesFor('chat'),
    moodTrail: Array.from(new Set([state.mood, ...dayEvents.map((event) => event.kind)])).slice(0, 5),
    remembered: remembered.slice(0, 5),
    relationship: `亲密 ${state.intimacy}，信任 ${state.trust}，成长阶段 ${state.lifeStage}`,
  };
}

function fallbackNote(kind: PetEvent['kind']) {
  switch (kind) {
    case 'feed':
      return '吃了一顿饭';
    case 'chat':
      return '聊了一会儿';
    case 'focus':
      return '一起专注了一段时间';
    case 'rest':
      return '好好休息了一下';
    case 'reflect':
      return '记录了今天的心情';
    default:
      return '一起度过了一个小片段';
  }
}
