"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Loader2, MessageCircle, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Chip, SectionHeader, Surface } from "@/components/system";
import { EmptyState } from "@/components/empty/EmptyState";
import { ErrorState } from "@/components/empty/ErrorState";
import { useAuth } from "@/lib/context/auth-context";
import { useLanguage } from "@/lib/context/language-context";
import { cn } from "@/lib/utils";
import { commentService } from "@/services/api/commentService";
import { ApiError } from "@/services/api/apiClient";
import { COMMENT_BODY_MAX, type Comment, type CommentTarget } from "@/types/comment";
import type { TranslationShape } from "@/lib/i18n/translations";

/**
 * Comment thread for a movie or series.
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
 */

/** How close to the backend's ceiling the draft gets before the count appears. */
const COUNTER_VISIBLE_FROM = 100;

/** The author's name as the thread shows it — the display name, else the handle. */
function authorName(comment: Comment): string {
  return comment.user.displayName?.trim() || comment.user.username;
}

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

export function CommentsSection(target: CommentTarget) {
  const { t } = useLanguage();
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [openReplies, setOpenReplies] = useState<Record<string, boolean>>({});

  // Both ids are in the key: a movie and a series are different threads even
  // in the impossible case that they ever shared an id.
  const queryKey = ["comments", target.movieId ?? null, target.seriesId ?? null];

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
    (sum, comment) => sum + 1 + comment.replies.length,
    0,
  );

  // A failed post keeps its draft (see Composer), so the toast is the whole
  // report. A 4xx is passed through because it says something the reader can
  // act on ("A comment cannot be empty", an expired session); a 5xx or a
  // dropped connection is not — "Internal server error" in English is strictly
  // worse than the translated sentence.
  const reportFailure = (error: unknown) => {
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
    onSuccess: (_reply, { parentId }) => {
      setReplyingTo(null);
      // A thread you just replied to should never sit collapsed under its toggle.
      setOpenReplies((prev) => ({ ...prev, [parentId]: true }));
      return queryClient.invalidateQueries({ queryKey });
    },
    onError: reportFailure,
  });

  return (
    <section className="mx-auto w-full max-w-[1600px] px-4 pt-14 sm:px-6 lg:px-8">
      <div className="max-w-3xl">
        <SectionHeader
          as="h2"
          title={t.comments.heading}
          action={
            <Chip tone="neutral" className="nums">
              {t.comments.count(total)}
            </Chip>
          }
        />

        <div className="mt-6">
          {isAuthenticated ? (
            <Composer
              avatarUrl={user?.avatarUrl ?? null}
              name={user?.name ?? t.comments.you}
              isPending={postComment.isPending}
              onSubmit={(body) => postComment.mutateAsync(body)}
            />
          ) : (
            <Surface
              tone="subtle"
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5"
            >
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <MessageCircle className="size-4" />
                {t.comments.signedOutPrompt}
              </p>
              <Button
                variant="outline"
                className="h-10 rounded-full px-4"
                render={<Link href="/login" />}
                nativeButton={false}
              >
                {t.comments.signIn}
              </Button>
            </Surface>
          )}
        </div>

        <div className="mt-8">
          {isLoading ? (
            <ThreadSkeleton />
          ) : isError ? (
            <ErrorState
              description={t.comments.loadFailed}
              onRetry={() => void refetch()}
              className="py-12"
            />
          ) : !comments || comments.length === 0 ? (
            <EmptyState
              icon={MessageSquare}
              title={t.comments.emptyTitle}
              description={t.comments.emptyBody}
              className="py-12"
            />
          ) : (
            <ul className="flex flex-col gap-7">
              {comments.map((comment) => (
                <li key={comment.id}>
                  <CommentRow
                    comment={comment}
                    onReplyClick={
                      isAuthenticated
                        ? () => setReplyingTo(replyingTo === comment.id ? null : comment.id)
                        : undefined
                    }
                  />

                  {replyingTo === comment.id && (
                    <ReplyComposer
                      avatarUrl={user?.avatarUrl ?? null}
                      name={user?.name ?? t.comments.you}
                      isPending={postReply.isPending}
                      onCancel={() => setReplyingTo(null)}
                      onSubmit={(body) =>
                        postReply.mutateAsync({ parentId: comment.id, body })
                      }
                    />
                  )}

                  {comment.replies.length > 0 && (
                    <div className="mt-2.5 pl-12">
                      <button
                        type="button"
                        onClick={() =>
                          setOpenReplies((prev) => ({ ...prev, [comment.id]: !prev[comment.id] }))
                        }
                        aria-expanded={!!openReplies[comment.id]}
                        aria-label={
                          openReplies[comment.id] ? t.comments.hideReplies : t.comments.showReplies
                        }
                        className="focus-ring flex items-center gap-1.5 rounded-full py-1 text-xs font-semibold text-primary transition-colors duration-150 ease-out hover:text-primary/80"
                      >
                        <ChevronDown
                          className={cn(
                            "size-3.5 transition-transform duration-200 ease-out",
                            openReplies[comment.id] && "rotate-180",
                          )}
                        />
                        {t.comments.replyCount(comment.replies.length)}
                      </button>

                      {openReplies[comment.id] && (
                        <ul className="mt-3 flex flex-col gap-5 border-l border-white/8 pl-5">
                          {comment.replies.map((reply) => (
                            <li key={reply.id}>
                              <CommentRow comment={reply} compact />
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

/** The thread's own shape while it loads — avatar disc, name line, two text lines. */
function ThreadSkeleton() {
  return (
    <ul className="flex flex-col gap-7" aria-hidden>
      {[0, 1, 2].map((row) => (
        <li key={row} className="flex gap-3">
          <Skeleton className="size-9 shrink-0 rounded-full" />
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

/**
 * Collapsed to a single quiet pill until it's focused — the invitation to
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

  return (
    <div className="flex gap-3">
      <Avatar className="mt-0.5 size-9 shrink-0 ring-1 ring-white/10 ring-inset">
        <AvatarImage src={avatarUrl || undefined} alt="" />
        <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
      </Avatar>

      {expanded ? (
        <div className="min-w-0 flex-1">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t.comments.placeholder}
            rows={3}
            maxLength={COMMENT_BODY_MAX}
            autoFocus
            disabled={isPending}
            className="resize-none rounded-2xl border-white/10 bg-secondary/40 backdrop-blur-md"
          />
          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-3">
            {/* Silent until the ceiling is actually in reach — a counter on an
                empty box is noise. */}
            <span className="text-[11px] text-muted-foreground nums">
              {remaining <= COUNTER_VISIBLE_FROM ? t.comments.charactersLeft(remaining) : ""}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                className="h-10 rounded-full px-4"
                disabled={isPending}
                onClick={() => {
                  setDraft("");
                  setExpanded(false);
                }}
              >
                {t.comments.cancel}
              </Button>
              <Button
                onClick={post}
                disabled={!draft.trim() || isPending}
                className="h-10 rounded-full px-5"
              >
                {isPending && <Loader2 className="size-4 animate-spin" />}
                {isPending ? t.comments.posting : t.comments.post}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="focus-ring h-11 min-w-0 flex-1 rounded-full bg-secondary/40 px-4 text-left text-sm text-muted-foreground ring-1 ring-white/8 backdrop-blur-md transition-colors duration-150 ease-out ring-inset hover:bg-secondary/60 hover:text-foreground/80"
        >
          {t.comments.placeholder}
        </button>
      )}
    </div>
  );
}

function CommentRow({
  comment,
  onReplyClick,
  compact = false,
}: {
  comment: Comment;
  onReplyClick?: () => void;
  compact?: boolean;
}) {
  const { t } = useLanguage();
  const name = authorName(comment);

  return (
    <article className="flex gap-3">
      <Avatar className={cn("mt-0.5 shrink-0 ring-1 ring-white/10 ring-inset", compact ? "size-8" : "size-9")}>
        <AvatarImage src={comment.user.avatarUrl || undefined} alt="" />
        <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="font-heading text-sm font-semibold tracking-tight">{name}</span>
          <time dateTime={comment.createdAt} className="text-xs text-muted-foreground">
            {relativeTime(comment.createdAt, t)}
          </time>
        </div>

        <p className="mt-1 text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">{comment.body}</p>

        {onReplyClick && (
          <button
            type="button"
            onClick={onReplyClick}
            className="focus-ring mt-1.5 flex items-center gap-1.5 rounded-full py-1 text-xs font-medium text-muted-foreground transition-colors duration-150 ease-out hover:text-foreground"
          >
            <MessageCircle className="size-3.5" />
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
  isPending,
  onCancel,
  onSubmit,
}: {
  avatarUrl: string | null;
  name: string;
  isPending: boolean;
  onCancel: () => void;
  onSubmit: (body: string) => Promise<unknown>;
}) {
  const { t } = useLanguage();
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
    <div className="mt-3 flex gap-3 pl-12">
      <Avatar className="mt-0.5 size-8 shrink-0 ring-1 ring-white/10 ring-inset">
        <AvatarImage src={avatarUrl || undefined} alt="" />
        <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={t.comments.replyPlaceholder}
          rows={2}
          maxLength={COMMENT_BODY_MAX}
          autoFocus
          disabled={isPending}
          className="resize-none rounded-2xl border-white/10 bg-secondary/40 backdrop-blur-md"
        />
        <div className="mt-2.5 flex items-center gap-2">
          <Button
            size="sm"
            className="h-10 rounded-full px-4"
            disabled={!body.trim() || isPending}
            onClick={post}
          >
            {isPending && <Loader2 className="size-4 animate-spin" />}
            {isPending ? t.comments.posting : t.comments.reply}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-10 rounded-full px-3"
            disabled={isPending}
            onClick={onCancel}
          >
            {t.comments.cancel}
          </Button>
        </div>
      </div>
    </div>
  );
}
