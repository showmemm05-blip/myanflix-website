"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LogIn, MessageCircle, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ChevronDownIcon } from "@/components/system";
import { initialsOf } from "@/components/cards";
import { EmptyState } from "@/components/empty/EmptyState";
import { ErrorState } from "@/components/empty/ErrorState";
import { loginHref } from "@/lib/auth/return-to";
import { useAuth } from "@/lib/context/auth-context";
import { useLanguage } from "@/lib/context/language-context";
import { useSection } from "@/lib/i18n/sections/define";
import { titlesText } from "@/lib/i18n/sections/titles";
import { cn } from "@/lib/utils";
import { commentService } from "@/services/api/commentService";
import { ApiError } from "@/services/api/apiClient";
import {
  COMMENT_BODY_MAX,
  REPLY_PAGE_SIZE,
  type Comment,
  type CommentTarget,
} from "@/types/comment";
import type { TranslationShape } from "@/lib/i18n/translations";

/**
 * Comment thread for a movie, series or book (Marquee: MovieDetail board,
 * "Comments").
 *
 * REPLY-FIRST BY DESIGN: the only affordance on a comment is "reply", and there
 * are deliberately no reactions — a like button turns a conversation into a
 * scoreboard, and this section exists to hold conversation.
 *
 * Backed by `/comments`: the thread is a query, posting and replying are
 * mutations, and everything a comment records about the person posting it
 * (author, timestamp, platform, IP) is decided server-side. The empty state is
 * still genuinely empty — a title nobody has commented on says so rather than
 * being padded with invented opinions.
 *
 * Signed-out visitors read the thread but get the sign-in prompt instead of a
 * composer, so nothing here can be typed into and then rejected.
 *
 * A thread read carries the first REPLY_PAGE_SIZE replies of each comment and
 * the full `replyCount`; the rest are fetched a page at a time behind "Show N
 * more replies" and kept in `extraReplies` until the section unmounts.
 *
 * Layout-neutral: the page decides where the section sits (`className`); it
 * carries `id="comments"` and clears the sticky bar when jumped to.
 */

/** How close to the backend's ceiling the draft gets before the count appears. */
const COUNTER_VISIBLE_FROM = 100;

/** The author's name as the thread shows it — the display name, else the handle. */
function authorName(comment: Comment): string {
  return comment.user.displayName?.trim() || comment.user.username;
}

/**
 * The preview the thread read carried plus the replies loaded (or posted)
 * since, oldest first, each reply once. A refetch can move a reply from a
 * later page into the preview, and a reply you just posted is appended
 * before its page is ever loaded, so ids are deduplicated here rather than
 * at every write.
 */
