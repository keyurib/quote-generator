"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Badge } from "@/components/ui/8bit/badge";
import { Button } from "@/components/ui/8bit/button";
import { Card } from "@/components/ui/8bit/card";
import HealthBar from "@/components/ui/8bit/health-bar";
import { Kbd } from "@/components/ui/8bit/kbd";
import ManaBar from "@/components/ui/8bit/mana-bar";
import { ScrollArea } from "@/components/ui/8bit/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/8bit/select";
import { Spinner } from "@/components/ui/8bit/spinner";
import { toast } from "@/components/ui/8bit/toast";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/8bit/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/8bit/tooltip";
import XpBar from "@/components/ui/8bit/xp-bar";
import { PixelIcon, type PixelIconName } from "@/components/pixel";
import { FAVORITES, themeFor } from "@/lib/category-theme";
import {
  APP_NAME,
  CATEGORIES,
  CONTENT_NOTE,
  LESSONS,
  SOURCE_BOOK,
  type Lesson,
  dailyLesson,
  getLesson,
  lessonsIn,
  streakFrom,
  todayKey,
} from "@/lib/life-quest";
import { sfx } from "@/lib/sfx";
import { cn } from "@/lib/utils";

const XP_DISCOVER = 10;
const XP_NEW_BONUS = 15;
const XP_COMPLETE = 25;
const XP_DAILY_BONUS = 50;
const XP_PER_LEVEL = 100;
const STORAGE_KEY = "life-quest:v1";
const TOTAL = LESSONS.length;
const INK = "#2a1d12"; // dark ink used on top of bright category colours

type Filter = string; // a category id or "all"
type Palette = "parchment" | "arcade" | "gameboy" | "sunset";

interface SaveData {
  xp: number;
  seen: string[];
  favorites: string[];
  completed: string[];
  dailyLog: string[];
  muted: boolean;
  theme: Palette;
}

