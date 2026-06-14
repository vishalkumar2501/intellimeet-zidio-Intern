export const ProfilePageSkeleton = () => {
  return (
    <div className="min-h-screen bg-background animate-pulse">
      <div className="h-16 border-b border-border bg-background" />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
        <div className="h-7 w-32 bg-muted rounded-xl" />

        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-muted shrink-0" />
            <div className="flex flex-col gap-3 items-center sm:items-start w-full">
              <div className="h-6 w-40 bg-muted rounded-xl" />
              <div className="h-4 w-52 bg-muted rounded-xl" />
              <div className="h-9 w-36 bg-muted rounded-xl mt-2" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-4">
          {/* Section title */}
          <div className="h-5 w-36 bg-muted rounded-xl" />
          <div className="space-y-2">
            {/* Label */}
            <div className="h-3 w-24 bg-muted rounded" />
            {/* Input */}
            <div className="h-11 w-full bg-muted rounded-xl" />
          </div>
          {/* Save button */}
          <div className="flex justify-end">
            <div className="h-10 w-28 bg-muted rounded-xl" />
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-border bg-card p-4 space-y-3"
            >
              <div className="w-8 h-8 rounded-lg bg-muted" />
              <div className="h-6 w-12 bg-muted rounded" />
              <div className="h-3 w-20 bg-muted rounded" />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};
