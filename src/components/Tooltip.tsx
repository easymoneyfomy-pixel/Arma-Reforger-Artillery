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
  top: "bottom-full left-1/2 -translate-x-1/2 mb-3",
  bottom: "top-full left-1/2 -translate-x-1/2 mt-3",
  left: "right-full top-1/2 -translate-y-1/2 mr-3",
  right: "left-full top-1/2 -translate-y-1/2 ml-3",
};

export function Tooltip({ content, side = "top", children, className = "", width = 260 }: Props) {
  return (
    <span className={`group/tt relative inline-flex items-center ${className}`}>
      {children}
      <span
        role="tooltip"
        className={`pointer-events-none absolute z-[200] opacity-0 group-hover/tt:opacity-100 group-focus-within/tt:opacity-100 transition-all duration-200 ${sideClasses[side]} scale-95 group-hover/tt:scale-100 bg-[#0c0e12] border border-accentDim/60 text-zinc-300 font-mono text-[10px] leading-relaxed px-3 py-2.5 rounded-sm shadow-[0_10px_30px_rgba(0,0,0,0.8)] border-l-2 border-l-accent`}
        style={{ width: `${width}px`, whiteSpace: "normal" }}
      >
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between border-b border-white/5 pb-1 mb-1">
            <span className="text-[9px] text-accent/50 font-bold tracking-[0.2em]">INTELLIGENCE</span>
            <span className="w-1 h-1 rounded-full bg-accent/40 animate-pulse"></span>
          </div>
          <div className="text-zinc-300">
            {content}
          </div>
        </div>
      </span>
    </span>
  );
}

export function InfoHint({
  text,
  side = "top",
  width = 260,
}: {
  text: ReactNode;
  side?: Side;
  width?: number;
}) {
  return (
    <Tooltip content={text} side={side} width={width}>
      <span
        tabIndex={0}
        className="inline-flex items-center justify-center w-3.5 h-3.5 ml-1.5 rounded-full border border-zinc-600/50 text-[9px] font-mono text-zinc-500 hover:border-accent hover:text-accent hover:bg-accent/5 cursor-help transition-all duration-200 leading-none"
        aria-label="More info"
      >
        ?
      </span>
    </Tooltip>
  );
}
