const GRADIENTS = [
  ["#7c3aed", "#db2777"],
  ["#0ea5e9", "#6366f1"],
  ["#f59e0b", "#ef4444"],
  ["#10b981", "#0ea5e9"],
  ["#8b5cf6", "#f43f5e"],
  ["#06b6d4", "#8b5cf6"],
] as const;

function hash(value: string): number {
  let result = 0;
  for (let index = 0; index < value.length; index += 1) {
    result = (result * 31 + value.charCodeAt(index)) | 0;
  }
  return Math.abs(result);
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "V";
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function Avatar({
  name,
  src,
  size = "md",
  online = false,
}: {
  name: string;
  src?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  online?: boolean;
}) {
  const dimensions =
    size === "xs"
      ? "h-5 w-5 text-[8px]"
      : size === "sm"
        ? "h-9 w-9 text-[11px]"
      : size === "lg"
        ? "h-12 w-12 text-sm"
        : size === "xl"
          ? "h-[60px] w-[60px] text-base"
          : "h-10 w-10 text-xs";
  const [from, to] = GRADIENTS[hash(name) % GRADIENTS.length];

  return (
    <span className={`relative inline-flex shrink-0 ${dimensions}`}>
      {src ? (
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          className="h-full w-full rounded-full object-cover ring-1 ring-line"
        />
      ) : (
        <span
          aria-hidden
          className="flex h-full w-full items-center justify-center rounded-full font-bold text-white ring-1 ring-white/10"
          style={{ backgroundImage: `linear-gradient(135deg, ${from}, ${to})` }}
        >
          {initials(name)}
        </span>
      )}
      {online ? (
        <span
          aria-hidden
          className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-page bg-green-500"
        />
      ) : null}
    </span>
  );
}
