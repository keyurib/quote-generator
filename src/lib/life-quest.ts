/**
 * Life Quest content layer.
 *
 * `src/data/life-quest-content.json` is the single source of truth for every
 * category and lesson. This module only types it, indexes it, and derives
 * values (like the daily quest) from it. It never adds or rewrites content.
 */
import content from "@/data/life-quest-content.json";

export interface LessonCategory {
  id: string;
  name: string;
  sourcePart: number;
  sourceThemes: string[];
}

export interface Lesson {
  id: string;
  categoryId: string;
  category: string;
  title: string;
  quote: string;
  action: string;
  reflection: string;
  sourcePart: number;
  sourceThemes: string[];
  attribution: string;
}

export interface SourceBook {
  title: string;
  authors: string[];
  editionYear: number;
}

export const APP_NAME: string = content.app;
export const CONTENT_NOTE: string = content.contentNote;
export const SOURCE_BOOK: SourceBook = content.sourceBook;

export const CATEGORIES: LessonCategory[] = content.categories;
export const LESSONS: Lesson[] = content.lessons;

const lessonById = new Map(LESSONS.map((l) => [l.id, l]));
const categoryById = new Map(CATEGORIES.map((c) => [c.id, c]));

// Fail loudly in development if the content file ever drifts out of shape.
if (process.env.NODE_ENV !== "production") {
  for (const l of LESSONS) {
    if (!categoryById.has(l.categoryId)) {
      throw new Error(`Lesson ${l.id} points to unknown category "${l.categoryId}"`);
    }
  }
  if (lessonById.size !== LESSONS.length) throw new Error("Duplicate lesson ids in content file");
}

export const getLesson = (id: string) => lessonById.get(id);
export const getCategory = (id: string) => categoryById.get(id);

export function lessonsIn(categoryId: string | "all"): Lesson[] {
  return categoryId === "all" ? LESSONS : LESSONS.filter((l) => l.categoryId === categoryId);
}

/** Local calendar date as YYYY-MM-DD. */
export function todayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/* ---------- Daily Quest rotation ----------
 * A fixed, shuffled order of all lessons that every visitor shares.
 * - Each lesson appears exactly once per cycle (one cycle = LESSONS.length days).
 * - Lessons are dealt round-robin across categories, so every path gets equal days
 *   and the same path never comes up two days in a row.
 */

function seededRandom(seed: number) {
  // mulberry32: tiny deterministic PRNG, so the order is identical for everyone
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(items: T[], rand: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildDailyRotation(): Lesson[] {
  const rand = seededRandom(20261123);
  const decks = CATEGORIES.map((c) => seededShuffle(lessonsIn(c.id), rand));
  const rounds = Math.max(...decks.map((d) => d.length));
  const order: Lesson[] = [];
  for (let r = 0; r < rounds; r++) {
    let round = seededShuffle(
      decks.filter((d) => r < d.length).map((d) => d[r]),
      rand
    );
    // Avoid the same category across the seam between two rounds.
    const last = order[order.length - 1];
    if (last && round.length > 1 && round[0].categoryId === last.categoryId) {
      round = [...round.slice(1), round[0]];
    }
    order.push(...round);
  }
  return order;
}

const DAILY_ROTATION = buildDailyRotation();

/** Days since 1 Jan 1970 for a YYYY-MM-DD key (calendar days, unaffected by time zones or DST). */
function dayNumber(dateKey: string) {
  const [y, m, d] = dateKey.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

/** Today's Daily Quest: the same lesson for everyone on a given date, rotating fairly through all lessons. */
export function dailyLesson(dateKey = todayKey()): Lesson {
  const n = DAILY_ROTATION.length;
  return DAILY_ROTATION[((dayNumber(dateKey) % n) + n) % n];
}

/** Count consecutive days (ending today or yesterday) present in a list of date keys. */
export function streakFrom(dateKeys: string[]): number {
  const set = new Set(dateKeys);
  const d = new Date();
  if (!set.has(todayKey(d))) d.setDate(d.getDate() - 1);
  let streak = 0;
  while (set.has(todayKey(d))) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}