function shuffle<T>(arr: T[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const pad = (n: number, len: number) => String(n).padStart(len, "0");

/** Position of a lesson inside its category, e.g. 3 of 5. */
function lessonPosition(l: Lesson) {
  const list = lessonsIn(l.categoryId);
  return { index: list.findIndex((x) => x.id === l.id) + 1, total: list.length };
}

export default function LifeQuest() {
  const [filter, setFilter] = useState<Filter>("all");
  const [current, setCurrent] = useState<Lesson | null>(null);
  const [typed, setTyped] = useState(0);
  const [loading, setLoading] = useState(false);
  const [flashKey, setFlashKey] = useState(0);
  const [isNew, setIsNew] = useState(false);

  const [xp, setXp] = useState(0);
  const [seen, setSeen] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [completed, setCompleted] = useState<string[]>([]);
  const [dailyLog, setDailyLog] = useState<string[]>([]);
  const [muted, setMuted] = useState(false);
  const [palette, setPalette] = useState<Palette>("parchment");
  const [levelFlash, setLevelFlash] = useState(false);
  const [today, setToday] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const bags = useRef<Record<string, string[]>>({});
  const lessonRef = useRef<HTMLDivElement>(null);
  const mutedRef = useRef(muted);
  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);
  const favoritesRef = useRef(favorites);
  useEffect(() => {
    favoritesRef.current = favorites;
  }, [favorites]);

  const play = useCallback((name: keyof typeof sfx) => {
    if (!mutedRef.current) sfx[name]();
  }, []);

  /* ---------- persistence ---------- */
  // Restore the saved game after mount (localStorage and the local date aren't available during SSR).
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const d = JSON.parse(raw) as Partial<SaveData>;
        // Keep only ids that still exist in the content file.
        const valid = (ids: unknown) =>
          Array.isArray(ids) ? ids.filter((id): id is string => typeof id === "string" && !!getLesson(id)) : [];
        if (typeof d.xp === "number") setXp(d.xp);
        setSeen(valid(d.seen));
        setFavorites(valid(d.favorites));
        setCompleted(valid(d.completed));
        if (Array.isArray(d.dailyLog)) setDailyLog(d.dailyLog.filter((x) => typeof x === "string"));
        if (typeof d.muted === "boolean") setMuted(d.muted);
        if (d.theme) setPalette(d.theme);
      }
    } catch {
      /* storage unavailable: start fresh */
    }
    setToday(todayKey());
    setHydrated(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!hydrated) return;
    try {
      const data: SaveData = { xp, seen, favorites, completed, dailyLog, muted, theme: palette };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      /* ignore */
    }
  }, [xp, seen, favorites, completed, dailyLog, muted, palette, hydrated]);

  useEffect(() => {
    document.documentElement.dataset.palette = palette;
  }, [palette]);

  /* ---------- typewriter ---------- */
  useEffect(() => {
    if (!current) return;
    const len = current.quote.length;
    let i = 0;
    const id = window.setInterval(() => {
      i++;
      setTyped(i);
      if (i % 3 === 0) play("tick");
      if (i >= len) window.clearInterval(id);
    }, 22);
    return () => window.clearInterval(id);
  }, [current, play]);

  const typingDone = current ? typed >= current.quote.length : true;

  /* ---------- daily quest ---------- */
  const daily = useMemo(() => (today ? dailyLesson(today) : null), [today]);
  const dailyDone = !!today && dailyLog.includes(today);
  const streak = useMemo(() => streakFrom(dailyLog), [dailyLog]);

  /* ---------- discovery (shuffle bag: no repeats until a category is exhausted) ---------- */
  const draw = useCallback((f: Filter, avoid?: string) => {
    const pool = f === FAVORITES ? favoritesRef.current : lessonsIn(f).map((l) => l.id);
    // Drop anything no longer in the pool (e.g. a lesson removed from favourites).
    let bag = (bags.current[f] ?? []).filter((id) => pool.includes(id));
    if (bag.length === 0) {
      bag = shuffle(pool);
      if (bag.length > 1 && bag[bag.length - 1] === avoid) bag.unshift(bag.pop()!);
    }
    const id = bag.pop()!;
    bags.current[f] = bag;
    return getLesson(id)!;
  }, []);

  const gainXp = useCallback((amount: number) => {
    setXp((prev) => prev + amount);
  }, []);

  // Celebrate level-ups from the derived level, not inside the state updater
  // (React may run updaters twice, which showed the toast twice).
  const level = Math.floor(xp / XP_PER_LEVEL) + 1;
  const levelSeenRef = useRef<number | null>(null);
  useEffect(() => {
    if (!hydrated) return;
    if (levelSeenRef.current === null) {
      levelSeenRef.current = level; // first value after loading the save: no celebration
      return;
    }
    if (level > levelSeenRef.current) {
      play("levelUp");
      setLevelFlash(true);
      toast(`★ LEVEL UP! YOU REACHED LV ${pad(level, 2)} ★`);
      const t = window.setTimeout(() => setLevelFlash(false), 1600);
      levelSeenRef.current = level;
      return () => window.clearTimeout(t);
    }
    levelSeenRef.current = level;
  }, [level, hydrated, play]);

  const showLesson = useCallback(
    (l: Lesson, award = true) => {
      setCurrent(l);
      setTyped(0);
      setFlashKey((k) => k + 1);
      // However a lesson was opened (daily or random), it counts as drawn in every
      // shuffle bag, so it won't come up again until the rest of that path has been shown.
      for (const key of Object.keys(bags.current)) {
        bags.current[key] = bags.current[key].filter((id) => id !== l.id);
      }
      const firstTime = !seen.includes(l.id);
      setIsNew(firstTime);
      if (firstTime) setSeen((s) => [...s, l.id]);
      if (award) gainXp(XP_DISCOVER + (firstTime ? XP_NEW_BONUS : 0));
    },
    [seen, gainXp]
  );

  const transition = useCallback(
    (pick: () => Lesson, award = true) => {
      if (loading) return;
      play("next");
      setLoading(true);
      window.setTimeout(() => {
        showLesson(pick(), award);
        setLoading(false);
      }, 380);
    },
    [loading, play, showLesson]
  );

  const next = useCallback(
    (f: Filter = filter) => {
      if (f === FAVORITES && favoritesRef.current.length === 0) {
        play("bonk");
        toast("NO FAVOURITES YET. PRESS F ON A LESSON TO SAVE IT");
        return;
      }
      // A category path ends once each of its lessons has been shown this round.
      // Instead of reshuffling the same path, move on to the next one in order.
      const isCategory = f !== "all" && f !== FAVORITES;
      const roundBag = bags.current[f];
      if (isCategory && roundBag && roundBag.length === 0) {
        const idx = CATEGORIES.findIndex((c) => c.id === f);
        const from = CATEGORIES[idx];
        const to = CATEGORIES[(idx + 1) % CATEGORIES.length];
        delete bags.current[to.id]; // start the next path fresh
        setFilter(to.id);
        toast(`★ ${from.name.toUpperCase()} PATH CLEARED! ON TO ${to.name.toUpperCase()} ★`);
        requestAnimationFrame(() =>
          document
            .querySelector(`[role=radio][aria-label^="${CSS.escape(to.name)}:"]`)
            ?.scrollIntoView({ block: "nearest", behavior: "smooth" })
        );
        transition(() => draw(to.id, current?.id));
        return;
      }
      transition(() => draw(f, current?.id));
    },
    [transition, draw, filter, current, play]
  );

  const openDaily = useCallback(() => {
    if (!daily) return;
    if (current?.id === daily.id) return;
    transition(() => daily);
  }, [daily, current, transition]);

  /* ---------- actions ---------- */
  const isFav = current ? favorites.includes(current.id) : false;
  const isDone = current ? completed.includes(current.id) : false;
  const isDaily = !!current && !!daily && current.id === daily.id;
  const canClaimDaily = isDaily && !dailyDone;

  const toggleFavorite = useCallback(() => {
    if (!current) return;
    if (favorites.includes(current.id)) {
      setFavorites((f) => f.filter((id) => id !== current.id));
      if (filter === FAVORITES && favorites.length === 1) setFilter("all");
      play("bonk");
      toast("REMOVED FROM FAVOURITES");
      return;
    }
    setFavorites((f) => [...f, current.id]);
    play("coin");
    toast("♥ SAVED TO FAVOURITES");
  }, [current, favorites, filter, play]);

  const toggleComplete = useCallback(() => {
    if (!current || !today) return;
    if (canClaimDaily) {
      if (!isDone) setCompleted((c) => [...c, current.id]);
      const nextLog = [...dailyLog, today];
      setDailyLog(nextLog);
      gainXp((isDone ? 0 : XP_COMPLETE) + XP_DAILY_BONUS);
      play("levelUp");
      toast(`DAILY QUEST CLEARED! +${(isDone ? 0 : XP_COMPLETE) + XP_DAILY_BONUS} XP · STREAK ${streakFrom(nextLog)}`);
      return;
    }
    if (isDone) {
      setCompleted((c) => c.filter((id) => id !== current.id));
      play("bonk");
      toast("MARKED AS NOT DONE");
      return;
    }
    setCompleted((c) => [...c, current.id]);
    gainXp(XP_COMPLETE);
    play("coin");
    toast(`QUEST COMPLETE! +${XP_COMPLETE} XP`);
  }, [current, today, canClaimDaily, isDone, dailyLog, gainXp, play]);

  const lessonText = (l: Lesson) =>
    `${l.title}\n"${l.quote}"\nQuest: ${l.action}\nReflect: ${l.reflection}\n— ${APP_NAME}`;

  const copy = useCallback(async () => {
    if (!current) return;
    try {
      await navigator.clipboard.writeText(lessonText(current));
      play("select");
      toast("COPIED TO CLIPBOARD!");
    } catch {
      play("bonk");
      toast("COPY FAILED. TRY AGAIN");
    }
  }, [current, play]);

  const share = useCallback(async () => {
    if (!current) return;
    const text = `"${current.quote}" — ${APP_NAME}`;
    play("select");
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ text: lessonText(current) });
      } catch {
        /* share sheet dismissed */
      }
      return;
    }
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  }, [current, play]);

  const changeFilter = (v: string) => {
    if (!v) return; // radix toggle group emits "" when clicking the active item
    if (v === FAVORITES && favorites.length === 0) {
      play("bonk");
      toast("NO FAVOURITES YET. PRESS F ON A LESSON TO SAVE IT");
      return;
    }
    setFilter(v);
    play("select");
    delete bags.current[v]; // choosing a path always starts a fresh round of it
    if (current) next(v);
    // Hand focus back to the lesson so Space / → draw the next lesson instead of
    // acting on the path list (which would otherwise switch paths).
    requestAnimationFrame(() => lessonRef.current?.focus({ preventScroll: true }));
  };

  const skipTyping = () => {
    if (current && !typingDone) setTyped(current.quote.length);
  };

  /* ---------- keyboard ---------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target instanceof Element ? e.target : null;
      if (target?.closest("input, textarea, select, [role=listbox]")) return;
      const interactive = target?.closest("button, a, [role=combobox], [role=radio], [role=tab]");
      const k = e.key.toLowerCase();
      if ((k === " " || k === "enter" || k === "arrowright") && interactive) return;
      switch (k) {
        case " ":
        case "enter":
        case "n":
        case "arrowright":
          e.preventDefault();
          if (current && !typingDone) skipTyping();
          else next();
          break;
        case "t":
          openDaily();
          break;
        case "d":
          toggleComplete();
          break;
        case "f":
          toggleFavorite();
          break;
        case "c":
          void copy();
          break;
        case "s":
          void share();
          break;
        case "m":
          setMuted((m) => !m);
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  /* ---------- derived ---------- */
  const xpInLevel = xp % XP_PER_LEVEL;
  const theme = current ? themeFor(current.categoryId) : themeFor(filter);
  const pos = current ? lessonPosition(current) : null;

  return (
    <div className="scene relative flex min-h-dvh flex-col lg:h-dvh lg:overflow-hidden">
      {/* background layers (hidden in the parchment theme) */}
      <div aria-hidden className="stars pointer-events-none absolute inset-0" />
      <div aria-hidden className="stars stars-2 pointer-events-none absolute inset-0" />
      <div aria-hidden className="floor pointer-events-none absolute inset-x-[-50%] bottom-0 h-[45vh]" />

      <div className="relative z-10 flex min-h-0 flex-1 flex-col gap-6 p-4 md:p-5">
        {/* ================= TOP BAR ================= */}
        <Card className="glow-box shrink-0 gap-0 py-0 ring-0">
          <header className="flex flex-wrap items-center gap-x-6 gap-y-4 px-4 py-3 xl:flex-nowrap">
            <h1 className="retro logo-text shrink-0 text-lg leading-none md:text-2xl">LIFE QUEST</h1>

            {/* stats */}
            <section
              aria-label="Player stats"
              className="grid min-w-0 flex-1 grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-3 xl:max-w-3xl"
            >
              <StatBar label={`LV ${pad(level, 2)} · XP`} value={`${xpInLevel}/${XP_PER_LEVEL}`}>
                <XpBar value={levelFlash ? 100 : xpInLevel} variant="retro" className="h-3" />
              </StatBar>
              <StatBar label="QUESTS DONE" value={`${completed.length}/${TOTAL}`}>
                <ManaBar value={(completed.length / TOTAL) * 100} variant="retro" className="h-3" />
              </StatBar>
              <StatBar label="FAVOURITES" value={`${favorites.length}/${TOTAL}`}>
                <HealthBar value={(favorites.length / TOTAL) * 100} variant="retro" className="h-3" />
              </StatBar>
            </section>

            <div className="retro flex shrink-0 items-center gap-3 text-[0.5625rem]">
              <Chip icon="star" label="SCORE" value={pad(xp, 5)} />
              <Chip icon="flame" label="STREAK" value={pad(streak, 2)} />
            </div>

            {/* navigation + settings */}
            <nav aria-label="Main" className="flex shrink-0 flex-wrap items-center gap-4 xl:ml-auto">
              <Button size="sm" className="text-[0.5625rem]" onClick={openDaily} disabled={!daily}>
                <PixelIcon name="sun" className="size-3" />
                TODAY
              </Button>
              <Button size="sm" variant="secondary" className="text-[0.5625rem]" onClick={() => next()}>
                <PixelIcon name="dice" className="size-3" />
                RANDOM
              </Button>
              <Select value={palette} onValueChange={(v) => setPalette(v as Palette)}>
                <SelectTrigger className="h-8 w-34 text-[0.5625rem]" aria-label="Theme">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="parchment" className="text-[0.5625rem]">PARCHMENT</SelectItem>
                  <SelectItem value="arcade" className="text-[0.5625rem]">ARCADE</SelectItem>
                  <SelectItem value="gameboy" className="text-[0.5625rem]">POCKET</SelectItem>
                  <SelectItem value="sunset" className="text-[0.5625rem]">SUNSET</SelectItem>
                </SelectContent>
              </Select>
              <IconAction
                icon={muted ? "soundOff" : "soundOn"}
                label={muted ? "Sound on" : "Mute"}
                hotkey="M"
                onClick={() => setMuted((m) => !m)}
              />
            </nav>
          </header>
        </Card>

        {/* ================= MAIN DASHBOARD ================= */}
        <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-[minmax(16rem,21rem)_minmax(0,1fr)]">
          {/* ---------- LEFT: daily quest + paths ---------- */}
          <div className="flex min-h-0 flex-col gap-6">
            {daily && (
              <Panel title="DAILY QUEST" icon="sun" tone="var(--accent)" ink="var(--accent-foreground)" className="shrink-0">
                <div className="flex flex-col gap-3 p-4">
                  <div className="flex items-start gap-3">
                    <IconTile icon={themeFor(daily.categoryId).icon} color={themeFor(daily.categoryId).color} size="lg" />
                    <div className="flex min-w-0 flex-col gap-1">
                      <span className="font-sans text-2xl leading-none">{daily.title}</span>
                      <span className="retro text-[0.5rem] text-muted-foreground">
                        {daily.category.toUpperCase()} · +{XP_DAILY_BONUS} XP
                      </span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={dailyDone ? "secondary" : "default"}
                    className="w-full text-[0.5625rem]"
                    onClick={openDaily}
                    disabled={isDaily}
                  >
                    {dailyDone ? "✓ CLEARED · REVISIT" : isDaily ? "IN PROGRESS" : "START QUEST"}
                  </Button>
                </div>
              </Panel>
            )}

            <Panel title="PATHS" icon="flag" tone="var(--secondary)" ink="var(--secondary-foreground)" className="min-h-0 flex-1">
              <ScrollArea className="min-h-0 flex-1">
                <ToggleGroup
                  type="single"
                  orientation="vertical"
                  value={filter}
                  onValueChange={changeFilter}
                  className="flex flex-col items-stretch gap-2 p-3"
                  aria-label="Choose a path"
                >
                  <PathItem
                    value="all"
                    name="All paths"
                    ids={LESSONS.map((l) => l.id)}
                    seen={seen}
                    completed={completed}
                  />
                  <PathItem
                    value={FAVORITES}
                    name="Favourites"
                    ids={favorites}
                    seen={seen}
                    completed={completed}
                    emptyHint="PRESS F TO SAVE"
                  />
                  {CATEGORIES.map((c) => (
                    <PathItem
                      key={c.id}
                      value={c.id}
                      name={c.name}
                      ids={lessonsIn(c.id).map((l) => l.id)}
                      seen={seen}
                      completed={completed}
                    />
                  ))}
                </ToggleGroup>
              </ScrollArea>
              <PipLegend />
            </Panel>
          </div>

          {/* ---------- CENTRE: lesson ---------- */}
          <Panel
            title={current ? (isDaily ? "TODAY'S QUEST" : "LESSON") : "WELCOME, ADVENTURER"}
            icon={current ? theme.icon : "sun"}
            tone="var(--primary)"
            ink="var(--primary-foreground)"
            className="min-h-[520px] lg:min-h-0"
          >
            <div className="flex min-h-0 flex-1 flex-col">
              <div ref={lessonRef} tabIndex={-1} aria-label="Lesson" className="flex min-h-0 flex-1 flex-col outline-none">
              <ScrollArea className="min-h-0 flex-1">
                <div className="px-5 py-5 md:px-8 md:py-6">
                  {loading ? (
                    <div className="flex min-h-[320px] flex-col items-center justify-center gap-4">
                      <Spinner variant="diamond" className="size-10 text-primary" />
                      <p className="retro blink text-xs">LOADING...</p>
                    </div>
                  ) : current && pos ? (
                    <article key={flashKey} className="flash mx-auto flex w-full max-w-5xl flex-col gap-5" aria-labelledby="lesson-title">
                      <div className="flex flex-wrap items-center gap-4">
                        <Badge className="text-[0.5625rem]" style={{ background: theme.color, color: INK }}>
                          {current.category.toUpperCase()}
                        </Badge>
                        {isDaily && <Badge className="bg-accent text-accent-foreground text-[0.5625rem]">DAILY</Badge>}
                        {isNew && <Badge className="pop bg-primary text-primary-foreground text-[0.5625rem]">NEW!</Badge>}
                        {isDone && <Badge className="bg-secondary text-secondary-foreground text-[0.5625rem]">✓ DONE</Badge>}
                        <span className="retro ml-auto text-[0.5625rem] text-muted-foreground">
                          LESSON {pos.index}/{pos.total}
                        </span>
                      </div>

                      <div className="flex items-center gap-4">
                        <IconTile icon={theme.icon} color={theme.color} size="lg" />
                        <h2 id="lesson-title" className="retro text-sm leading-relaxed md:text-lg">
                          {current.title}
                        </h2>
                      </div>

                      <blockquote
                        onClick={skipTyping}
                        className="relative cursor-pointer select-text"
                        title={typingDone ? undefined : "Click to skip"}
                      >
                        <PixelIcon name="quote" className="mb-2 size-6 text-primary" />
                        <p className="sr-only" aria-live="polite">
                          {current.quote}
                        </p>
                        <p aria-hidden className="font-sans text-3xl leading-tight md:text-[2.6rem]">
                          {current.quote.slice(0, typed)}
                          {!typingDone && <span className="caret" />}
                          <span className="invisible">{current.quote.slice(typed)}</span>
                        </p>
                      </blockquote>

                      <div
                        className={cn(
                          "grid gap-5 transition-opacity xl:grid-cols-2",
                          typingDone ? "opacity-100" : "opacity-0"
                        )}
                      >
                        <SubPanel icon="sword" label="YOUR QUEST" tone={theme.color}>
                          {current.action}
                        </SubPanel>
                        <SubPanel icon="bulb" label="REFLECT" tone="var(--accent)">
                          {current.reflection}
                        </SubPanel>
                      </div>

                      <p className="font-sans text-lg leading-snug text-muted-foreground">{current.attribution}</p>
                    </article>
                  ) : (
                    <button
                      type="button"
                      onClick={openDaily}
                      disabled={!daily}
                      className="flex min-h-[320px] w-full flex-col items-center justify-center gap-6 outline-none focus-visible:ring-4 focus-visible:ring-primary"
                    >
                      <PixelIcon name="sun" className="float size-16 text-accent" />
                      <span className="retro blink text-sm text-primary md:text-base">PRESS START</span>
                      <span className="max-w-md font-sans text-2xl leading-tight text-muted-foreground">
                        {TOTAL} lessons across {CATEGORIES.length} paths. Begin with today&apos;s quest, or roll a
                        random lesson.
                      </span>
                    </button>
                  )}
                </div>
              </ScrollArea>
              </div>

              {/* controls */}
              <div className="flex shrink-0 flex-wrap items-center justify-center gap-5 border-t-4 border-foreground/25 px-5 py-4 md:justify-between">
                <div className="flex flex-wrap items-center justify-center gap-5">
                  {current ? (
                    <Button
                      onClick={toggleComplete}
                      disabled={loading}
                      aria-pressed={isDone}
                      variant={isDone && !canClaimDaily ? "secondary" : "default"}
                      className="text-[0.625rem]"
                    >
                      <PixelIcon name="check" className="size-3" />
                      {canClaimDaily ? "COMPLETE DAILY QUEST" : isDone ? "COMPLETED" : "COMPLETE QUEST"}
                    </Button>
                  ) : (
                    <Button onClick={openDaily} disabled={!daily} className="text-[0.625rem]">
                      <PixelIcon name="play" className="size-3" />
                      START
                    </Button>
                  )}
                  {current && (
                    <Button variant="outline" onClick={() => next()} disabled={loading} className="text-[0.625rem]">
                      <PixelIcon name="dice" className="size-3" />
                      NEXT LESSON
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <IconAction icon="copy" label="Copy" hotkey="C" onClick={copy} disabled={!current} />
                  <IconAction
                    icon="heart"
                    label={isFav ? "Remove favourite" : "Favourite"}
                    hotkey="F"
                    onClick={toggleFavorite}
                    disabled={!current}
                    active={isFav}
                  />
                  <IconAction icon="share" label="Share" hotkey="S" onClick={share} disabled={!current} />
                </div>
              </div>
            </div>
          </Panel>

        </div>

        {/* ================= FOOTER ================= */}
        <footer className="scene-ink flex shrink-0 flex-col items-center justify-between gap-3 text-center lg:flex-row lg:text-left">
          <div className="retro flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[0.5rem] opacity-90">
            <Legend k="SPACE" label="RANDOM" />
            <Legend k="T" label="TODAY" />
            <Legend k="D" label="DONE" />
            <Legend k="F" label="FAVE" />
            <Legend k="C" label="COPY" />
            <Legend k="S" label="SHARE" />
            <Legend k="M" label="MUTE" />
          </div>
          <p className="font-sans text-base leading-tight opacity-80 lg:max-w-xl lg:text-right">
            Inspired by themes in <em>{SOURCE_BOOK.title}</em> by {SOURCE_BOOK.authors.join(" & ")} (
            {SOURCE_BOOK.editionYear}). {CONTENT_NOTE.split(". ").slice(-1)[0]}{" "}
            <a
              href="https://100days.keyurib.workers.dev/#life-quest"
              className="underline underline-offset-4 hover:opacity-100"
            >
              100 Days · Day 001
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
}

/* ---------- building blocks ---------- */

/** Explains the progress squares: done = you completed the quest, seen = you've read it. */
function PipLegend() {
  const pip = "inline-block size-2.5 border-2 border-foreground";
  return (
    <p className="retro flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-t-4 border-foreground/25 px-3 py-2 text-[0.4375rem] text-muted-foreground">
      <span className="flex items-center gap-1">
        <span className={pip} style={{ background: "var(--secondary)" }} /> DONE
      </span>
      <span className="flex items-center gap-1">
        <span className={pip} style={{ background: "color-mix(in srgb, var(--foreground) 25%, transparent)" }} /> READ
      </span>
      <span className="flex items-center gap-1">
        <span className={pip} style={{ opacity: 0.35 }} /> NEW
      </span>
    </p>
  );
}

/** A framed 8-bit panel with a title banner, like an RPG inventory window. */
function Panel({
  title,
  icon,
  tone,
  ink,
  className,
  children,
}: {
  title: string;
  icon: PixelIconName;
  tone: string;
  ink: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className={cn("glow-box flex min-h-0 flex-col gap-0 py-0 ring-0", className)}>
      <div
        className="ribbon retro flex shrink-0 items-center justify-center gap-2 px-8 py-2.5 text-[0.625rem] md:text-xs"
        style={{ "--ribbon": tone, "--ribbon-ink": ink } as React.CSSProperties}
      >
        <PixelIcon name={icon} className="size-3" />
        <h2>{title}</h2>
      </div>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </Card>
  );
}

function SubPanel({
  icon,
  label,
  tone,
  children,
}: {
  icon: PixelIconName;
  label: string;
  tone: string;
  children: React.ReactNode;
}) {
  return (
    <div className="slot relative border-4 border-foreground/70 p-4 pt-3">
      <span className="retro mb-2 flex items-center gap-2 text-[0.5625rem]">
        <span className="grid size-5 place-items-center border-2 border-foreground" style={{ background: tone, color: INK }}>
          <PixelIcon name={icon} className="size-3" />
        </span>
        {label}
      </span>
      <p className="font-sans text-2xl leading-tight">{children}</p>
    </div>
  );
}

function IconTile({ icon, color, size = "sm" }: { icon: PixelIconName; color: string; size?: "sm" | "lg" }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center border-foreground",
        size === "lg" ? "size-11 border-4" : "size-5 border-2"
      )}
      style={{ background: color, color: INK }}
    >
      <PixelIcon name={icon} className={size === "lg" ? "size-5" : "size-3"} />
    </span>
  );
}

