export interface CommentAuthor {
  /** The author's user id — on your own comments only (`Comment.isMine`); never another reader's. */
  id?: string;
  /**
   * The name the thread shows: the account's display name, else the server's
   * `Member #<tag>` pseudonym. Always set, and never the username — for a
   * phone sign-up that is the phone number, so the server no longer sends it.
   */
  displayName: string;
  /** The tag behind a `Member #<tag>` pseudonym, so the prefix can be translated; `null` when `displayName` is the account's own. */
  memberTag: string | null;
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
  /**
   * True when the signed-in viewer wrote it. The thread is read without a
   * token today (`commentService.list` is `skipAuth`), so this is false on
   * every listed comment and true only on the one `create` just returned.
   */
  isMine: boolean;
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
