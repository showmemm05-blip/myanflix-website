export interface CommentAuthor {
  id: string;
  username: string;
  /** The cosmetic name. `null` for accounts that never set one — fall back to `username`. */
  displayName: string | null;
  avatarUrl: string | null;
}

/**
 * One comment as `GET /comments` returns it. Threads are exactly two levels
 * deep: a top-level comment carries its `replies`, and a reply's own `replies`
 * array is always empty (the backend refuses to attach a reply to a reply).
 */
export interface Comment {
  id: string;
  body: string;
  /** Server-assigned ISO timestamp — the client never sends one. */
  createdAt: string;
  user: CommentAuthor;
  replies: Comment[];
}

/**
 * Which title a comment belongs to. Exactly one id, never both and never
 * neither — the backend rejects anything else with a 400, so the union keeps
 * that rule in the type system rather than in a runtime check on every call.
 */
export type CommentTarget =
  | { movieId: string; seriesId?: undefined }
  | { seriesId: string; movieId?: undefined };

/** Mirrors the backend's 1..1000 rule on a trimmed body. */
export const COMMENT_BODY_MAX = 1000;