function StatBar({ label, value, children }: { label: string; value: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="retro flex justify-between gap-2 text-[0.5rem]">
        <span className="truncate">{label}</span>
        <span className="text-muted-foreground">{value}</span>
      </div>
      {children}
    </div>
  );
}

function Chip({ icon, label, value }: { icon: PixelIconName; label: string; value: string }) {
  return (
    <span className="slot flex items-center gap-2 border-2 border-foreground px-2 py-1.5">
      <PixelIcon name={icon} className="size-3 text-primary" />
      <span className="flex flex-col leading-tight">
        <span className="text-[0.4375rem] text-muted-foreground">{label}</span>
        <span>{value}</span>
      </span>
    </span>
  );
}

function PathItem({
  value,
  name,
  ids,
  seen,
  completed,
  emptyHint,
}: {
  value: string;
  name: string;
  ids: string[];
  seen: string[];
  completed: string[];
  emptyHint?: string;
}) {
  const theme = themeFor(value);
  const done = ids.filter((id) => completed.includes(id)).length;
  const showPips = ids.length <= 10;
  return (
    <ToggleGroupItem
      value={value}
      aria-label={`${name}: ${done} of ${ids.length} quests done`}
      className={cn(
        "retro relative flex h-auto w-full items-center justify-start gap-3 rounded-none border-2 border-transparent px-2 py-2 text-left whitespace-normal",
        "hover:border-foreground/40 hover:bg-foreground/5",
        "data-[state=on]:border-foreground data-[state=on]:bg-foreground/10"
      )}
    >
      <IconTile icon={theme.icon} color={value === "all" ? "var(--muted)" : theme.color} size="lg" />
      <span className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className="flex items-center justify-between gap-2">
          <span className="truncate text-[0.5625rem]">{name.toUpperCase()}</span>
          <span className="text-[0.5rem] text-muted-foreground">
            {ids.length > 0 && `${done}/${ids.length} DONE`}
          </span>
        </span>
        {ids.length === 0 ? (
          <span className="text-[0.4375rem] text-muted-foreground">{emptyHint}</span>
        ) : showPips ? (
          <span className="flex gap-1" aria-hidden>
            {ids.map((id) => {
              const isDone = completed.includes(id);
              const isSeen = seen.includes(id);
              return (
                <span
                  key={id}
                  className="size-2.5 border-2 border-foreground"
                  style={{
                    background: isDone ? theme.color : isSeen ? "color-mix(in srgb, var(--foreground) 25%, transparent)" : "transparent",
                    opacity: isDone || isSeen ? 1 : 0.35,
                  }}
                />
              );
            })}
          </span>
        ) : (
          <span className="slot block h-2.5 w-full border-2 border-foreground" aria-hidden>
            <span className="block h-full bg-secondary" style={{ width: `${(done / ids.length) * 100}%` }} />
          </span>
        )}
      </span>
    </ToggleGroupItem>
  );
}

function IconAction({
  icon,
  label,
  hotkey,
  onClick,
  disabled,
  active,
}: {
  icon: PixelIconName;
  label: string;
  hotkey: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          size="icon"
          variant="outline"
          aria-label={label}
          aria-pressed={active}
          onClick={onClick}
          disabled={disabled}
          className={cn(active && "bg-primary text-primary-foreground hover:bg-primary/90")}
        >
          <PixelIcon name={icon} className={cn("size-4", active && "pop")} />
        </Button>
      </TooltipTrigger>
      <TooltipContent className="text-[0.5625rem]">
        {label.toUpperCase()} <Kbd className="ml-1">{hotkey}</Kbd>
      </TooltipContent>
    </Tooltip>
  );
}

function Legend({ k, label }: { k: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <Kbd className="text-[0.5rem]">{k}</Kbd>
      {label}
    </span>
  );
}
