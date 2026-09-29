/**
 * How far into its chapter a saved reading position is (H-31).
 *
 * Both clients save a written book's place as one whole-book percentage,
 * progress = (chapterIndex + depthInChapter) / chapterCount × 100 (see
 * ChapterReader.computeProgress here and the mobile ChapterReader), so the
 * depth is recovered by inverting that. Pure (no imports) so it can be
 * checked on its own.
 *
 * Returns null when there is nothing worth restoring: the very top (under
 * 1%), the very end (99% and over), or a chapter index that does not fit.
 */
export function savedChapterDepth(
  progress: number,
  chapterIndex: number,
  chapterCount: number,
): number | null {
  if (
    !Number.isFinite(progress) ||
    chapterCount <= 0 ||
    chapterIndex < 0 ||
    chapterIndex >= chapterCount
  ) {
    return null;
  }
  const perChapter = 100 / chapterCount;
  const depth = Math.min(1, Math.max(0, progress / perChapter - chapterIndex));
  return depth > 0.01 && depth < 0.99 ? depth : null;
}
