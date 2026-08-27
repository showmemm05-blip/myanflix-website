"use client";

import { motion } from "framer-motion";

/**
 * The soft rise-in each media category page enters with. Wrapped around each
 * PAGE (which remounts when the category route changes), never done with a
 * route template: a template re-instances its subtree on EVERY navigation —
 * including the catalog's own `router.replace` URL sync — which aborted every
 * in-flight catalog query mid-flight and remounted the page in a loop. A page
 * component, by contrast, only remounts when the category actually changes,
 * so the animation plays exactly when the content is new. Same easing as the
 * rest of Aurora Theater.
 */
export function MediaPageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
