"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Badge } from "@/components/ui/8bit/badge";
import { Button } from "@/components/ui/8bit/button";
import { Card, CardContent, CardFooter } from "@/components/ui/8bit/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/8bit/dialog";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/8bit/empty";
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
import { PixelAvatar, PixelIcon, type PixelIconName } from "@/components/pixel";
import { CATEGORIES, QUOTES, type Category, type Quote, categoryMeta } from "@/lib/quotes";
import { sfx } from "@/lib/sfx";
import { cn } from "@/lib/utils";

const XP_PER_QUOTE = 10;
const XP_NEW_BONUS = 15;
const XP_PER_LEVEL = 100;
const INVENTORY_SLOTS = 12;
const STORAGE_KEY = "quote-quest:v1";

type Filter = Category | "all";
type Palette = "arcade" | "gameboy" | "sunset";

interface SaveData {
  xp: number;
  seen: number[];
  favorites: number[];
  muted: boolean;
  palette: Palette;
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

export default function QuoteQuest() {
  const [filter, setFilter] = useState<Filter>("all");
  const [current, setCurrent] = useState<Quote | null>(null);
  const [typed, setTyped] = useState(0);
  const [loading, setLoading] = useState(false);
  const [flashKey, setFlashKey] = useState(0);
  const [isNew, setIsNew] = useState(false);

  const [xp, setXp] = useState(0);
  const [seen, setSeen] = useState<number[]>([]);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [muted, setMuted] = useState(false);
  const [palette, setPalette] = useState<Palette>("arcade");
  const [levelFlash, setLevelFlash] = useState(false);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const bags = useRef<Partial<Record<Filter, number[]>>>({});
  const mutedRef = useRef(muted);
  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  const play = useCallback((name: keyof typeof sfx) => {
    if (!mutedRef.current) sfx[name]();
  }, []);

  /* ---------- persistence ---------- */
  // Restore the saved game after mount (localStorage isn't available during SSR).
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const d = JSON.parse(raw) as Partial<SaveData>;
        if (typeof d.xp === "number") setXp(d.xp);
        if (Array.isArray(d.seen)) setSeen(d.seen);
        if (Array.isArray(d.favorites)) setFavorites(d.favorites);
        if (typeof d.muted === "boolean") setMuted(d.muted);
        if (d.palette) setPalette(d.palette);
      }
    } catch {
      /* storage unavailable: start fresh */
    }
    setHydrated(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!hydrated) return;
    try {
      const data: SaveData = { xp, seen, favorites, muted, palette };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      /* ignore */
    }
  }, [xp, seen, favorites, muted, palette, hydrated]);

  useEffect(() => {
    document.documentElement.dataset.palette = palette;
  }, [palette]);

  /* ---------- typewriter ---------- */
  useEffect(() => {
    if (!current) return;
    const len = current.text.length;
    let i = 0;
    const id = window.setInterval(() => {
      i++;
      setTyped(i);
      if (i % 3 === 0) play("tick");
      if (i >= len) window.clearInterval(id);
    }, 24);
    return () => window.clearInterval(id);
  }, [current, play]);

  const typingDone = current ? typed >= current.text.length : true;

  /* ---------- drawing quotes (shuffle bag: no repeats until pool is exhausted) ---------- */
  const draw = useCallback(
    (f: Filter, avoid?: number) => {
      const pool = QUOTES.filter((q) => f === "all" || q.category === f).map((q) => q.id);
      let bag = bags.current[f];
      if (!bag || bag.length === 0) {
        bag = shuffle(pool);
        if (bag.length > 1 && bag[bag.length - 1] === avoid) bag.unshift(bag.pop()!);
      }
      const id = bag.pop()!;
      bags.current[f] = bag;
      return QUOTES.find((q) => q.id === id)!;
    },
    []
  );

  const gainXp = useCallback(
    (amount: number) => {
      setXp((prev) => {
        const next = prev + amount;
        const before = Math.floor(prev / XP_PER_LEVEL);
        const after = Math.floor(next / XP_PER_LEVEL);
        if (after > before) {
          window.setTimeout(() => {
            play("levelUp");
            setLevelFlash(true);
            toast(`★ LEVEL UP! YOU REACHED LV ${pad(after + 1, 2)} ★`);
            window.setTimeout(() => setLevelFlash(false), 1600);
          }, 0);
        }
        return next;
      });
    },
    [play]
  );

  const showQuote = useCallback(
    (q: Quote, award = true) => {
      setCurrent(q);
      setTyped(0);
      setFlashKey((k) => k + 1);
      const firstTime = !seen.includes(q.id);
      setIsNew(firstTime);
      if (firstTime) setSeen((s) => [...s, q.id]);
      if (award) gainXp(XP_PER_QUOTE + (firstTime ? XP_NEW_BONUS : 0));
    },
    [seen, gainXp]
  );

  const next = useCallback(
    (f: Filter = filter) => {
      if (loading) return;
      play("next");
      setLoading(true);
      window.setTimeout(() => {
        showQuote(draw(f, current?.id));
        setLoading(false);
      }, 420);
    },
    [filter, loading, play, draw, current, showQuote]
  );

  /* ---------- actions ---------- */
  const isFav = current ? favorites.includes(current.id) : false;

  const toggleFavorite = useCallback(() => {
    if (!current) return;
    if (favorites.includes(current.id)) {
      setFavorites((f) => f.filter((id) => id !== current.id));
      play("bonk");
      toast("DROPPED FROM INVENTORY");
      return;
    }
    if (favorites.length >= INVENTORY_SLOTS) {
      play("bonk");
      toast("INVENTORY FULL! DROP AN ITEM FIRST");
      return;
    }
    setFavorites((f) => [...f, current.id]);
    play("coin");
    toast("+1 QUOTE ADDED TO INVENTORY");
  }, [current, favorites, play]);

  const copy = useCallback(async () => {
    if (!current) return;
    const text = `"${current.text}" — ${current.author}`;
    try {
      await navigator.clipboard.writeText(text);
      play("select");
      toast("COPIED TO CLIPBOARD!");
    } catch {
      play("bonk");
      toast("COPY FAILED. TRY AGAIN");
    }
  }, [current, play]);

  const share = useCallback(async () => {
    if (!current) return;
    const text = `"${current.text}" — ${current.author}`;
    play("select");
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ text });
        return;
      } catch {
        /* cancelled: fall through to nothing */
        return;
      }
    }
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer"
    );
  }, [current, play]);

  const changeFilter = (v: string) => {
    if (!v) return; // radix toggle group emits "" when clicking the active item
    const f = v as Filter;
    setFilter(f);
    if (current) next(f);
  };

  const skipTyping = () => {
    if (current && !typingDone) setTyped(current.text.length);
  };

  /* ---------- keyboard ---------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (inventoryOpen || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      const interactive = target?.closest("button, a, input, textarea, select, [role=combobox], [role=radio]");
      const k = e.key.toLowerCase();
      if ((k === " " || k === "enter") && interactive) return;
      switch (k) {
        case " ":
        case "enter":
        case "n":
        case "arrowright":
          e.preventDefault();
          if (current && !typingDone) skipTyping();
          else next();
          break;
        case "c":
          void copy();
          break;
        case "f":
          toggleFavorite();
          break;
        case "s":
          void share();
          break;
        case "m":
          setMuted((m) => !m);
          break;
        case "i":
          setInventoryOpen(true);
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  /* ---------- derived ---------- */
  const level = Math.floor(xp / XP_PER_LEVEL) + 1;
  const xpInLevel = xp % XP_PER_LEVEL;
  const favQuotes = useMemo(
    () => favorites.map((id) => QUOTES.find((q) => q.id === id)).filter(Boolean) as Quote[],
    [favorites]
  );
  const meta = current ? categoryMeta(current.category) : categoryMeta(filter);

  return (
    <div className="scene relative min-h-dvh overflow-hidden">
      {/* background layers */}
      <div aria-hidden className="stars pointer-events-none absolute inset-0" />
      <div aria-hidden className="stars stars-2 pointer-events-none absolute inset-0" />
      <div aria-hidden className="pointer-events-none absolute inset-x-[-50%] bottom-0 h-[45vh] floor" />

      <main className="relative z-10 mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-8 md:py-12">
        {/* ---------- HEADER ---------- */}
        <header className="flex flex-col items-center gap-4 text-center">
          <div className="retro flex w-full items-center justify-between text-[10px] md:text-xs">
            <span className="text-primary">
              1UP <span className="text-foreground">{pad(xp, 6)}</span>
            </span>
            <span className="text-accent">LV {pad(level, 2)}</span>
            <span className="text-muted-foreground">
              DEX <span className="text-foreground">{pad(seen.length, 2)}/{QUOTES.length}</span>
            </span>
          </div>
          <h1 className="retro logo-text text-2xl leading-tight sm:text-4xl md:text-5xl">
            QUOTE
            <br />
            QUEST
          </h1>
          <p className="retro blink text-[10px] text-foreground/80 md:text-xs">
            {current ? "★ COLLECT THEM ALL ★" : "INSERT COIN · PRESS START"}
          </p>
        </header>

        {/* ---------- HUD ---------- */}
        <section aria-label="Player stats" className="grid gap-5 sm:grid-cols-3">
          <StatBar label="XP" value={`${xpInLevel}/${XP_PER_LEVEL}`}>
            <XpBar value={levelFlash ? 100 : xpInLevel} variant="retro" className="h-4" />
          </StatBar>
          <StatBar label="DEX" value={`${Math.round((seen.length / QUOTES.length) * 100)}%`}>
            <ManaBar value={(seen.length / QUOTES.length) * 100} variant="retro" className="h-4" />
          </StatBar>
          <StatBar label="BAG" value={`${favorites.length}/${INVENTORY_SLOTS}`}>
            <HealthBar value={(favorites.length / INVENTORY_SLOTS) * 100} variant="retro" className="h-4" />
          </StatBar>
        </section>

        {/* ---------- CATEGORY ---------- */}
        <section aria-label="Choose a category" className="flex flex-col items-center gap-3">
          <p className="retro text-[10px] text-muted-foreground">SELECT WORLD</p>
          <ToggleGroup
            type="single"
            value={filter}
            onValueChange={changeFilter}
            variant="outline"
            className="flex flex-wrap justify-center gap-4"
          >
            {CATEGORIES.map((c) => (
              <ToggleGroupItem
                key={c.value}
                value={c.value}
                variant="outline"
                aria-label={`${c.label} quotes`}
                className="retro relative rounded-none px-3 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
              >
                <span
                  aria-hidden
                  className="mr-1 inline-block size-2"
                  style={{ background: c.color }}
                />
                {c.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </section>

        {/* ---------- QUOTE SCREEN ---------- */}
        <Card className="glow-box">
          <CardContent className="relative min-h-[300px] px-5 pt-6 md:px-8">
            {loading ? (
              <div className="flex min-h-[260px] flex-col items-center justify-center gap-4">
                <Spinner variant="diamond" className="size-10 text-primary" />
                <p className="retro blink text-xs">LOADING...</p>
              </div>
            ) : current ? (
              <div key={flashKey} className="flash flex flex-col gap-6">
                <div className="flex flex-wrap items-center gap-4">
                  <Badge className="text-[10px]" style={{ background: meta.color, color: "#120f26" }}>
                    {meta.label}
                  </Badge>
                  {isNew && (
                    <Badge className="pop bg-accent text-accent-foreground text-[10px]">NEW!</Badge>
                  )}
                  <span className="retro ml-auto text-[10px] text-muted-foreground">
                    No.{pad(current.id, 3)}
                  </span>
                </div>

                <blockquote
                  onClick={skipTyping}
                  className="relative cursor-pointer select-text"
                  title={typingDone ? undefined : "Click to skip"}
                >
                  <PixelIcon name="quote" className="mb-2 size-6 text-primary" />
                  <p className="sr-only" aria-live="polite">
                    {current.text} — {current.author}
                  </p>
                  <p aria-hidden className="font-sans text-3xl leading-tight md:text-4xl">
                    {current.text.slice(0, typed)}
                    {!typingDone && <span className="caret" />}
                    <span className="invisible">{current.text.slice(typed)}</span>
                  </p>
                </blockquote>

                <div
                  className={cn(
                    "flex items-center gap-4 transition-opacity",
                    typingDone ? "opacity-100" : "opacity-0"
                  )}
                >
                  <div className="float border-4 border-foreground bg-muted p-1">
                    <PixelAvatar seed={current.author} className="size-12 md:size-14" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="retro text-[10px] text-muted-foreground">SAID BY</span>
                    <cite className="retro text-xs not-italic text-accent md:text-sm">
                      {current.author}
                    </cite>
                  </div>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => next()}
                className="flex min-h-[260px] w-full flex-col items-center justify-center gap-6 outline-none focus-visible:ring-4 focus-visible:ring-primary"
              >
                <PixelIcon name="star" className="float size-14 text-accent" />
                <span className="retro blink text-sm text-primary md:text-base">PRESS START</span>
                <span className="font-sans text-2xl text-muted-foreground">
                  {QUOTES.length} legendary quotes are hiding in 5 worlds.
                </span>
              </button>
            )}
          </CardContent>

          {/* ---------- CONTROLS ---------- */}
          <CardFooter className="flex flex-wrap items-center justify-center gap-5 px-5 pb-6 md:justify-between">
            <Button size="lg" onClick={() => next()} disabled={loading} className="text-xs">
              <PixelIcon name="play" className="size-3" />
              {current ? "NEXT QUOTE" : "START"}
            </Button>

            <div className="flex items-center gap-4">
              <IconAction icon="copy" label="Copy" hotkey="C" onClick={copy} disabled={!current} />
              <IconAction
                icon="heart"
                label={isFav ? "Drop from bag" : "Save to bag"}
                hotkey="F"
                onClick={toggleFavorite}
                disabled={!current}
                active={isFav}
              />
              <IconAction icon="share" label="Share" hotkey="S" onClick={share} disabled={!current} />
              <IconAction
                icon={muted ? "soundOff" : "soundOn"}
                label={muted ? "Sound on" : "Mute"}
                hotkey="M"
                onClick={() => setMuted((m) => !m)}
              />
            </div>
          </CardFooter>
        </Card>

        {/* ---------- BOTTOM BAR ---------- */}
        <section className="flex flex-col items-stretch gap-6 sm:flex-row sm:items-center sm:justify-between">
          <Dialog open={inventoryOpen} onOpenChange={setInventoryOpen}>
            <DialogTrigger asChild>
              <Button variant="secondary" className="text-[10px]">
                <PixelIcon name="chest" className="size-4" />
                INVENTORY ({favorites.length})
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="retro text-sm">INVENTORY</DialogTitle>
                <DialogDescription className="font-sans text-xl">
                  Your saved quotes. {favorites.length}/{INVENTORY_SLOTS} slots used.
                </DialogDescription>
              </DialogHeader>
              {favQuotes.length === 0 ? (
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia>
                      <PixelIcon name="chest" className="size-10 text-muted-foreground" />
                    </EmptyMedia>
                    <EmptyTitle className="text-xs">BAG IS EMPTY</EmptyTitle>
                    <EmptyDescription className="font-sans text-xl">
                      Press <Kbd>F</Kbd> on a quote to stash it here.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <ScrollArea className="max-h-[55vh] pr-3">
                  <ul className="flex flex-col gap-3">
                    {favQuotes.map((q) => (
                      <li key={q.id} className="flex items-start gap-3 border-4 border-foreground/30 bg-muted/50 p-3">
                        <PixelAvatar seed={q.author} className="size-10 shrink-0" />
                        <button
                          type="button"
                          className="flex-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          onClick={() => {
                            showQuote(q, false);
                            setInventoryOpen(false);
                            play("select");
                          }}
                        >
                          <p className="font-sans text-xl leading-tight">{q.text}</p>
                          <p className="retro mt-1 text-[9px] text-accent">{q.author}</p>
                        </button>
                        <button
                          type="button"
                          aria-label={`Remove quote by ${q.author}`}
                          className="p-1 text-muted-foreground hover:text-destructive focus-visible:text-destructive outline-none"
                          onClick={() => {
                            setFavorites((f) => f.filter((id) => id !== q.id));
                            play("bonk");
                          }}
                        >
                          <PixelIcon name="close" className="size-3" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              )}
            </DialogContent>
          </Dialog>

          <div className="flex items-center gap-3">
            <span className="retro text-[10px] text-muted-foreground">PALETTE</span>
            <Select value={palette} onValueChange={(v) => setPalette(v as Palette)}>
              <SelectTrigger className="w-40 text-[10px]" aria-label="Color palette">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="arcade" className="text-[10px]">ARCADE</SelectItem>
                <SelectItem value="gameboy" className="text-[10px]">POCKET</SelectItem>
                <SelectItem value="sunset" className="text-[10px]">SUNSET</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </section>

        {/* ---------- CONTROLS LEGEND ---------- */}
        <footer className="retro flex flex-wrap items-center justify-center gap-x-5 gap-y-3 pb-4 text-[9px] text-muted-foreground">
          <Legend k="SPACE" label="NEXT" />
          <Legend k="C" label="COPY" />
          <Legend k="F" label="SAVE" />
          <Legend k="S" label="SHARE" />
          <Legend k="I" label="BAG" />
          <Legend k="M" label="MUTE" />
          <a
            href="https://100days.keyurib.workers.dev/#quote-generator"
            className="w-full pt-2 text-center text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
          >
            ◀ 100 DAYS · DAY 001
          </a>
        </footer>
      </main>
    </div>
  );
}

/* ---------- small pieces ---------- */

function StatBar({ label, value, children }: { label: string; value: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="retro flex justify-between text-[10px]">
        <span>{label}</span>
        <span className="text-muted-foreground">{value}</span>
      </div>
      {children}
    </div>
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
      <TooltipContent className="text-[9px]">
        {label.toUpperCase()} <Kbd className="ml-1">{hotkey}</Kbd>
      </TooltipContent>
    </Tooltip>
  );
}

function Legend({ k, label }: { k: string; label: string }) {
  return (
    <span className="flex items-center gap-2">
      <Kbd className="text-[9px]">{k}</Kbd>
      {label}
    </span>
  );
}
