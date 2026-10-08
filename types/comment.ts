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
  /** For a top-level comment: its first REPLY_PAGE_SIZE replies, oldest first. */
  replies: Comment[];
  /** Every visible reply, whether or not it is in `replies`. */
  replyCount: number;
  /** `replyCount > replies.length` — `commentService.replies` has a page to load. */
  hasMoreReplies: boolean;
}

/** One page of a comment's replies as `GET /comments/:id/replies` returns it. */
export interface ReplyPage {
  items: Comment[];
  total: number;
  page: number;
  limit: number;
}

/**
 * How many replies a thread read carries under each comment, and the size of
 * every further page — the backend's REPLY_PREVIEW_LIMIT, so page 2 starts
 * exactly where the preview stopped.
 */
export const REPLY_PAGE_SIZE = 20;

/**
 * Which title a comment belongs to. Exactly one id of the three, never two and
 * never none — the backend rejects anything else with a 400, so the union keeps
 * that rule in the type system rather than in a runtime check on every call.
 */
export type CommentTarget =
  | { movieId: string; seriesId?: undefined; bookId?: undefined }
  | { seriesId: string; movieId?: undefined; bookId?: undefined }
  | { bookId: string; movieId?: undefined; seriesId?: undefined };

/** Mirrors the backend's 1..1000 rule on a trimmed body. */
export const COMMENT_BODY_MAX = 1000;
