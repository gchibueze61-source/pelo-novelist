export default function PeloMark({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const textSize = size === "lg" ? "text-4xl" : size === "sm" ? "text-lg" : "text-2xl";
  const iconSize = size === "lg" ? 40 : size === "sm" ? 22 : 28;

  return (
    <div className="flex items-center gap-2">
      <div
        className="flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-gold to-amber-700 text-plum-dark shadow-[0_2px_0_#7a5f30,0_4px_8px_rgba(0,0,0,0.25)]"
        style={{ width: iconSize + 12, height: iconSize + 12 }}
      >
        <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M20 4c-6 0-14 4-14 12 0 2 1 4 4 4 8 0 12-8 12-14 0-1 0-2-2-2Z" />
          <path d="M4 20 14 10" strokeLinecap="round" />
        </svg>
      </div>
      <div className={`pelo-3d font-display ${textSize} text-ink dark:text-ink-dark`}>
        <span>Pelo</span>
      </div>
    </div>
  );
}
