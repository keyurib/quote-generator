/**
 * Presentation-only metadata for each content category (colour + pixel icon).
 * Kept apart from the content JSON so the content stays UI-agnostic.
 */
import type { PixelIconName } from "@/components/pixel";

export interface CategoryTheme {
  color: string;
  icon: PixelIconName;
}

const THEMES: Record<string, CategoryTheme> = {
  happiness: { color: "#ffd23f", icon: "sun" },
  adversity: { color: "#ff5a4e", icon: "shield" },
  relationships: { color: "#ff8ac2", icon: "people" },
  "self-love": { color: "#ff4f8b", icon: "heart" },
  "passion-growth": { color: "#ff8a2b", icon: "flame" },
  productivity: { color: "#3fd0ff", icon: "bolt" },
  "goals-success": { color: "#7cff6b", icon: "flag" },
  simplicity: { color: "#8fe3c0", icon: "leaf" },
  inspiration: { color: "#b27cff", icon: "star" },
};

export const ALL_THEME: CategoryTheme = { color: "var(--foreground)", icon: "grid" };

/** Id of the virtual "Favourites" path (not a content category). */
export const FAVORITES = "favorites";
export const FAVORITES_THEME: CategoryTheme = { color: "#ff4f8b", icon: "heart" };

export function themeFor(categoryId: string | "all"): CategoryTheme {
  if (categoryId === "all") return ALL_THEME;
  if (categoryId === FAVORITES) return FAVORITES_THEME;
  return THEMES[categoryId] ?? { color: "var(--foreground)", icon: "star" };
}
