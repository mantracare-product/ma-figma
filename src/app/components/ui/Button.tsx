import { ButtonHTMLAttributes, forwardRef } from "react";
import { Loader2 } from "lucide-react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", loading, children, className = "", disabled, ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-border disabled:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2";

    const variants = {
      primary: "bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-active shadow-[0px_2px_6px_rgba(79,142,247,0.25)] hover:shadow-[0px_4px_12px_rgba(79,142,247,0.3)]",
      secondary: "bg-card text-text-primary border border-input hover:bg-muted hover:border-muted-foreground/30 shadow-sm",
      outline: "border border-input bg-card text-foreground hover:bg-muted hover:border-muted-foreground/30",
      ghost: "text-primary hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
      destructive: "bg-destructive text-destructive-foreground hover:bg-destructive-hover shadow-sm",
    };

    const sizes = {
      sm: "px-3 py-1.5 text-sm h-8",
      md: "px-4 py-2 text-sm h-10",
      lg: "px-6 py-3 text-base h-12",
    };

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
