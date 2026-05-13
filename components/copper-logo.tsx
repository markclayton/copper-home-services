import Image from "next/image";

/**
 * Site logo. Source is a 1024x1024 PNG with transparent background and the
 * "Copper" wordmark in black. Use `tone="light"` on dark backgrounds — that
 * applies a CSS invert filter to flip black → white without needing a
 * separate file. Caller controls display size via `className` (e.g.
 * "h-8 w-auto" — width auto preserves the file's aspect ratio).
 */
export function CopperLogo({
  className = "",
  priority = false,
  tone = "dark",
  alt = "Copper",
}: {
  className?: string;
  priority?: boolean;
  tone?: "dark" | "light";
  alt?: string;
}) {
  return (
    <Image
      src="/copper-logo.png"
      alt={alt}
      width={1024}
      height={1024}
      priority={priority}
      className={`${className} ${tone === "light" ? "invert" : ""}`}
    />
  );
}
