export default function LiveBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 bg-red-500/20
                     text-red-400 text-xs font-bold px-2 py-1 rounded-full">
      <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
      LIVE
    </span>
  )
}