import { Skeleton, SkeletonCard } from "@/components/dashboard/skeleton";

export default function BroadcastDetailLoading() {
  return (
    <div className="space-y-5 sm:space-y-6 pb-12 animate-fade-in">
      {/* Header Skeleton */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start sm:items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-md shrink-0" />
          <div className="space-y-1.5">
            <Skeleton className="h-7 w-48 sm:w-64" />
            <Skeleton className="h-4 w-32 sm:w-44" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-24 rounded-lg" />
          <Skeleton className="h-9 w-24 rounded-lg" />
        </div>
      </div>

      {/* KPI Stats Cards Skeleton */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7 sm:gap-4">
        {Array.from({ length: 7 }).map((_, i) => (
          <SkeletonCard key={i} className="p-3 sm:p-4" />
        ))}
      </div>

      {/* Funnel & Diagnostics Grid Skeleton */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4 lg:col-span-2 shadow-sm space-y-3">
          <Skeleton className="h-5 w-40" />
          <div className="space-y-3 pt-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-full rounded-md" />
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
          <Skeleton className="h-5 w-36" />
          <div className="space-y-3 pt-1">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </div>

      {/* Recipients List Skeleton */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between gap-3">
          <Skeleton className="h-5 w-40" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-44" />
            <Skeleton className="h-8 w-28" />
          </div>
        </div>
        <div className="space-y-2.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex justify-between items-center p-3 rounded-lg border border-border/50">
              <div className="flex items-center gap-3">
                <Skeleton className="h-7 w-7 rounded-full" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-28" />
                </div>
              </div>
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