function visibleReplies(comment: Comment, extra: Comment[] | undefined): Comment[] {
  if (!extra?.length) return comment.replies;
  const seen = new Set<string>();
  const merged: Comment[] = [];
  for (const reply of [...comment.replies, ...extra]) {
    if (seen.has(reply.id)) continue;
    seen.add(reply.id);
    merged.push(reply);
  }
  return merged.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/** The backend's per-account 429 codes (CommentsService); any other 429 is the IP backstop. */
const RATE_DAY_CODE = "COMMENT_RATE_DAY";

/**
 * Comment ages, in the active language.
 *
 * Relative up to a week — a conversation is read in terms of how long ago
 * things were said — and an absolute date past that, where "43d ago" stops
 * meaning anything.
 */
function relativeTime(iso: string, t: TranslationShape): string {
  const date = new Date(iso);
  const minutes = Math.floor((Date.now() - date.getTime()) / 60_000);
  if (minutes < 1) return t.comments.justNow;
  if (minutes < 60) return t.comments.minutesAgo(minutes);
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t.comments.hoursAgo(hours);
  const days = Math.floor(hours / 24);
  if (days < 7) return t.comments.daysAgo(days);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** The crimson text-link look the thread uses for its reply toggles. */
const THREAD_LINK =
  "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[6px] border-0 bg-transparent p-0 text-sm font-bold text-link transition-colors outline-none hover:text-link-hover hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link disabled:cursor-default disabled:opacity-60 disabled:no-underline";

export function CommentsSection(props: CommentTarget & { className?: string }) {
  const { className } = props;
  // Rebuilt from the props so the page's `className` never travels to the API.
  const target: CommentTarget = props.movieId
    ? { movieId: props.movieId }
    : props.seriesId
      ? { seriesId: props.seriesId }
      : { bookId: props.bookId! };

  const { t } = useLanguage();
  const pathname = usePathname();
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const headingId = useId();
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [openReplies, setOpenReplies] = useState<Record<string, boolean>>({});
  const [extraReplies, setExtraReplies] = useState<Record<string, Comment[]>>({});

  const appendReplies = (commentId: string, replies: Comment[]) =>
    setExtraReplies((prev) => ({
      ...prev,
      [commentId]: [...(prev[commentId] ?? []), ...replies],
    }));

  // All three ids are in the key: a movie, a series and a book are different
  // threads even in the impossible case that they ever shared an id.
  const queryKey = [
    "comments",
    target.movieId ?? null,
    target.seriesId ?? null,
    target.bookId ?? null,
  ];

  const {
    data: comments,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: () => commentService.list(target),
  });

  const total = (comments ?? []).reduce(
    (sum, comment) => sum + 1 + comment.replyCount,
    0,
  );

  // A failed post keeps its draft (see Composer), so the toast is the whole
  // report. A 429 is the per-account posting limit, which has its own
  // translated line (by code, so the daily cap reads differently from "slow
  // down"). Any other 4xx is passed through because it says something the
  // reader can act on ("A comment cannot be empty", an expired session); a
  // 5xx or a dropped connection is not — "Internal server error" in English
  // is strictly worse than the translated sentence.
  const reportFailure = (error: unknown) => {
    if (error instanceof ApiError && error.status === 429) {
      toast.error(error.code === RATE_DAY_CODE ? t.comments.dailyLimit : t.comments.rateLimited);
      return;
    }
    const actionable =
      error instanceof ApiError && error.status >= 400 && error.status < 500 && error.message;
    toast.error(actionable || t.comments.postFailed);
  };

  const postComment = useMutation({
    mutationFn: (body: string) => commentService.create({ ...target, body }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    onError: reportFailure,
  });

  const postReply = useMutation({
    mutationFn: ({ parentId, body }: { parentId: string; body: string }) =>
      commentService.create({ ...target, parentId, body }),
    onSuccess: (reply, { parentId }) => {
      setReplyingTo(null);
      // A thread you just replied to should never sit collapsed under its toggle.
      setOpenReplies((prev) => ({ ...prev, [parentId]: true }));
      // The thread is refetched, but a reply past the preview would not be in
      // it — keep the one just posted on screen whatever page it landed on.
      appendReplies(parentId, [reply]);
      return queryClient.invalidateQueries({ queryKey });
    },
    onError: reportFailure,
  });

  // Pages are REPLY_PAGE_SIZE long and the preview is page 1, so the next
  // page is whichever one the replies on screen stop in.
  const loadMoreReplies = useMutation({
    mutationFn: ({ commentId, loaded }: { commentId: string; loaded: number }) =>
      commentService.replies(commentId, Math.floor(loaded / REPLY_PAGE_SIZE) + 1),
    onSuccess: (page, { commentId }) => appendReplies(commentId, page.items),
    onError: () => toast.error(t.comments.repliesLoadFailed),
  });

  const myName = user?.name ?? t.comments.you;
  const myAvatar = user?.avatarUrl ?? null;

  return (
    <section
      id="comments"
      aria-labelledby={headingId}
      className={cn("min-w-0 scroll-mt-[calc(var(--shell-bar-h)+24px)]", className)}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2.5">
        <h2 id={headingId} className="text-section-title text-fg">
          {t.comments.heading}
        </h2>
        <span className="inline-flex h-6 items-center rounded-full bg-tonal-faint px-2.5 text-[13px] leading-6 font-bold text-fg-muted tabular-nums">
          {t.comments.count(total)}
        </span>
      </div>

      <div className="mt-5">
        {isAuthenticated ? (
          <Composer
            avatarUrl={myAvatar}
            name={myName}
            isPending={postComment.isPending}
            onSubmit={(body) => postComment.mutateAsync(body)}
          />
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 rounded-[16px] bg-surface py-3.5 pr-3.5 pl-[18px]">
            <p className="flex items-center gap-2.5 text-[15px] leading-[22px] text-fg-muted">
              <MessageCircle aria-hidden className="size-5 shrink-0" strokeWidth={1.75} />
              {t.comments.signedOutPrompt}
            </p>
            <Link href={loginHref(pathname)} className={buttonVariants({ variant: "tonal", size: "toolbar" })}>
              <LogIn aria-hidden strokeWidth={1.75} />
              {t.comments.signIn}
            </Link>
          </div>
        )}
      </div>

      <div className="mt-7">
        {isLoading ? (
          <ThreadSkeleton />
        ) : isError ? (
          <ErrorState description={t.comments.loadFailed} onRetry={() => void refetch()} framed />
        ) : !comments || comments.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title={t.comments.emptyTitle}
            description={t.comments.emptyBody}
            framed
          />
        ) : (
          <ul className="m-0 flex list-none flex-col gap-7 p-0">
            {comments.map((comment) => {
              const replies = visibleReplies(comment, extraReplies[comment.id]);
              const remaining = Math.max(0, comment.replyCount - replies.length);
              const loadingMore =
                loadMoreReplies.isPending && loadMoreReplies.variables?.commentId === comment.id;
              const open = !!openReplies[comment.id];
              const replyOpen = replyingTo === comment.id;
              return (
                <li key={comment.id}>
                  <CommentRow
                    comment={comment}
                    replyOpen={replyOpen}
                    onReplyClick={
                      isAuthenticated
                        ? () => setReplyingTo(replyOpen ? null : comment.id)
                        : undefined
                    }
                  />

                  {replyOpen && (
                    <ReplyComposer
                      avatarUrl={myAvatar}
                      name={myName}
                      replyToName={authorName(comment)}
                      isPending={postReply.isPending}
                      onCancel={() => setReplyingTo(null)}
                      onSubmit={(body) =>
                        postReply.mutateAsync({ parentId: comment.id, body })
                      }
                    />
                  )}

                  {comment.replyCount > 0 && (
                    <div className="mt-1.5 pl-[52px] max-desk:pl-0">
                      <button
                        type="button"
                        onClick={() =>
                          setOpenReplies((prev) => ({ ...prev, [comment.id]: !prev[comment.id] }))
                        }
                        aria-expanded={open}
                        aria-label={`${open ? t.comments.hideReplies : t.comments.showReplies} · ${t.comments.replyCount(comment.replyCount)}`}
                        className={THREAD_LINK}
                      >
                        <ChevronDownIcon
                          size={16}
                          strokeWidth={2}
                          className={cn("transition-transform duration-200", open && "rotate-180")}
                        />
                        {t.comments.replyCount(comment.replyCount)}
                      </button>

                      {open && (
                        <ul className="m-0 mt-2.5 flex list-none flex-col gap-5 py-0 pr-0 pl-5 shadow-[inset_1px_0_0_var(--mq-hairline)]">
                          {replies.map((reply) => (
                            <li key={reply.id}>
                              <CommentRow comment={reply} compact />
                            </li>
                          ))}
                          {remaining > 0 && (
                            <li>
                              <button
                                type="button"
                                disabled={loadingMore}
                                aria-busy={loadingMore || undefined}
                                onClick={() =>
                                  loadMoreReplies.mutate({
                                    commentId: comment.id,
                                    loaded: replies.length,
                                  })
                                }
                                className={THREAD_LINK}
                              >
                                {loadingMore
                                  ? t.comments.loadingReplies
                                  : t.comments.loadMoreReplies(remaining)}
                              </button>
                            </li>
                          )}
                        </ul>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

/** The thread's own shape while it loads — avatar disc, name line, two text lines. */
function ThreadSkeleton() {
  return (
    <ul className="m-0 flex list-none flex-col gap-7 p-0" aria-hidden>
      {[0, 1, 2].map((row) => (
        <li key={row} className="flex gap-3">
          <Skeleton className="size-10 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1">
            <Skeleton className="h-4 w-32 rounded-full" />
            <Skeleton className="mt-2.5 h-3.5 w-full rounded-full" />
            <Skeleton className="mt-1.5 h-3.5 w-3/5 rounded-full" />
          </div>
        </li>
      ))}
    </ul>
  );
}

function PersonAvatar({ url, name, small = false }: { url: string | null; name: string; small?: boolean }) {
  return (
    <Avatar size={small ? "sm" : "default"} className="mt-0.5 shrink-0" aria-hidden>
      <AvatarImage src={url || undefined} alt="" />
      <AvatarFallback>{initialsOf(name)}</AvatarFallback>
    </Avatar>
  );
}

/**
 * Collapsed to a single quiet pill until it's pressed — the invitation to
 * comment shouldn't weigh more than the comments themselves.
 */
function Composer({
  avatarUrl,
  name,
  isPending,
  onSubmit,
}: {
  avatarUrl: string | null;
  name: string;
  isPending: boolean;
  onSubmit: (body: string) => Promise<unknown>;
}) {
  const { t } = useLanguage();
  const s = useSection(titlesText);
  const fieldId = useId();
  const counterId = useId();
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState("");

  const remaining = COMMENT_BODY_MAX - draft.length;

  const post = async () => {
    const body = draft.trim();
    if (!body) return;
    try {
      await onSubmit(body);
      setDraft("");
      setExpanded(false);
    } catch {
      // The mutation already reported it. The draft deliberately survives —
      // a failed request is not a reason to lose what someone wrote.
    }
  };

  if (!expanded) {
    return (
      <div className="flex items-center gap-3">
        <PersonAvatar url={avatarUrl} name={name} />
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="h-12 min-w-0 flex-1 cursor-text rounded-full border-0 bg-raised px-[18px] text-left text-[15px] text-fg-faint transition-colors outline-none hover:bg-raised-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link"
        >
          {t.comments.placeholder}
        </button>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <PersonAvatar url={avatarUrl} name={name} />
      <div className="min-w-0 flex-1">
        <label htmlFor={fieldId} className="sr-only">
          {s.yourComment}
        </label>
        <Textarea
          id={fieldId}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t.comments.placeholder}
          rows={3}
          maxLength={COMMENT_BODY_MAX}
          // The composer only opens because the viewer asked to type.
          autoFocus
          disabled={isPending}
          aria-describedby={counterId}
          className="min-h-24 resize-y text-[15px] leading-[23px]"
        />
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-2.5">
          {/* Silent until the ceiling is actually in reach — a counter on an
              empty box is noise. */}
          <span id={counterId} className="text-xs leading-4 text-fg-faint tabular-nums">
            {remaining <= COUNTER_VISIBLE_FROM ? t.comments.charactersLeft(remaining) : ""}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="tonal"
              size="toolbar"
              disabled={isPending}
              onClick={() => {
                setDraft("");
                setExpanded(false);
              }}
            >
              {t.comments.cancel}
            </Button>
            <Button
              variant="commit"
              size="toolbar"
              onClick={post}
              disabled={!draft.trim()}
              busy={isPending}
              busyLabel={t.comments.posting}
            >
              {t.comments.post}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CommentRow({
  comment,
  onReplyClick,
  replyOpen = false,
  compact = false,
}: {
  comment: Comment;
  onReplyClick?: () => void;
  replyOpen?: boolean;
  compact?: boolean;
}) {
  const { t } = useLanguage();
  const name = authorName(comment);

  return (
    <article className="flex gap-3">
      <PersonAvatar url={comment.user.avatarUrl} name={name} small={compact} />

      <div className="min-w-0 flex-1">
        <p className="m-0 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className={cn("leading-5 font-extrabold text-fg", compact ? "text-sm" : "text-[15px]")}>{name}</span>
          <time dateTime={comment.createdAt} className="text-[13px] leading-[18px] text-fg-faint">
            {relativeTime(comment.createdAt, t)}
          </time>
        </p>

        <p
          className={cn(
            "m-0 text-[15px] leading-[23px] [overflow-wrap:anywhere] whitespace-pre-wrap text-fg-body",
            compact ? "mt-0.5" : "mt-1",
          )}
        >
          {comment.body}
        </p>

        {onReplyClick && (
          <button
            type="button"
            onClick={onReplyClick}
            aria-expanded={replyOpen}
            className="mt-1 inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[6px] border-0 bg-transparent p-0 text-[13px] font-bold text-fg-muted transition-colors outline-none hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link"
          >
            <MessageCircle aria-hidden className="size-4" strokeWidth={1.75} />
            {t.comments.reply}
          </button>
        )}
      </div>
    </article>
  );
}

function ReplyComposer({
  avatarUrl,
  name,
  replyToName,
  isPending,
  onCancel,
  onSubmit,
}: {
  avatarUrl: string | null;
  name: string;
  replyToName: string;
  isPending: boolean;
  onCancel: () => void;
  onSubmit: (body: string) => Promise<unknown>;
}) {
  const { t } = useLanguage();
  const s = useSection(titlesText);
  const fieldId = useId();
  const [body, setBody] = useState("");

  const post = async () => {
    const trimmed = body.trim();
    if (!trimmed) return;
    try {
      await onSubmit(trimmed);
    } catch {
      // Same as the composer above: reported by the mutation, draft kept.
    }
  };

  return (
    <div className="mt-2.5 flex gap-3 pl-[52px] max-desk:pl-0">
      <PersonAvatar url={avatarUrl} name={name} small />
      <div className="min-w-0 flex-1">
        <label htmlFor={fieldId} className="sr-only">
          {s.replyTo(replyToName)}
        </label>
        <Textarea
          id={fieldId}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={t.comments.replyPlaceholder}
          rows={2}
          maxLength={COMMENT_BODY_MAX}
          // Opened by pressing Reply — the viewer is about to type.
          autoFocus
          disabled={isPending}
          className="min-h-[72px] resize-y text-[15px] leading-[23px]"
        />
        <div className="mt-2.5 flex items-center gap-2">
          <Button
            variant="commit"
            size="toolbar"
            disabled={!body.trim()}
            busy={isPending}
            busyLabel={t.comments.posting}
            onClick={post}
          >
            {t.comments.reply}
          </Button>
          <Button variant="tonal" size="toolbar" disabled={isPending} onClick={onCancel}>
            {t.comments.cancel}
          </Button>
        </div>
      </div>
    </div>
  );
}
