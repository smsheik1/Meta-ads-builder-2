export function WigglyMark({ size = "md" }: { size?: "sm" | "md" }) {
  const wrapperSize = size === "sm" ? "size-9" : "size-11";
  const dotSize = size === "sm" ? "size-1.5" : "size-2";

  return (
    <div className={`${wrapperSize} grid place-items-center rounded-full bg-slate-950 shadow-[0_10px_24px_rgba(15,23,42,0.18)]`}>
      <div className="flex items-center gap-0.5">
        <span className={`${dotSize} rounded-full bg-cyan-300`} />
        <span className="h-1 w-3 rounded-full bg-blue-500" />
        <span className={`${dotSize} rounded-full bg-fuchsia-400`} />
        <span className="h-1 w-3 rounded-full bg-emerald-300" />
        <span className={`${dotSize} rounded-full bg-cyan-300`} />
      </div>
    </div>
  );
}
