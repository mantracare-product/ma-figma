import { ReactNode, useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

interface TooltipProps {
  children: ReactNode;
  text: string;
  placement?: "top" | "right" | "bottom" | "left";
}

export function Tooltip({ children, text, placement = "top" }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [actualPlacement, setActualPlacement] = useState(placement);
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const updatePosition = () => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const gap = 8; // Space between trigger and tooltip
    const arrowSize = 6;

    let top = 0;
    let left = 0;
    let finalPlacement = placement;

    // Calculate position based on placement
    const positions = {
      top: {
        top: triggerRect.top - tooltipRect.height - gap - arrowSize,
        left: triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2,
      },
      bottom: {
        top: triggerRect.bottom + gap + arrowSize,
        left: triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2,
      },
      left: {
        top: triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2,
        left: triggerRect.left - tooltipRect.width - gap - arrowSize,
      },
      right: {
        top: triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2,
        left: triggerRect.right + gap + arrowSize,
      },
    };

    // Check if tooltip fits in viewport with current placement
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const padding = 10;

    const fitsInViewport = (pos: { top: number; left: number }, placement: string) => {
      const fitsTop = pos.top >= padding;
      const fitsBottom = pos.top + tooltipRect.height <= viewportHeight - padding;
      const fitsLeft = pos.left >= padding;
      const fitsRight = pos.left + tooltipRect.width <= viewportWidth - padding;

      if (placement === "top" || placement === "bottom") {
        return fitsTop && fitsBottom && fitsLeft && fitsRight;
      } else {
        return fitsLeft && fitsRight && fitsTop && fitsBottom;
      }
    };

    // Try placement in order: preferred, opposite, then sides
    const tryPlacements: Array<"top" | "right" | "bottom" | "left"> = [placement];

    if (placement === "top") tryPlacements.push("bottom", "right", "left");
    else if (placement === "bottom") tryPlacements.push("top", "right", "left");
    else if (placement === "left") tryPlacements.push("right", "top", "bottom");
    else if (placement === "right") tryPlacements.push("left", "top", "bottom");

    for (const p of tryPlacements) {
      const pos = positions[p];
      if (fitsInViewport(pos, p)) {
        top = pos.top;
        left = pos.left;
        finalPlacement = p;
        break;
      }
    }

    // Ensure tooltip stays within viewport bounds
    if (left < padding) left = padding;
    if (left + tooltipRect.width > viewportWidth - padding) {
      left = viewportWidth - tooltipRect.width - padding;
    }
    if (top < padding) top = padding;
    if (top + tooltipRect.height > viewportHeight - padding) {
      top = viewportHeight - tooltipRect.height - padding;
    }

    setPosition({ top, left });
    setActualPlacement(finalPlacement);
  };

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, 200); // Small delay before showing
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  useEffect(() => {
    if (isVisible) {
      updatePosition();

      // Update position on scroll or resize
      const handleUpdate = () => updatePosition();
      window.addEventListener("scroll", handleUpdate, true);
      window.addEventListener("resize", handleUpdate);

      return () => {
        window.removeEventListener("scroll", handleUpdate, true);
        window.removeEventListener("resize", handleUpdate);
      };
    }
  }, [isVisible]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const arrowStyles = {
    top: "bottom-[-6px] left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-[#1F2A44]",
    bottom: "top-[-6px] left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-[#1F2A44]",
    left: "right-[-6px] top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-[#1F2A44]",
    right: "left-[-6px] top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-[#1F2A44]",
  };

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="inline-flex items-center justify-center"
        style={{ margin: "-4px", padding: "4px" }} // Increase hover hit area without affecting layout
      >
        {children}
      </div>
      {isVisible &&
        createPortal(
          <div
            ref={tooltipRef}
            className="fixed z-[9999] px-3 py-2 bg-[#1F2A44] text-white rounded-lg shadow-2xl text-xs font-medium pointer-events-none transition-opacity duration-200 ease-in-out max-w-xs"
            style={{
              top: `${position.top}px`,
              left: `${position.left}px`,
              opacity: position.top === 0 && position.left === 0 ? 0 : 1,
              whiteSpace: text.length > 50 ? "normal" : "nowrap",
            }}
          >
            {text}
            <div
              className={`absolute w-0 h-0 border-[6px] ${arrowStyles[actualPlacement]}`}
            />
          </div>,
          document.body
        )}
    </>
  );
}
