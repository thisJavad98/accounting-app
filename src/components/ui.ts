export const inputClass =
  "w-full rounded-xl border border-line bg-bg px-4 py-3 text-base text-ink placeholder:text-faint outline-none transition-[border-color,box-shadow] focus:border-brand focus:ring-4 focus:ring-brand/15 aria-[invalid=true]:border-danger";

const buttonBase =
  "inline-flex h-13 w-full items-center justify-center gap-2 whitespace-nowrap rounded-full px-6 text-base font-semibold transition-[transform,opacity] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45";

export const primaryButton = `${buttonBase} bg-brand text-on-brand`;
export const secondaryButton = `${buttonBase} bg-sunken text-ink`;
export const ghostButton = `${buttonBase} text-muted`;
export const dangerButton = `${buttonBase} bg-danger/10 text-danger`;

export const chipClass = (active: boolean) =>
  `inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 text-sm font-medium transition-colors ${
    active ? "bg-brand text-on-brand" : "bg-sunken text-ink"
  }`;
