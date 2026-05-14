"use client";

import { motion, useReducedMotion, type Variants } from "motion/react";
import type { ReactNode } from "react";

/**
 * Editorial-feeling scroll-reveal: fade + small Y lift, runs once when the
 * element enters the viewport. Honors prefers-reduced-motion (opacity only,
 * no translate) so the page stays usable for vestibular-sensitive readers.
 *
 * Easing is a slow-start / slow-end curve (the "expo out" classic) — feels
 * less startup-y than the default ease-out and pairs well with Fraunces.
 */

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export function Reveal({
  children,
  className,
  delay = 0,
  y = 14,
  as = "div",
  amount = 0.35,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  /** Animation is "as" element — defaults to div. Pass "section" to keep
   *  semantics when wrapping a top-level page section. */
  as?: "div" | "section" | "li" | "ul" | "h2" | "h3" | "p";
  /** How much of the element must be in view before triggering. */
  amount?: number;
}) {
  const reduced = useReducedMotion();
  const variants: Variants = {
    hidden: { opacity: 0, y: reduced ? 0 : y },
    visible: { opacity: 1, y: 0 },
  };
  const Component = motion[as];
  return (
    <Component
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount }}
      transition={{ duration: 0.75, ease: EASE, delay }}
      variants={variants}
    >
      {children}
    </Component>
  );
}

/**
 * Wrapper that staggers reveal of direct children. Pair with <RevealItem />
 * for each child. Useful for the stat cards, FAQ items, how-it-works steps.
 */
export function RevealGroup({
  children,
  className,
  stagger = 0.08,
  delayChildren = 0,
  amount = 0.2,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  stagger?: number;
  delayChildren?: number;
  amount?: number;
  as?: "div" | "ul" | "ol" | "section";
}) {
  const Component = motion[as];
  return (
    <Component
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount }}
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: stagger,
            delayChildren,
          },
        },
      }}
    >
      {children}
    </Component>
  );
}

export function RevealItem({
  children,
  className,
  y = 14,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  y?: number;
  as?: "div" | "li" | "section";
}) {
  const reduced = useReducedMotion();
  const Component = motion[as];
  return (
    <Component
      className={className}
      variants={{
        hidden: { opacity: 0, y: reduced ? 0 : y },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.7, ease: EASE },
        },
      }}
    >
      {children}
    </Component>
  );
}
