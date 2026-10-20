import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "outline" | "danger" | "ghost";
type Size = "sm" | "md" | "lg" | "icon";

const variants: Record<Variant, string> = {
  primary:
    "bg-action-700 text-white hover:bg-action-800 active:scale-[0.98] active:bg-action-800 shadow-sm",
  secondary:
    "bg-brand-900 text-white hover:bg-brand-800 active:scale-[0.98] active:bg-brand-800 shadow-sm",
  outline:
    "border border-[#DCE4F0] bg-white text-[#263449] hover:bg-[#F4F7FC] hover:border-[#C9D8FF] active:scale-[0.98]",
  danger: "bg-[#DC2626] text-white hover:bg-[#B91C1C] active:scale-[0.98] active:bg-[#B91C1C] shadow-sm",
  ghost: "text-[#263449] hover:bg-[#F4F7FC] hover:text-[#14295F] active:scale-[0.98]",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-sm gap-1.5",
  md: "h-11 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-base gap-2",
  icon: "h-10 w-10",
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  children?: ReactNode;
};

/**
 * Class composer for Button styling. Exported so anchor-based buttons
 * (e.g. report downloads) match <Button> exactly instead of hand-rolling
 * divergent utility strings.
 */
export function buttonStyles(variant: Variant = "primary", size: Size = "md"): string {
  return cn(
    "inline-flex cursor-pointer items-center justify-center rounded-lg font-medium transition-colors duration-200",
    "disabled:cursor-not-allowed disabled:opacity-50",
    variants[variant],
    sizes[size],
  );
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonStyles(variant, size), className)}
      {...props}
    />
  );
}
