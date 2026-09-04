/**
 * Sections of a written chapter, composed into ONE ProseMirror document.
 *
 * A chapter's own blocks come first, then every section as a level-2
 * heading (`"1.2 Title"`) followed by the section's blocks. That keeps a
 * single block-index space per chapter, which is what annotations, search
 * offsets, reading time and jump targets all key on — and because the
 * sections are appended AFTER the chapter's blocks, an existing highlight
 * keeps its anchor even when the chapter later gains sections.
 *
 * With no sections the chapter's document is returned BY IDENTITY: not a
 * copy, the same object. That is the guarantee that every existing book
 * renders exactly as it did — same HTML, same indices, same minutes.
 *
 * The algorithm is spelled out in the hierarchy spec and mirrored on
 * mobile; keep the two in step.
 */

export type ProseDoc = Record<string, unknown> & {
  type?: string;
  content?: unknown[];
};

export interface ComposableSection {
  id: string;
  title: string;
  number: string;
  content?: Record<string, unknown> | null;
}

export interface SectionAnchor {
  sectionId: string;
  number: string;
  title: string;
  /** The heading block — where a jump to this section lands. */
  blockIndex: number;
  /** The section's last block (the heading itself when it is empty). */
  endBlockIndex: number;
}

export interface ComposedChapter {
  doc: ProseDoc | null;
  anchors: SectionAnchor[];
}

export function composeChapterDoc(chapter: {
  content: Record<string, unknown> | null | undefined;
  sections?: ComposableSection[] | null;
}): ComposedChapter {
  const content = (chapter.content ?? null) as ProseDoc | null;
  if (!chapter.sections || chapter.sections.length === 0) {
    // Identity, deliberately: see the module note.
    return { doc: content, anchors: [] };
  }
  const base = Array.isArray(content?.content) ? content.content : [];
  const blocks: unknown[] = [...base];
  const anchors: SectionAnchor[] = [];
  for (const section of chapter.sections) {
    const blockIndex = blocks.length;
    blocks.push({
      type: "heading",
      attrs: { level: 2 },
      content: [
        { type: "text", text: `${section.number} ${section.title}`.trim() },
      ],
    });
    const body = (section.content as ProseDoc | null | undefined)?.content;
    if (Array.isArray(body)) blocks.push(...body);
    anchors.push({
      sectionId: section.id,
      number: section.number,
      title: section.title,
      blockIndex,
      endBlockIndex: blocks.length - 1,
    });
  }
  return { doc: { type: "doc", content: blocks }, anchors };
}

/** The section whose heading is at or above `blockIndex`, or null before the first one. */
export function sectionIdAtBlock(
  anchors: SectionAnchor[],
  blockIndex: number,
): string | null {
  let found: string | null = null;
  for (const anchor of anchors) {
    if (anchor.blockIndex <= blockIndex) found = anchor.sectionId;
    else break;
  }
  return found;
}

/** The same lookup from a scroll depth (0..1) over a `totalBlocks`-block document. */
export function sectionIdAtDepth(
  anchors: SectionAnchor[],
  depth: number,
  totalBlocks: number,
): string | null {
  if (anchors.length === 0 || totalBlocks <= 0) return null;
  return sectionIdAtBlock(anchors, Math.floor(depth * totalBlocks));
}

/** PDF chapters: the last section (by start page) that begins at or before `pageNumber`. */
export function sectionIdAtPage(
  sections: Array<{ id: string; startPage: number | null }>,
  pageNumber: number,
): string | null {
  let found: { id: string; startPage: number } | null = null;
  for (const section of sections) {
    if (section.startPage === null || section.startPage > pageNumber) continue;
    if (!found || section.startPage >= found.startPage)
      found = { id: section.id, startPage: section.startPage };
  }
  return found?.id ?? null;
}
