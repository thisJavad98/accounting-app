"use client";

import { CaretLeft, CaretRight, ChatText, NotePencil, type Icon } from "@phosphor-icons/react";
import { Sheet } from "./sheet";
import { useStore } from "./store";

export function AddChooser() {
  const { t, settings, openSheet, closeSheet } = useStore();
  const Chevron = settings.locale === "fa" ? CaretLeft : CaretRight;

  const options: { icon: Icon; title: string; hint: string; onClick: () => void }[] = [
    {
      icon: ChatText,
      title: t.add.fromSms,
      hint: t.add.fromSmsHint,
      onClick: () => openSheet({ type: "sms" }),
    },
    {
      icon: NotePencil,
      title: t.add.manual,
      hint: t.add.manualHint,
      onClick: () => openSheet({ type: "tx", id: null }),
    },
  ];

  return (
    <Sheet title={t.add.title} onClose={closeSheet}>
      <div className="flex flex-col gap-3">
        {options.map(({ icon: Glyph, title, hint, onClick }, i) => (
          <button
            key={title}
            type="button"
            onClick={onClick}
            className={`flex items-center gap-4 rounded-2xl p-4 text-start transition-transform active:scale-[0.98] ${
              i === 0 ? "bg-brand-soft" : "bg-sunken"
            }`}
          >
            <span
              className={`inline-flex size-12 shrink-0 items-center justify-center rounded-2xl ${
                i === 0 ? "bg-brand text-on-brand" : "bg-surface text-ink"
              }`}
            >
              <Glyph size={24} weight="duotone" aria-hidden />
            </span>
            <span className="flex flex-1 flex-col gap-0.5">
              <span className={`font-semibold ${i === 0 ? "text-brand-ink" : ""}`}>{title}</span>
              <span className="text-sm text-muted">{hint}</span>
            </span>
            <Chevron size={18} className="text-faint" aria-hidden />
          </button>
        ))}
      </div>
    </Sheet>
  );
}
