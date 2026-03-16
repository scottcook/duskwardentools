export default function AppLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div>
        <div className="h-7 w-36 bg-bg-elevated rounded" />
        <div className="mt-2 h-4 w-64 bg-bg-elevated/60 rounded" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="bg-bg-surface border border-border rounded-lg p-6 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="h-5 w-28 bg-bg-elevated rounded" />
              <div className="h-5 w-16 bg-bg-elevated/60 rounded-full" />
            </div>
            <div className="h-4 w-full bg-bg-elevated/40 rounded" />
            <div className="h-4 w-3/4 bg-bg-elevated/30 rounded" />
            <div className="pt-2">
              <div className="h-3 w-24 bg-bg-elevated/40 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
