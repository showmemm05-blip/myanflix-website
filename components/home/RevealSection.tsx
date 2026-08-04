"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface RevealSectionProps {
  children: ReactNode;
  className?: string;
  as?: "section" | "div";
  delay?: number;
  y?: number;
  once?: boolean;
  amount?: number;
}

export function RevealSection({
  children,
  className,
  as = "section",
  delay = 0,
  y = 24,
  once = true,
  amount = 0.2,
}: RevealSectionProps) {
  const MotionTag = as === "section" ? motion.section : motion.div;

  return (
    <MotionTag
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, amount }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
      className={cn(className)}
    >
      {children}
    </MotionTag>
  );
}
