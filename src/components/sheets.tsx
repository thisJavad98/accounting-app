"use client";

import { AnimatePresence } from "motion/react";
import { AddChooser } from "./add-chooser";
import { SmsSheet } from "./sms-sheet";
import { useStore } from "./store";
import { TransactionSheet } from "./transaction-sheet";

export function Sheets() {
  const { sheet } = useStore();
  return (
    <AnimatePresence>
      {sheet?.type === "add" && <AddChooser key="add" />}
      {sheet?.type === "sms" && <SmsSheet key="sms" />}
      {sheet?.type === "tx" && (
        <TransactionSheet key={`tx-${sheet.id ?? "new"}`} id={sheet.id} sms={sheet.sms} />
      )}
    </AnimatePresence>
  );
}
