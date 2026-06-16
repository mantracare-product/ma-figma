import { InputHTMLAttributes, forwardRef } from "react";
import { Info } from "lucide-react";
import { Tooltip } from "./Tooltip";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  tooltip?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, tooltip, className = "", ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium mb-2 text-foreground">
            <span className="flex items-center gap-1.5">
              {label}
              {tooltip && (
                <Tooltip text={tooltip} placement="top">
                  <Info className="w-4 h-4 text-muted-foreground hover:text-foreground transition-colors cursor-help" />
                </Tooltip>
              )}
            </span>
          </label>
        )}
        <input
          ref={ref}
          className={`w-full px-4 py-2 bg-input-background border border-input rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all ${error ? "border-destructive" : ""} ${className}`}
          {...props}
        />
        {error && <p className="mt-1 text-sm text-destructive">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
