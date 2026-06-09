import { cn } from "@/lib/utils";

type Mood = "happy" | "expectant" | "loading";

const PATHS: Record<Mood, React.ReactNode> = {
  happy: (
    <>
      <circle cx="45" cy="52" r="9.5" fill="#ffffff" />
      <circle cx="78" cy="52" r="9.5" fill="#ffffff" />
      <circle cx="47" cy="54" r="4" fill="#1a1340" />
      <circle cx="80" cy="54" r="4" fill="#1a1340" />
      <path
        d="M47 73 Q61 84 75 73"
        stroke="var(--mark)"
        strokeWidth="4.5"
        fill="none"
        strokeLinecap="round"
      />
      <ellipse cx="34" cy="68" rx="6" ry="4" fill="var(--mark)" opacity=".5" />
      <ellipse cx="88" cy="68" rx="6" ry="4" fill="var(--mark)" opacity=".5" />
    </>
  ),
  expectant: (
    <>
      <circle cx="45" cy="51" r="9.5" fill="#ffffff" />
      <circle cx="78" cy="51" r="9.5" fill="#ffffff" />
      <circle cx="46" cy="47" r="4" fill="#1a1340" />
      <circle cx="79" cy="47" r="4" fill="#1a1340" />
      <ellipse
        cx="61"
        cy="75"
        rx="5.5"
        ry="6.5"
        fill="none"
        stroke="var(--mark)"
        strokeWidth="4"
      />
    </>
  ),
  loading: (
    <>
      <circle cx="46" cy="52" r="8" fill="#ffffff" />
      <circle cx="76" cy="52" r="8" fill="#ffffff" />
      <circle cx="47" cy="53" r="3.5" fill="#1a1340" />
      <circle cx="77" cy="53" r="3.5" fill="#1a1340" />
      <path
        d="M50 72 Q61 80 72 72"
        stroke="var(--mark)"
        strokeWidth="4.5"
        fill="none"
        strokeLinecap="round"
      />
    </>
  ),
};

export function Mascot({
  mood = "happy",
  animation,
  className,
  size = 96,
}: {
  mood?: Mood;
  /** "bob" for marketing hero, "hop" for loading, undefined for static. */
  animation?: "bob" | "hop";
  className?: string;
  size?: number;
}) {
  return (
    <svg
      viewBox="0 0 120 112"
      width={size}
      height={(size * 112) / 120}
      aria-hidden
      role="img"
      className={cn(
        "block",
        animation === "bob" && "pp-mascot-bob",
        animation === "hop" && "pp-mascot-hop",
        className,
      )}
      style={{ filter: "drop-shadow(0 12px 18px rgb(33 27 78 / 0.12))" }}
    >
      <path
        d="M60 5 C89 3 113 24 114 53 C115 80 96 107 57 108 C23 109 6 85 7 54 C8 25 31 7 60 5 Z"
        fill="var(--primary)"
      />
      <path
        d="M62 7 q5 -11 14 -8 q-1 9 -14 9 Z"
        fill="var(--mark)"
      />
      {PATHS[mood]}
    </svg>
  );
}
