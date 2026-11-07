const THISJ_URL = "https://www.linkedin.com/in/mohammad-javad-moghofei-907671214/";

export function PoweredByCredit({ className = "" }: { className?: string }) {
  return (
    <p lang="en" className={`text-center text-[11px] text-faint ${className}`}>
      Powered by{" "}
      <a
        href={THISJ_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="font-semibold text-brand underline-offset-2 hover:text-brand-ink hover:underline"
      >
        ThisJ
      </a>
    </p>
  );
}

/** Fixed credit strip for the landing page. App routes render it inside BottomNav instead. */
export function PoweredByFooter() {
  return (
    <footer className="pointer-events-none fixed inset-x-0 bottom-0 z-20 flex justify-center bg-bg/90 px-3 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] backdrop-blur-sm">
      <div className="pointer-events-auto">
        <PoweredByCredit />
      </div>
    </footer>
  );
}
