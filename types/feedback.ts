/** The backend's `FeedbackCategory` enum, in the order the picker offers them. */
export const FEEDBACK_CATEGORIES = [
  "BUG",
  "SUGGESTION",
  "CONTENT",
  "PAYMENT",
  "OTHER",
] as const;

export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];

export type FeedbackStatus = "NEW" | "IN_REVIEW" | "RESOLVED" | "DISMISSED";

export interface FeedbackSubmission {
  category: FeedbackCategory;
  message: string;
}

/** What `POST /feedback` echoes back. `adminNote` is internal and never returned. */
export interface FeedbackEntry {
  id: string;
  category: FeedbackCategory;
  message: string;
  status: FeedbackStatus;
  createdAt: string;
}

/** Mirrors the backend's 5..2000 rule on a trimmed message. */
export const FEEDBACK_MESSAGE_MIN = 5;
export const FEEDBACK_MESSAGE_MAX = 2000;
