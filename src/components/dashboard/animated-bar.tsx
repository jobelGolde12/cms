"use client";

import { cn } from "@/lib/utils";
import { useInView } from "./use-in-view";

/**
 * AnimatedBar — a single track + fill bar that animates from 0 to its target
 * width the first time it scrolls into view (IntersectionObserver + the shared
 * `bar-grow` keyframe). Replaces on-mount CSS so off-screen charts don't play
 * their animation before the user sees them.
 */
export function AnimatedBar({
  widthPercent,
  className,
  trackClassName,
  ariaLabel,
  delay = 0,
}: {
  widthPercent: number;
  /** Fill color classes (bg-*). */
  className: string;
  /** Track sizing/margin classes. */
  trackClassName?: string;
  ariaLabel?: string;
  delay?: number;
}) {
  const { ref, inView } = useInView<HTMLDivElement>();

  return (
    <div
      ref={ref}
      className={cn("overflow-hidden rounded-full bg-brand-100", trackClassName)}
    >
      <div
        role="presentation"
        aria-label={ariaLabel}
        className={cn("h-full rounded-full", inView && "bar-grow", className)}
        style={{
          width: `${Math.min(100, widthPercent)}%`,
          visibility: inView ? undefined : "hidden",
          animationDelay: `${delay}ms`,
        }}
      />
    </div>
  );
}

/**
 * AnimatedStackedBar — stacked segments that expand left to right, staggered,
 * when scrolled into view. Uses a width transition (not transform) because
 * each segment has its own origin inside the stack.
 */
export function AnimatedStackedBar({
  segments,
  ariaLabel,
  trackClassName,
}: {
  segments: { className: string; percent: number; title?: string }[];
  ariaLabel?: string;
  trackClassName?: string;
}) {
  const { ref, inView } = useInView<HTMLDivElement>();

  return (
    <div
      ref={ref}
      role="img"
      aria-label={ariaLabel}
      className={cn("flex w-full overflow-hidden rounded-full bg-brand-100", trackClassName)}
    >
      {segments.map((segment, i) => (
        <div
          key={i}
          className={cn("h-full", segment.className)}
          style={{
            width: inView
              ? `${Math.min(100, segment.percent)}%`
              : "0%",
            transition: inView
              ? "width 500ms cubic-bezier(0.33, 1, 0.68, 1)"
              : undefined,
            transitionDelay: inView ? `${i * 80}ms` : undefined,
          }}
          title={segment.title}
        />
      ))}
    </div>
  );
}
