import React from "react";
import { motion, HTMLMotionProps } from "motion/react";

interface MotionCardProps extends HTMLMotionProps<"div"> {
  variant?: "glass" | "subtle" | "solid" | "elevated";
  children: React.ReactNode;
  className?: string;
  hoverEffect?: boolean;
}

export const MotionCard: React.FC<MotionCardProps> = ({
  variant = "glass",
  children,
  className = "",
  hoverEffect = true,
  ...props
}) => {
  const variantStyles = {
    glass: "glass-card text-[#222222]",
    subtle: "glass-subtle text-[#222222]",
    solid: "bg-white border border-slate-200/80 shadow-xs text-[#222222]",
    elevated: "bg-white/90 backdrop-blur-md border border-white/80 shadow-md text-[#222222]",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      whileHover={hoverEffect ? { y: -2, transition: { duration: 0.2 } } : undefined}
      className={`rounded-[24px] p-5 sm:p-6 transition-colors ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export default MotionCard;
