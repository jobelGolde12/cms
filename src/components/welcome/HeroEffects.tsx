/**
 * Hero energy layer.
 *
 * Thin branching blue-white arcs, faint pulses and sparse particles that read
 * as digital connectivity rather than a thunderstorm. Everything is a static
 * SVG/CSS composition — no client JavaScript, no canvas, no layout work.
 * Only `opacity` and `transform` are animated, and the whole layer sits above
 * the scrim but behind the hero copy.
 *
 * The arcs are kept to the outer edges (top-left, right and lower-right) so
 * they never cross the school building, the heading, or the Sign In button.
 * All animation is disabled under prefers-reduced-motion (globals.css).
 */
const PARTICLES = [
  { left: "6%", top: "18%", delay: "0s", duration: "11s" },
  { left: "12%", top: "38%", delay: "2.4s", duration: "9s" },
  { left: "9%", top: "64%", delay: "5.1s", duration: "13s" },
  { left: "19%", top: "78%", delay: "1.2s", duration: "10s" },
  { left: "28%", top: "12%", delay: "6.3s", duration: "12s" },
  { left: "38%", top: "22%", delay: "3.6s", duration: "9.5s" },
  { left: "46%", top: "9%", delay: "7.8s", duration: "14s" },
  { left: "58%", top: "16%", delay: "4.2s", duration: "11.5s" },
  { left: "67%", top: "30%", delay: "0.8s", duration: "10.5s" },
  { left: "78%", top: "14%", delay: "5.7s", duration: "12.5s" },
  { left: "86%", top: "36%", delay: "2.1s", duration: "9.8s" },
  { left: "92%", top: "58%", delay: "6.9s", duration: "13.5s" },
  { left: "83%", top: "74%", delay: "3.3s", duration: "10.8s" },
  { left: "73%", top: "88%", delay: "8.4s", duration: "12.2s" },
] as const;

export function HeroEffects() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {/* ── Right edge: branching light streaks ── */}
      <svg
        className="hero-arc-layer absolute right-[5%] top-[3%] h-[56%] w-[42%] opacity-80 sm:w-[34%] md:w-[28%] lg:w-[26%]"
        viewBox="0 0 320 620"
        fill="none"
        preserveAspectRatio="xMaxYMin meet"
      >
        <defs>
          <linearGradient id="hero-arc-right" x1="1" y1="0" x2="0" y2="1">
            <stop stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="0.45" stopColor="#dbeafe" stopOpacity="0.75" />
            <stop offset="1" stopColor="#93c5fd" stopOpacity="0" />
          </linearGradient>
        </defs>

        <g
          className="hero-arc"
          style={{ animationDelay: "1.6s" }}
          stroke="url(#hero-arc-right)"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M318 26 L276 96 L294 130 L246 172 L262 210 L232 246" />
          <path d="M276 96 L232 86 L204 104" />
          <path d="M294 130 L318 150" />
          <path d="M246 172 L214 160 L196 172" />
          <path d="M232 246 L206 238" />
        </g>

        <g
          className="hero-arc hero-arc--slow"
          style={{ animationDelay: "7.4s" }}
          stroke="url(#hero-arc-right)"
          strokeWidth="1"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M316 286 L282 334 L298 364 L262 400 L274 432" />
          <path d="M282 334 L250 326" />
          <path d="M298 364 L318 380" />
          <path d="M262 400 L234 414 L226 442" />
        </g>

        <g
          className="hero-arc"
          style={{ animationDelay: "11.2s" }}
          stroke="url(#hero-arc-right)"
          strokeWidth="0.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M310 468 L286 502 L300 526 L276 552" />
          <path d="M286 502 L258 494" />
        </g>
      </svg>

      {/* ── Top-left corner: a quiet secondary arc, desktop only ── */}
      <svg
        className="hero-arc-layer absolute left-[1%] top-[-1%] hidden h-[34%] w-[26%] opacity-50 sm:block lg:w-[22%]"
        viewBox="0 0 260 300"
        fill="none"
        preserveAspectRatio="xMinYMin meet"
      >
        <defs>
          <linearGradient id="hero-arc-left" x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#60a5fa" stopOpacity="0.1" />
            <stop offset="0.5" stopColor="#dbeafe" stopOpacity="0.55" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0.8" />
          </linearGradient>
        </defs>

        <g
          className="hero-arc hero-arc--slow"
          style={{ animationDelay: "4.8s" }}
          stroke="url(#hero-arc-left)"
          strokeWidth="1"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M8 12 L52 58 L40 90 L78 116 L70 146" />
          <path d="M52 58 L88 50 L110 64" />
          <path d="M40 90 L18 84" />
          <path d="M78 116 L100 108" />
        </g>
      </svg>

      {/* ── Very brief glow events, outer areas only ── */}
      <div
        className="hero-glow absolute left-[16%] top-[24%] hidden h-40 w-40 rounded-full bg-[radial-gradient(closest-side,rgba(147,197,253,0.30),transparent)] md:block"
        style={{ animationDelay: "3.2s" }}
      />
      <div
        className="hero-glow absolute right-[12%] top-[30%] h-44 w-44 rounded-full bg-[radial-gradient(closest-side,rgba(191,219,254,0.28),transparent)]"
        style={{ animationDelay: "8.6s" }}
      />
      <div
        className="hero-glow absolute bottom-[16%] right-[24%] hidden h-32 w-32 rounded-full bg-[radial-gradient(closest-side,rgba(96,165,250,0.25),transparent)] sm:block"
        style={{ animationDelay: "12.4s" }}
      />

      {/* ── Sparse drifting particles ── */}
      {PARTICLES.map((particle) => (
        <span
          key={`${particle.left}-${particle.top}`}
          className="hero-particle absolute h-[2px] w-[2px] rounded-full bg-[#dbeafe] shadow-[0_0_6px_1px_rgba(191,219,254,0.45)]"
          style={{
            left: particle.left,
            top: particle.top,
            animationDelay: particle.delay,
            animationDuration: particle.duration,
          }}
        />
      ))}
    </div>
  );
}
