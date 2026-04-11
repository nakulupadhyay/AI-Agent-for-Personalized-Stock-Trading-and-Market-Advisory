// Full-page loading spinner shown during Suspense fallback
export default function PageLoader() {
  return (
    <div className="fixed inset-0 bg-surface-950 flex items-center justify-center z-50">
      <div className="flex flex-col items-center gap-4">
        {/* Spinning ring */}
        <div className="relative w-14 h-14">
          <div className="absolute inset-0 rounded-full border-4 border-dark-100" />
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary-500 animate-spin" />
        </div>
        {/* Logo text */}
        <div className="flex items-center gap-2">
          <span className="text-primary-400 font-bold text-lg tracking-tight">CapitalWave</span>
          <span className="text-slate-500 text-sm font-medium">AI</span>
        </div>
      </div>
    </div>
  );
}
