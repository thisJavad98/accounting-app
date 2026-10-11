const bar = "animate-pulse rounded-full bg-sunken motion-reduce:animate-none";

export function AppSkeleton() {
  return (
    <div aria-hidden className="flex flex-1 flex-col gap-8 px-5 pt-6">
      <div className="flex items-center justify-between">
        <div className={`${bar} h-5 w-24`} />
        <div className={`${bar} h-5 w-20`} />
      </div>
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-2xl bg-sunken motion-reduce:animate-none" />
        ))}
      </div>
      <div className="flex flex-col gap-3">
        <div className={`${bar} h-4 w-28`} />
        <div className={`${bar} h-10 w-48`} />
      </div>
      <div className="flex flex-col gap-5">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="size-11 animate-pulse rounded-2xl bg-sunken motion-reduce:animate-none" />
            <div className="flex flex-1 flex-col gap-2">
              <div className={`${bar} h-4 w-2/5`} />
              <div className={`${bar} h-3 w-1/4`} />
            </div>
            <div className={`${bar} h-4 w-16`} />
          </div>
        ))}
      </div>
    </div>
  );
}
