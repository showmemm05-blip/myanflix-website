"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, MessageCircle, MessageSquare } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Chip, SectionHeader, Surface } from "@/components/system";
import { EmptyState } from "@/components/empty/EmptyState";
import { useAuth } from "@/lib/context/auth-context";
import { useLanguage } from "@/lib/context/language-context";
import { cn } from "@/lib/utils";

/**
 * Comment thread for a movie or series.
 *
 * REPLY-FIRST BY DESIGN: the only affordance on a comment is "reply", and there
 * are deliberately no reactions — a like button turns a conversation into a
 * scoreboard, and this section exists to hold conversation.
 *
 * UI ONLY — there is no comments API yet, so everything lives in component
 * state and is gone on reload. It deliberately starts empty rather than seeded
 * with sample comments: this renders on the live site, and invented opinions
 * attributed to invented people would read as real user content to a visitor.
 * When the endpoint exists, replace the `useState` below with the query and the
 * two handlers with mutations — the markup shouldn't need to change.
 */
export interface DraftComment {
  id: string;
  authorName: string;
  authorAvatar: string | null;
  body: string;
  createdAt: number;
  replies: DraftComment[];
}

export function CommentsSection({ titleId }: { titleId: string }) {
  const { t } = useLanguage();
  const { user, isAuthenticated } = useAuth();
  const [comments, setComments] = useState<DraftComment[]>([]);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [openReplies, setOpenReplies] = useState<Record<string, boolean>>({});

  const total = useMemo(
    () => comments.reduce((sum, comment) => sum + 1 + comment.replies.length, 0),
    [comments],
  );

  const newComment = (body: string): DraftComment => ({
    // Not crypto-strength on purpose — these ids never leave the component.
    id: `${titleId}-${comments.length}-${body.length}-${performance.now()}`,
    authorName: user?.name ?? t.comments.you,
    authorAvatar: user?.avatarUrl ?? null,
    body,
    createdAt: Date.now(),
    replies: [],
  });

  const submit = (body: string) => {
    setComments((prev) => [newComment(body), ...prev]);
  };

  const submitReply = (parentId: string, body: string) => {
    setComments((prev) =>
      prev.map((comment) =>
        comment.id === parentId
          ? { ...comment, replies: [...comment.replies, newComment(body)] }
          : comment,
      ),
    );
    setReplyingTo(null);
    // A thread you just replied to should never sit collapsed under its toggle.
    setOpenReplies((prev) => ({ ...prev, [parentId]: true }));
  };

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
              onSubmit={submit}
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
          {comments.length === 0 ? (
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
                      onCancel={() => setReplyingTo(null)}
                      onSubmit={(body) => submitReply(comment.id, body)}
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

/**
 * Collapsed to a single quiet pill until it's focused — the invitation to
 * comment shouldn't weigh more than the comments themselves.
 */
function Composer({
  avatarUrl,
  name,
  onSubmit,
}: {
  avatarUrl: string | null;
  name: string;
  onSubmit: (body: string) => void;
}) {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState("");

  const post = () => {
    const body = draft.trim();
    if (!body) return;
    onSubmit(body);
    setDraft("");
    setExpanded(false);
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
            autoFocus
            className="resize-none rounded-2xl border-white/10 bg-secondary/40 backdrop-blur-md"
          />
          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-3">
            <span className="text-[11px] text-muted-foreground">{t.comments.notWiredUp}</span>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                className="h-10 rounded-full px-4"
                onClick={() => {
                  setDraft("");
                  setExpanded(false);
                }}
              >
                {t.comments.cancel}
              </Button>
              <Button onClick={post} disabled={!draft.trim()} className="h-10 rounded-full px-5">
                {t.comments.post}
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
  comment: DraftComment;
  onReplyClick?: () => void;
  compact?: boolean;
}) {
  const { t } = useLanguage();

  return (
    <article className="flex gap-3">
      <Avatar className={cn("mt-0.5 shrink-0 ring-1 ring-white/10 ring-inset", compact ? "size-8" : "size-9")}>
        <AvatarImage src={comment.authorAvatar || undefined} alt="" />
        <AvatarFallback>{comment.authorName.slice(0, 2).toUpperCase()}</AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="font-heading text-sm font-semibold tracking-tight">{comment.authorName}</span>
          {/* Everything here was written this session, so the timestamp is
              always "just now" — no need to format an absolute date yet. */}
          <span className="text-xs text-muted-foreground">{t.comments.justNow}</span>
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
  onCancel,
  onSubmit,
}: {
  avatarUrl: string | null;
  name: string;
  onCancel: () => void;
  onSubmit: (body: string) => void;
}) {
  const { t } = useLanguage();
  const [body, setBody] = useState("");

  const post = () => {
    const trimmed = body.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
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
          autoFocus
          className="resize-none rounded-2xl border-white/10 bg-secondary/40 backdrop-blur-md"
        />
        <div className="mt-2.5 flex items-center gap-2">
          <Button size="sm" className="h-10 rounded-full px-4" disabled={!body.trim()} onClick={post}>
            {t.comments.reply}
          </Button>
          <Button size="sm" variant="ghost" className="h-10 rounded-full px-3" onClick={onCancel}>
            {t.comments.cancel}
          </Button>
        </div>
      </div>
    </div>
  );
}
