"use client";

import { AnimatePresence } from "motion/react";
import { AddChooser } from "./add-chooser";
import { CalendarSheet } from "./calendar-sheet";
import { ConfirmSmsSheet } from "./confirm-sms-sheet";
import { SmsPasteSheet } from "./sms-paste-sheet";
import { SmsSheet } from "./sms-sheet";
import { useStore } from "./store";
import { TransactionSheet } from "./transaction-sheet";

export function Sheets() {
  const { sheet } = useStore();
  return (
    <AnimatePresence>
      {sheet?.type === "add" && <AddChooser key="add" />}
      {sheet?.type === "sms" && <SmsSheet key="sms" text={sheet.text} />}
      {sheet?.type === "paste" && <SmsPasteSheet key="paste" />}
      {sheet?.type === "calendar" && <CalendarSheet key="calendar" />}
      {sheet?.type === "confirm" && (
        <ConfirmSmsSheet key={`confirm-${sheet.tx.id}`} tx={sheet.tx} sms={sheet.sms} old={sheet.old} />
      )}
      {sheet?.type === "tx" && (
        <TransactionSheet
          key={`tx-${sheet.id ?? "new"}-${sheet.kind ?? ""}`}
          id={sheet.id}
          sms={sheet.sms}
          defaultKind={sheet.kind}
          defaultCategory={sheet.category}
        />
      )}
    </AnimatePresence>
  );
}
