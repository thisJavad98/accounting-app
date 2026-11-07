"use client";

import Link from "next/link";
import { useSyncExternalStore, type ComponentProps, type MouseEvent } from "react";
import { getOnline, subscribeOnline } from "@/lib/offline";

type AppLinkProps = ComponentProps<typeof Link>;

/**
 * Soft-navigates online; when offline, uses a full document load so the service
 * worker can serve cached HTML instead of a failed RSC request.
 */
export function AppLink({ href, onClick, ...props }: AppLinkProps) {
  const online = useSyncExternalStore(subscribeOnline, getOnline, () => true);

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (event.defaultPrevented || online || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    if (typeof href !== "string") return;
    event.preventDefault();
    window.location.assign(href);
  }

  return <Link href={href} onClick={handleClick} {...props} />;
}
