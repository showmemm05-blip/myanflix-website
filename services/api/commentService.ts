import { apiClient } from "./apiClient";
import type { Comment, CommentTarget } from "@/types/comment";

/**
 * Comments on a movie or a series.
 *
 * The shapes come back ready to render — the backend already resolves the
 * author's avatar into an absolute URL and nests one level of replies — so
 * there is no backend-to-domain mapping layer here, unlike movieService.
 */
export const commentService = {
  /**
   * A title's visible thread, newest first.
   *
   * `skipAuth` because `GET /comments` is @Public on the backend: signed-out
   * visitors read the same thread signed-in ones do, and sending a token that
   * cannot matter would only add a pointless refresh-on-401 dance to a page
   * that renders fine without an account.
   */
  list: (target: CommentTarget) =>
    apiClient.get<Comment[]>("/comments", { params: target, skipAuth: true }),

  /**
   * Posts a comment, or a reply when `parentId` is given. Authenticated —
   * the author is taken from the token, never from the body.
   */
  create: (payload: CommentTarget & { body: string; parentId?: string }) =>
    apiClient.post<Comment>("/comments", payload),
};
