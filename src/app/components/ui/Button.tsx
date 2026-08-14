import { ButtonHTMLAttributes, forwardRef } from "react";
import { Loader2 } from "lucide-react";
import { VariantProps, cva } from "class-variance-authority";
import { cn } from "./utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 select-none",
  {
    variants: {
      variant: {
        primary: "bg-gradient-to-r from-[#181e25] to-[#2c3e50] hover:from-[#222a35] hover:to-[#384c60] text-white shadow-xs hover:shadow-sm",
        blue: "bg-gradient-to-r from-[#1456f0] to-[#3b82f6] hover:from-[#1147cc] hover:to-[#2563eb] text-white shadow-xs hover:shadow-sm",
        secondary: "bg-white/80 hover:bg-white text-[#222222] border border-slate-200 shadow-2xs",
        outline: "border border-slate-200/90 bg-white/60 hover:bg-white text-[#45515e] hover:text-[#222222] shadow-2xs",
        ghost: "text-[#45515e] hover:text-[#222222] hover:bg-slate-100/70",
        destructive: "bg-gradient-to-r from-red-600 to-rose-600 text-white hover:from-red-700 hover:to-rose-700 shadow-xs",
      },
      size: {
        sm: "px-3.5 py-1.5 text-xs h-8",
        md: "px-4.5 py-2 text-xs h-9",
        lg: "px-6 py-2.5 text-sm h-11",
        icon: "h-9 w-9 p-0 rounded-full",
        default: "px-4.5 py-2 text-xs h-9",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant, size, loading, children, className, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
