/**
 * One hue per genre, shared by the quick-genre chips and card captions so the
 * same color means the same thing everywhere on the browse page. Class strings
 * are spelled out in full — Tailwind only compiles literals it can see.
 */
export interface GenreTone {
  /** Idle chip: tinted outline. */
  chip: string;
  /** Active chip: solid fill. */
  chipActive: string;
  /** Caption text accent. */
  text: string;
}

const TONES: Record<string, GenreTone> = {
  Action: {
    chip: "border-red-500/30 bg-red-500/10 text-red-300 hover:border-red-500/50",
    chipActive: "border-transparent bg-red-500 text-white",
    text: "text-red-400",
  },
  Drama: {
    chip: "border-sky-500/30 bg-sky-500/10 text-sky-300 hover:border-sky-500/50",
    chipActive: "border-transparent bg-sky-500 text-white",
    text: "text-sky-400",
  },
  Comedy: {
    chip: "border-amber-500/30 bg-amber-500/10 text-amber-300 hover:border-amber-500/50",
    chipActive: "border-transparent bg-amber-400 text-black",
    text: "text-amber-400",
  },
  Romance: {
    chip: "border-pink-500/30 bg-pink-500/10 text-pink-300 hover:border-pink-500/50",
    chipActive: "border-transparent bg-pink-500 text-white",
    text: "text-pink-400",
  },
  Thriller: {
    chip: "border-orange-500/30 bg-orange-500/10 text-orange-300 hover:border-orange-500/50",
    chipActive: "border-transparent bg-orange-500 text-white",
    text: "text-orange-400",
  },
  Horror: {
    chip: "border-purple-500/30 bg-purple-500/10 text-purple-300 hover:border-purple-500/50",
    chipActive: "border-transparent bg-purple-500 text-white",
    text: "text-purple-400",
  },
  Animation: {
    chip: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:border-emerald-500/50",
    chipActive: "border-transparent bg-emerald-500 text-white",
    text: "text-emerald-400",
  },
  Documentary: {
    chip: "border-teal-500/30 bg-teal-500/10 text-teal-300 hover:border-teal-500/50",
    chipActive: "border-transparent bg-teal-500 text-white",
    text: "text-teal-400",
  },
  "Sci-Fi": {
    chip: "border-cyan-500/30 bg-cyan-500/10 text-cyan-300 hover:border-cyan-500/50",
    chipActive: "border-transparent bg-cyan-500 text-black",
    text: "text-cyan-400",
  },
  Fantasy: {
    chip: "border-violet-500/30 bg-violet-500/10 text-violet-300 hover:border-violet-500/50",
    chipActive: "border-transparent bg-violet-500 text-white",
    text: "text-violet-400",
  },
};

const FALLBACK: GenreTone = {
  chip: "border-white/10 bg-secondary/40 text-muted-foreground hover:border-white/20",
  chipActive: "border-transparent bg-foreground text-background",
  text: "text-muted-foreground",
};

export function genreTone(genre: string | null | undefined): GenreTone {
  return (genre && TONES[genre]) || FALLBACK;
}
