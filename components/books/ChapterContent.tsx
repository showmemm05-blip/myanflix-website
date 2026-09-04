"use client";

import { useMemo } from "react";
import { getSchema } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { DOMSerializer, Node as PmNode, type Schema } from "@tiptap/pm/model";

/**
 * The reader's half of the chapter schema.
 *
 * This list MUST match admin/components/books/RichTextEditor.tsx's
 * CHAPTER_EXTENSIONS — the two are separate apps and cannot import from each
 * other, but a node the admin can write and this cannot parse would silently
 * vanish from the published book.
 *
 * It is also the sanitizer: the stored ProseMirror JSON is re-parsed through
 * these extensions' schema and serialized back out, so only nodes they define
 * ever become markup — nothing an author (or a tampered document) puts in the
 * JSON can become arbitrary HTML. That is the whole reason chapters are
 * stored as JSON rather than HTML, and why no separate sanitizer dependency
 * is needed here.
 */
const CHAPTER_EXTENSIONS = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
    link: false,
  }),
  Link.configure({
    openOnClick: true,
    autolink: true,
    protocols: ["http", "https", "mailto"],
    HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank" },
  }),
  Image.configure({ inline: false }),
];

/**
 * Schema + serializer built once per session, not once per chapter — this is
 * generateHTML's own internals (@tiptap/html) with the expensive getSchema
 * hoisted, plus one addition: every TOP-LEVEL block is stamped with
 * data-block-index, the anchor space shared by highlights
 * (reader-annotations), search matches (reader-search) and the reading-time
 * extractor — index n everywhere is child n of the document.
 *
 * Browser-only by declaration: @tiptap/html's generateHTML THROWS on the
 * server, so this component has always rendered empty there and filled in on
 * the client. The window guard keeps that exact behaviour.
 */
let renderer: { schema: Schema; serializer: DOMSerializer } | null = null;

function renderChapterHtml(content: Record<string, unknown>): string {
  if (typeof window === "undefined") return "";
  if (!renderer) {
    const schema = getSchema(CHAPTER_EXTENSIONS);
    renderer = { schema, serializer: DOMSerializer.fromSchema(schema) };
  }
  const doc = PmNode.fromJSON(renderer.schema, content);
  const wrap = document.createElement("div");
  renderer.serializer.serializeFragment(doc.content, { document }, wrap);
  Array.from(wrap.children).forEach((el, index) =>
    el.setAttribute("data-block-index", String(index)),
  );
  return wrap.innerHTML;
}

export function ChapterContent({
  content,
  className,
}: {
  content: Record<string, unknown>;
  className?: string;
}) {
  const html = useMemo(() => {
    try {
      return renderChapterHtml(content);
    } catch {
      return "";
    }
  }, [content]);

  /**
   * Myanmar syllables span several grapheme clusters, and ::first-letter
   * takes only the first — so an un-scoped drop cap tears the opening word
   * in half (မော|င် renders as a giant partial syllable with the remainder
   * at body size). Burmese also has neither hyphenation nor space-separated
   * words, so justification puts a line's whole slack into a couple of
   * phrase gaps. Tagging the language here is what lets globals.css opt all
   * three rules out, and gives the browser correct line-breaking metadata
   * besides. "my" is the BCP-47 code, not the app's internal "mm" key.
   */
  const isMyanmar = useMemo(() => /[က-႟]/.test(html), [html]);

  return (
    <div
      className={className ?? "prose-chapter"}
      lang={isMyanmar ? "my" : undefined}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
