import { cn } from "@/lib/utils";

/* ---------- Pixel icons drawn from ASCII grids ---------- */

const ICONS = {
  heart: [".##.##.", "#######", "#######", ".#####.", "..###..", "...#..."],
  copy: ["#####...", "#...#...", "#.######", "#.#....#", "###....#", "..#....#", "..#....#", "..######"],
  share: ["...#...", "..###..", ".#####.", "...#...", "...#...", "#..#..#", "#.....#", "#######"],
  soundOn: ["...#....", "..##..#.", "####.#.#", "####.#.#", "####.#.#", "..##..#.", "...#...."],
  soundOff: ["...#....", "..##....", "####.#.#", "####..#.", "####.#.#", "..##....", "...#...."],
  chest: [".######.", "#......#", "########", "#..##..#", "#..##..#", "#......#", "########"],
  play: ["#.....", "##....", "###...", "####..", "###...", "##....", "#....."],
  close: ["#....#", ".#..#.", "..##..", "..##..", ".#..#.", "#....#"],
  star: ["...#...", "..###..", "#######", ".#####.", "..###..", ".##.##.", "##...##"],
  quote: ["##.##", "##.##", ".#..#", "#..#."],
} as const;

export type PixelIconName = keyof typeof ICONS;

export function PixelIcon({
  name,
  className,
  title,
}: {
  name: PixelIconName;
  className?: string;
  title?: string;
}) {
  const rows = ICONS[name];
  const w = Math.max(...rows.map((r) => r.length));
  const h = rows.length;
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className={cn("size-4 shrink-0", className)}
      shapeRendering="crispEdges"
      fill="currentColor"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
    >
      {title && <title>{title}</title>}
      {rows.flatMap((row, y) =>
        [...row].map((c, x) => (c === "#" ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} /> : null))
      )}
    </svg>
  );
}

/* ---------- Deterministic pixel-art avatar (mirrored 8x8 sprite) ---------- */

function hash(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: number) {
  let s = seed || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 1000) / 1000;
  };
}

const SKIN = ["#ffd6a5", "#e8b07a", "#c68642", "#8d5524", "#f1c27d"];
const HAIR = ["#2b1b17", "#6b3e26", "#f2d16b", "#c0392b", "#ececec", "#3fd0ff", "#ff4f8b", "#7cff6b"];
const SHIRT = ["#ff4f8b", "#3fd0ff", "#ffd23f", "#7cff6b", "#b27cff", "#ff8a2b"];

export function PixelAvatar({ seed, className }: { seed: string; className?: string }) {
  const r = rng(hash(seed));
  const skin = SKIN[Math.floor(r() * SKIN.length)];
  const hair = HAIR[Math.floor(r() * HAIR.length)];
  const shirt = SHIRT[Math.floor(r() * SHIRT.length)];
  const hasGlasses = r() > 0.6;
  const hairStyle = Math.floor(r() * 3);
  const beard = r() > 0.7;

  // 10x10 sprite, left half generated then mirrored
  const W = 10;
  const grid: (string | null)[][] = Array.from({ length: W }, () => Array(W).fill(null));
  const set = (x: number, y: number, c: string) => {
    grid[y][x] = c;
    grid[y][W - 1 - x] = c;
  };

  // face
  for (let y = 2; y <= 7; y++) for (let x = 2; x <= 4; x++) set(x, y, skin);
  // hair
  for (let x = 2; x <= 4; x++) set(x, 1, hair);
  set(1, 2, hair);
  if (hairStyle >= 1) for (let y = 2; y <= 4; y++) set(1, y, hair);
  if (hairStyle === 2) {
    for (let x = 1; x <= 4; x++) set(x, 0, hair);
    set(1, 5, hair);
  }
  if (hairStyle === 0) set(3, 0, hair);
  // eyes
  if (hasGlasses) {
    // shades: frame - lens - bridge
    set(2, 4, "#120f26");
    set(3, 4, "#3fd0ff");
    set(4, 4, "#120f26");
  } else {
    set(3, 4, "#120f26");
  }
  // mouth / beard
  set(4, 6, beard ? hair : "#c0392b");
  if (beard) {
    set(3, 7, hair);
    set(4, 7, hair);
    set(2, 6, hair);
  }
  // body
  for (let x = 1; x <= 4; x++) set(x, 8, shirt);
  for (let x = 0; x <= 4; x++) set(x, 9, shirt);
  set(4, 8, skin);

  return (
    <svg viewBox={`0 0 ${W} ${W}`} shapeRendering="crispEdges" className={cn("size-16", className)} aria-hidden>
      {grid.flatMap((row, y) =>
        row.map((c, x) => (c ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={c} /> : null))
      )}
    </svg>
  );
}
