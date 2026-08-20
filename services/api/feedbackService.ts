import { apiClient } from "./apiClient";
import type { FeedbackEntry, FeedbackSubmission } from "@/types/feedback";

export const feedbackService = {
  /**
   * Sends one piece of feedback. Authenticated.
   *
   * The backend allows five per account per rolling hour and answers a sixth
   * with a 429 — callers should catch `ApiError` and check `status === 429`
   * rather than treating it as a generic failure, because it is the one
   * error the user can act on (wait, then try again).
   */
  submit: (payload: FeedbackSubmission) =>
    apiClient.post<FeedbackEntry>("/feedback", payload),
};
