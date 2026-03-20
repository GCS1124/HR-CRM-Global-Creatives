import clsx from "clsx";
import gcsLogo from "../assets/brand/gcs-logo.png";

interface BrandLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "gradient" | "plain";
  containerClassName?: string;
  className?: string;
}

const sizeMap = {
  sm: "h-5 sm:h-6",
  md: "h-6 sm:h-7",
  lg: "h-7 sm:h-8",
  xl: "h-9 sm:h-10",
} satisfies Record<NonNullable<BrandLogoProps["size"]>, string>;

export function BrandLogo({
  size = "md",
  variant = "gradient",
  containerClassName,
  className,
}: BrandLogoProps) {
  const image = (
    <img
      src={gcsLogo}
      alt="Global Creative Services LLC"
      className={clsx("block w-auto max-w-full object-contain", sizeMap[size], className)}
    />
  );

  if (variant === "plain") {
    return image;
  }

  return (
    <div
      className={clsx(
        "inline-flex items-center justify-center rounded-[22px] border border-white/18 bg-brand-gradient px-4 py-3 shadow-[0_18px_40px_rgba(0,149,255,0.22)]",
        containerClassName,
      )}
    >
      {image}
    </div>
  );
}
