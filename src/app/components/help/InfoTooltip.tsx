import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Info } from "lucide-react";

interface InfoTooltipProps {
  text: string;           // plain-language explanation of the setting
  placement?: "top" | "bottom" | "left" | "right"; // default "top"
  size?: "sm" | "md";     // icon size, default "sm"
}

export function InfoTooltip({ text, placement = "top", size = "sm" }: InfoTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [actualPlacement, setActualPlacement] = useState(placement);

  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const updatePosition = () => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const gap = 8;
    const arrowSize = 6;

    let top = 0;
    let left = 0;
    let finalPlacement = placement;

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

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const padding = 10;

    const fitsInViewport = (pos: { top: number; left: number }) => {
      return (
        pos.top >= padding &&
        pos.top + tooltipRect.height <= viewportHeight - padding &&
        pos.left >= padding &&
        pos.left + tooltipRect.width <= viewportWidth - padding
      );
    };

    const tryPlacements: Array<"top" | "bottom" | "left" | "right"> = [placement];
    if (placement === "top") tryPlacements.push("bottom", "right", "left");
    else if (placement === "bottom") tryPlacements.push("top", "right", "left");
    else if (placement === "left") tryPlacements.push("right", "top", "bottom");
    else if (placement === "right") tryPlacements.push("left", "top", "bottom");

    for (const p of tryPlacements) {
      const pos = positions[p];
      if (fitsInViewport(pos)) {
        top = pos.top;
        left = pos.left;
        finalPlacement = p;
        break;
      }
    }

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
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (!isPinned) {
      setIsVisible(true);
    }
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (!isPinned) {
      timeoutRef.current = setTimeout(() => {
        setIsVisible(false);
      }, 150);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPinned) {
      setIsPinned(false);
      setIsVisible(false);
    } else {
      setIsPinned(true);
      setIsVisible(true);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node) &&
        tooltipRef.current &&
        !tooltipRef.current.contains(event.target as Node)
      ) {
        setIsPinned(false);
        setIsVisible(false);
      }
    };

    if (isPinned) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isPinned]);

  useEffect(() => {
    if (isVisible) {
      updatePosition();
      const handleUpdate = () => updatePosition();
      window.addEventListener("scroll", handleUpdate, true);
      window.addEventListener("resize", handleUpdate);

      return () => {
        window.removeEventListener("scroll", handleUpdate, true);
        window.removeEventListener("resize", handleUpdate);
      };
    }
  }, [isVisible]);

  const arrowStyles = {
    top: "bottom-[-6px] left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-[#1F2A44]",
    bottom: "top-[-6px] left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-[#1F2A44]",
    left: "right-[-6px] top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-[#1F2A44]",
    right: "left-[-6px] top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-[#1F2A44]",
  };

  const sizeClass = size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4";

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        className="inline-flex items-center justify-center cursor-pointer text-gray-400 hover:text-gray-600 p-0.5 ml-1 transition-colors select-none"
      >
        <Info className={sizeClass} />
      </div>
      {isVisible &&
        createPortal(
          <div
            ref={tooltipRef}
            className="fixed z-[9999] px-3 py-2 bg-[#1F2A44] text-white rounded-lg shadow-2xl text-xs font-medium transition-opacity duration-200 ease-in-out max-w-[240px] leading-relaxed"
            style={{
              top: `${position.top}px`,
              left: `${position.left}px`,
              opacity: position.top === 0 && position.left === 0 ? 0 : 1,
              whiteSpace: "normal",
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
