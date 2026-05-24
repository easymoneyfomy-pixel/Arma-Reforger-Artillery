import { ReactNode } from "react";

type Side = "top" | "bottom" | "left" | "right";

type Props = {
  content: ReactNode;
  side?: Side;
  children?: ReactNode;
  className?: string;
  width?: number;
};

const sideClasses: Record<Side, string> = {
  top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
  bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
  left: "right-full top-1/2 -translate-y-1/2 mr-2",
  right: "left-full top-1/2 -translate-y-1/2 ml-2",
};

export function Tooltip({ content, side = "top", children, className = "", width = 240 }: Props) {
  return (
    <span className={`group/tt relative inline-flex items-center ${className}`}>
      {children}
      <span
        role="tooltip"
        className={`pointer-events-none absolute z-50 opacity-0 group-hover/tt:opacity-100 group-focus-within/tt:opacity-100 transition-opacity duration-100 ${sideClasses[side]} bg-black/95 border border-accentDim/60 text-zinc-200 font-mono text-[11px] leading-snug px-2 py-1.5 rounded-sm shadow-lg`}
        style={{ width: `${width}px`, whiteSpace: "normal" }}
      >
        {content}
      </span>
    </span>
  );
}

export function InfoHint({
  text,
  side = "top",
  width = 240,
}: {
  text: ReactNode;
  side?: Side;
  width?: number;
}) {
  return (
    <Tooltip content={text} side={side} width={width}>
      <span
        tabIndex={0}
        className="inline-flex items-center justify-center w-3.5 h-3.5 ml-1 rounded-full border border-zinc-600 text-[9px] font-mono text-zinc-400 hover:border-accent hover:text-accent cursor-help leading-none"
        aria-label="More info"
      >
        ?
      </span>
    </Tooltip>
  );
}
