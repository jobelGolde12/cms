"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Client island for one animated distribution bar row.
 *
 * Server components map over rows and pass serializable props only; this
 * island owns hover/focus state, the branded tooltip, and the CSS entrance
 * animation. Numbers are always rendered in the DOM (SSR-safe), so the row
 * remains correct even if client JS never runs (plan §20.1).
 */

/** Math to describe one row; pure so it can be unit-tested / reused. */
export function distributionBarMeta(value: number, max: number, total?: number) {
  const safeMax = max > 0 ? max : 1;
  return {
    /** Bar width as % of the largest value in the set (0–100). */
    percent: Math.round((value / safeMax) * 100),
    /** Share of the full dataset as %, when a total is provided. */
    share: total && total > 0 ? Math.round((value / total) * 100) : null,
  };
}

const STAGGER_CLASSES = [
  "stagger-0",
  "stagger-1",
  "stagger-2",
  "stagger-3",
  "stagger-4",
  "stagger-5",
  "stagger-6",
  "stagger-7",
] as const;

export interface DistributionBarProps {
  label: string;
  value: number;
  max: number;
  /** Total across the full dataset (not just visible rows) for share %. */
  total?: number;
  /** 1-based position among visible rows. */
  rank?: number;
  /** Stagger slot for the row entrance (capped at 8). */
  index?: number;
  barClassName: string;
  /** Optional drill-down; renders as a real link instead of window.location. */
  href?: string;
}

export function DistributionBar({
  label,
  value,
  max,
  total,
  rank,
  index = 0,
  barClassName,
  href,
}: DistributionBarProps) {
  const [showTip, setShowTip] = useState(false);
  const [pin, setPin] = useState(false); // touch: tap to pin the tooltip
  const open = showTip || pin;

  const { percent, share } = distributionBarMeta(value, max, total);
  const isLink = Boolean(href);

  // Stable per-row id — no Math.random / Date.now (plan §21 hydration risk).
  const tipId = `dbar-tip-${label.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}`;

  const stateProps = {
    onMouseEnter: () => setShowTip(true),
    onMouseLeave: () => setShowTip(false),
    onFocus: () => setShowTip(true),
    onBlur: () => setShowTip(false),
    onTouchStart: (e: React.TouchEvent) => {
      if (!open) {
        e.preventDefault(); // first tap: pin tooltip, don't navigate
        setPin(true);
      }
    },
    onClick: () => {
      // Progressive disclosure on touch: first tap pins the tooltip,
      // second tap dismisses it (link rows then follow the Link normally).
      if (pin) setPin(false);
    },
  };

  const tooltip = (
    <span
      id={tipId}
      role="tooltip"
      aria-hidden={!open}
      className={cn(
        "pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 w-max max-w-[240px] -translate-x-1/2 rounded-md border border-brand-200 bg-white px-2.5 py-1.5 text-left text-[11px] leading-snug text-brand-700 shadow-md",
        "transition-[opacity,transform] duration-150 ease-out",
        open
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-1 opacity-0",
      )}
    >
      <span className="block truncate font-semibold text-brand-900">{label}</span>
      <span className="numeric block font-bold text-brand-900">
        {value}
        {share !== null ? ` · ${share}% of total` : ""}
        {rank !== undefined ? ` · Rank #${rank}` : ""}
      </span>
    </span>
  );

  const rowContent = (
    <>
      <span
        aria-hidden="true"
        className={cn("h-1.5 w-1.5 shrink-0 rounded-full", barClassName)}
      />
      <span
        className="w-24 min-w-0 shrink-0 truncate text-xs text-brand-600 transition-colors duration-150 group-hover:text-brand-900 sm:w-32 md:w-40"
        title={label}
      >
        {label}
      </span>
      <span
        className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-brand-100"
        aria-hidden="true"
      >
        <span
          className={cn("bar-grow block h-full rounded-full", barClassName)}
          style={{ width: `${percent}%` }}
        />
      </span>
      <span className="numeric shrink-0 whitespace-nowrap text-right text-xs font-semibold text-brand-900">
        {value}
        {share !== null ? (
          <span className="hidden text-[10px] font-normal text-brand-400 sm:inline">
            {" "}
            ({share}%)
          </span>
        ) : null}
      </span>
      {tooltip}
    </>
  );

  const rowClasses = cn(
    "group relative row-fade flex min-h-11 items-center gap-3 rounded-md px-1 py-0.5 -mx-1 md:min-h-8",
    "transition-colors duration-150",
    open ? "bg-brand-50" : "bg-transparent",
    "focus-within:bg-brand-50",
  );

  return (
    <li className={cn(rowClasses, STAGGER_CLASSES[Math.min(index, 7)])}>
      {isLink ? (
        <Link
          href={href!}
          className="flex min-w-0 flex-1 items-center gap-3"
          aria-label={`${label}: ${value}${share !== null ? ` (${share}% of total)` : ""}`}
          aria-describedby={open ? tipId : undefined}
          {...stateProps}
        >
          {rowContent}
        </Link>
      ) : (
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-3"
          aria-label={`${label}: ${value}${share !== null ? ` (${share}% of total)` : ""}`}
          aria-describedby={open ? tipId : undefined}
          {...stateProps}
        >
          {rowContent}
        </button>
      )}
    </li>
  );
}
