import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "PollPotato — settle it, fast.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Brand tokens (hard-coded — ImageResponse can't read CSS variables).
const PAPER = "#F1F2FB";
const INK = "#211B4E";
const INK_SOFT = "#5F5A8A";
const PRIMARY = "#4F46E5";
const MARK = "#C9F25C";
const MARK_INK = "#27340A";
const SURFACE = "#FFFFFF";
const LINE = "#E6E5F4";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: PAPER,
          padding: "72px 88px",
          color: INK,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <PotatoMark size={68} />
          <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: "-0.02em" }}>
            PollPotato
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 28,
            marginTop: -40,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              flexWrap: "wrap",
              gap: 24,
              fontSize: 140,
              fontWeight: 800,
              letterSpacing: "-0.035em",
              lineHeight: 1,
            }}
          >
            <span>Settle it.</span>
            <span
              style={{
                background: MARK,
                color: MARK_INK,
                padding: "4px 26px 14px",
                borderRadius: 22,
              }}
            >
              Fast.
            </span>
          </div>
          <div
            style={{
              fontSize: 36,
              color: INK_SOFT,
              maxWidth: 880,
              lineHeight: 1.25,
            }}
          >
            Spin up a poll in ten seconds, share one link, watch the votes roll in.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              background: SURFACE,
              border: `1px solid ${LINE}`,
              borderRadius: 999,
              padding: "16px 28px",
              fontSize: 28,
              fontWeight: 700,
              color: PRIMARY,
            }}
          >
            pollpotato.com
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              fontSize: 24,
              color: INK_SOFT,
              fontFamily: "monospace",
              fontWeight: 700,
            }}
          >
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: 999,
                background: "#22C55E",
                boxShadow: "0 0 0 5px rgba(34,197,94,0.18)",
              }}
            />
            live results
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}

function PotatoMark({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g transform="rotate(-8 16 16)">
        <path
          d="M16 3c7.5 0 13 5 12.5 13 -.5 7 -6 13 -12.5 13 -6.5 0 -12 -5.5 -12 -12 0 -8 5 -14 12 -14z"
          fill={PRIMARY}
        />
        <circle cx="12.5" cy="14" r="1.8" fill="#FFFFFF" />
        <circle cx="20" cy="14" r="1.8" fill="#FFFFFF" />
        <path
          d="M11.5 18.5 Q16 23 20.5 18.5"
          fill="none"
          stroke={MARK}
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}
