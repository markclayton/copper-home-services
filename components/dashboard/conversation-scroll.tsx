"use client";

import { useEffect, useRef } from "react";

/**
 * Scroll container for the chat message list. Auto-scrolls to bottom on
 * mount and whenever `triggerKey` changes — pass the message count so a new
 * owner reply (which revalidates the page) jumps the view to the latest.
 */
export function ConversationScroll({
  children,
  triggerKey,
}: {
  children: React.ReactNode;
  triggerKey: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Defer to next frame so layout has settled before we measure.
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [triggerKey]);

  return (
    <div
      ref={ref}
      className="flex-1 overflow-y-auto overscroll-contain"
    >
      {children}
    </div>
  );
}
