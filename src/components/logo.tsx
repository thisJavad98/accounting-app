const BRAND = "#c8440f";
const PAPER = "#fff7f2";

type LogoMarkProps = {
  size?: number;
  className?: string;
  /** "rounded" for UI and favicons, "bleed" for platform-masked icons (maskable, Apple touch). */
  tile?: "rounded" | "bleed";
  /** Share of the tile the glyph occupies. Maskable icons need it inside the 80% safe zone. */
  scale?: number;
};

/** A bank SMS bubble holding the daily-spending bars: a message that turns into a report. */
export function LogoMark({ size, className, tile = "rounded", scale = 1 }: LogoMarkProps) {
  const offset = 32 * (1 - scale);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      aria-hidden
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="64" height="64" rx={tile === "rounded" ? 16 : 0} fill={BRAND} />
      <g transform={`translate(${offset} ${offset}) scale(${scale})`}>
        <path
          d="M23 15h18a9 9 0 0 1 9 9v10a9 9 0 0 1-9 9H29.5l-9.2 7.4c-.8.6-1.9-.1-1.6-1.1L20.6 42A9 9 0 0 1 14 34V24a9 9 0 0 1 9-9Z"
          fill={PAPER}
        />
        <rect x="21.5" y="30" width="5" height="7" rx="2.5" fill={BRAND} opacity="0.45" />
        <rect x="29.5" y="26" width="5" height="11" rx="2.5" fill={BRAND} opacity="0.45" />
        <rect x="37.5" y="22" width="5" height="15" rx="2.5" fill={BRAND} />
      </g>
    </svg>
  );
}
