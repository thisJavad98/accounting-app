"use client";

import {
  Alarm,
  BatteryFull,
  Bell,
  CaretDown,
  CaretLeft,
  CaretRight,
  ChatCircle,
  Check,
  ClipboardText,
  Clock,
  ClockClockwise,
  DotsThree,
  EnvelopeSimple,
  FolderSimple,
  Globe,
  Link,
  MagnifyingGlass,
  Microphone,
  Plus,
  Share,
  Sparkle,
  SquaresFour,
  Stack,
  WifiHigh,
  type Icon,
} from "@phosphor-icons/react";
import Image from "next/image";
import type { Locale } from "@/lib/types";

/* iOS 27 system palette, fixed so the mockups read like real iPhone screenshots in either app theme. */
const BLUE = "#007aff";
const GROUPED = "bg-[#f2f2f7]";
const SECONDARY = "text-[#8e8e93]";
const SEPARATOR = "border-[#c6c6c8]/70";
const GLASS =
  "bg-white/70 shadow-[0_6px_18px_-6px_rgb(0_0_0/0.25),inset_0_0_0_0.5px_rgb(255_255_255/0.9),0_0_0_0.5px_rgb(0_0_0/0.08)] backdrop-blur-xl";
const SHEET = "bg-white/90 shadow-[0_-8px_24px_-12px_rgb(0_0_0/0.2)] backdrop-blur-xl";

/** Marks the control the user should tap: a brand outline plus a pulsing touch point. */
function Spot({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`relative block outline-2 outline-offset-2 outline-brand ${className}`}>
      {children}
      <span aria-hidden className="pointer-events-none absolute -end-1.5 -bottom-1.5 flex size-4">
        <span className="absolute inset-0 rounded-full bg-brand/50 motion-safe:animate-ping" />
        <span className="relative size-4 rounded-full border-2 border-white bg-brand" />
      </span>
    </span>
  );
}

function StatusBar() {
  return (
    <div className="relative flex h-9 shrink-0 items-center justify-between px-6 text-[11px] font-semibold text-black">
      <span>9:41</span>
      <span aria-hidden className="absolute top-2 left-1/2 h-[18px] w-[62px] -translate-x-1/2 rounded-full bg-black" />
      <span className="flex items-center gap-1">
        <WifiHigh size={12} weight="bold" />
        <BatteryFull size={16} weight="fill" />
      </span>
    </div>
  );
}

function Phone({ label, children, className = GROUPED }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div
      role="img"
      aria-label={label}
      className="mx-auto w-[236px] rounded-[2.6rem] bg-zinc-900 p-2 shadow-[0_30px_60px_-30px_rgb(var(--shadow)/0.5),inset_0_0_0_1px_rgb(255_255_255/0.08)]"
    >
      <div
        dir="ltr"
        lang="en"
        className={`relative flex h-[460px] flex-col overflow-hidden rounded-[2.2rem] font-latin text-black select-none ${className}`}
      >
        {children}
      </div>
    </div>
  );
}

/** Liquid Glass circular toolbar button. */
function GlassButton({ children, tint = false }: { children: React.ReactNode; tint?: boolean }) {
  return (
    <span
      className={`flex size-8 items-center justify-center rounded-full ${tint ? "text-white shadow-[0_6px_18px_-6px_rgb(0_122_255/0.6)]" : `${GLASS} text-black`}`}
      style={tint ? { background: BLUE } : undefined}
    >
      {children}
    </span>
  );
}

function Toolbar({ left, title, right }: { left?: React.ReactNode; title?: string; right?: React.ReactNode }) {
  return (
    <div className="grid h-10 shrink-0 grid-cols-[1fr_auto_1fr] items-center px-3 text-[12px]">
      <span className="flex justify-self-start gap-1.5">{left}</span>
      <span className="font-semibold">{title}</span>
      <span className="flex justify-self-end gap-1.5">{right}</span>
    </div>
  );
}

function Toggle({ on }: { on: boolean }) {
  return (
    <span className={`flex h-[18px] w-[32px] shrink-0 rounded-full p-0.5 ${on ? "justify-end bg-[#34c759]" : "bg-[#e9e9ea]"}`}>
      <span className="block h-[14px] w-[18px] rounded-full bg-white shadow" />
    </span>
  );
}

function Group({ children }: { children: React.ReactNode }) {
  return <div className="mx-3 rounded-2xl bg-white [&>:last-child_.border-b]:border-b-0">{children}</div>;
}

function Row({
  icon: Glyph,
  color,
  label,
  value,
  chevron = true,
  children,
}: {
  icon?: Icon;
  color?: string;
  label: string;
  value?: React.ReactNode;
  chevron?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex h-9 items-center gap-2.5 ps-3 text-[12px]">
      {Glyph && (
        <span className="flex size-6 shrink-0 items-center justify-center rounded-md text-white" style={{ background: color }}>
          <Glyph size={14} weight="fill" />
        </span>
      )}
      <span className={`flex h-full min-w-0 flex-1 items-center gap-1.5 border-b pe-3 ${SEPARATOR}`}>
        <span className="flex-1 truncate">{label}</span>
        {value && <span className={`truncate ${SECONDARY}`}>{value}</span>}
        {children}
        {chevron && <CaretRight size={11} weight="bold" className="shrink-0 text-[#c4c4c7]" />}
      </span>
    </div>
  );
}

function Token({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-[#007aff]/12 px-1.5 py-0.5 font-semibold" style={{ color: BLUE }}>
      {children}
    </span>
  );
}

function ActionCard({ icon: Glyph, color, children }: { icon: Icon; color: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-2xl bg-white p-2.5 text-[12px] leading-relaxed">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-md text-white" style={{ background: color }}>
        <Glyph size={14} weight="bold" />
      </span>
      {children}
    </div>
  );
}

/** The iOS 27 message trigger, pinned as the first step of a shortcut. */
function TriggerCard({ keyword, expanded = false, spotKeyword = false, spotConfirm = false }: {
  keyword: string;
  expanded?: boolean;
  spotKeyword?: boolean;
  spotConfirm?: boolean;
}) {
  const word = (
    <Token>
      <span dir="auto">{keyword}</span>
    </Token>
  );
  return (
    <div className="rounded-2xl bg-white p-2.5 text-[12px] leading-relaxed">
      <div className="flex items-center gap-2">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-[#34c759] text-white">
          <ChatCircle size={14} weight="fill" />
        </span>
        <span className="flex-1 text-[11px] leading-tight font-semibold">When I receive a message</span>
        <Toggle on />
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-1 ps-8">
        <span>containing</span>
        {spotKeyword ? <Spot className="rounded-md">{word}</Spot> : word}
        <CaretDown size={12} weight="bold" className={`ms-auto ${expanded ? "rotate-180" : ""} ${SECONDARY}`} />
      </div>
      {expanded && (
        <div className={`mt-2 border-t pt-2 ${SEPARATOR}`}>
          {spotConfirm ? (
            <Spot className="rounded-lg">
              <span className="flex items-center justify-between px-1">
                Confirm Before Run
                <Toggle on={false} />
              </span>
            </Spot>
          ) : (
            <span className="flex items-center justify-between px-1">
              Confirm Before Run
              <Toggle on={false} />
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function EditorToolbar({ done }: { done?: React.ReactNode }) {
  return (
    <Toolbar
      left={
        <GlassButton>
          <CaretLeft size={14} weight="bold" />
        </GlassButton>
      }
      right={
        <>
          <GlassButton>
            <Share size={14} weight="bold" />
          </GlassButton>
          {done ?? (
            <GlassButton tint>
              <Check size={14} weight="bold" />
            </GlassButton>
          )}
        </>
      }
    />
  );
}

export function LibraryScreen({ label }: { label: string }) {
  return (
    <Phone label={label}>
      <StatusBar />
      <Toolbar
        right={
          <>
            <GlassButton>
              <DotsThree size={16} weight="bold" />
            </GlassButton>
            <GlassButton>
              <Plus size={14} weight="bold" />
            </GlassButton>
          </>
        }
      />
      <h3 className="px-4 pb-3 text-[26px] font-bold tracking-tight">Library</h3>
      <Group>
        <Row icon={Stack} color={BLUE} label="All Shortcuts" value="12" />
        <Spot className="rounded-lg">
          <Row icon={ClockClockwise} color="#ff9500" label="Automation" />
        </Spot>
        <Row icon={Share} color="#5856d6" label="Share Sheet" />
      </Group>
      <p className={`px-6 pt-4 pb-1.5 text-[10px] font-semibold uppercase ${SECONDARY}`}>Folders</p>
      <Group>
        <Row icon={FolderSimple} color="#30b0c7" label="Starter Shortcuts" value="4" />
      </Group>
      <div className="mt-auto flex items-center gap-2 px-4 pb-5">
        <div className={`flex flex-1 items-center justify-around rounded-full py-1.5 ${GLASS}`}>
          <span className="flex flex-col items-center gap-0.5 rounded-full bg-black/5 px-4 py-0.5 text-[9px] font-semibold" style={{ color: BLUE }}>
            <Stack size={18} weight="fill" />
            Library
          </span>
          <span className={`flex flex-col items-center gap-0.5 text-[9px] font-medium ${SECONDARY}`}>
            <SquaresFour size={18} weight="fill" />
            Gallery
          </span>
        </div>
        <span className={`flex size-11 items-center justify-center rounded-full ${GLASS}`}>
          <MagnifyingGlass size={16} weight="bold" />
        </span>
      </div>
    </Phone>
  );
}

export function AutomationListScreen({ label }: { label: string }) {
  return (
    <Phone label={label}>
      <StatusBar />
      <Toolbar
        left={
          <GlassButton>
            <CaretLeft size={14} weight="bold" />
          </GlassButton>
        }
        right={
          <Spot className="rounded-full">
            <GlassButton>
              <Plus size={14} weight="bold" />
            </GlassButton>
          </Spot>
        }
      />
      <h3 className="px-4 text-[26px] font-bold tracking-tight">Automation</h3>
      <div className="flex flex-1 flex-col items-center justify-center gap-2.5 px-8 pb-16 text-center">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-[#ff9500] text-white">
          <ClockClockwise size={28} weight="bold" />
        </span>
        <p className="text-[14px] font-bold">No Automations</p>
        <p className={`text-[11px] leading-snug ${SECONDARY}`}>Add a trigger to any shortcut to run it automatically.</p>
      </div>
    </Phone>
  );
}

export function DescribeScreen({ label }: { label: string }) {
  return (
    <Phone label={label} className="bg-white">
      <StatusBar />
      <Toolbar
        left={
          <span className={`flex h-8 items-center rounded-full px-3 text-[12px] font-medium ${GLASS}`}>Cancel</span>
        }
        right={
          <Spot className="rounded-full">
            <span className={`flex h-8 items-center rounded-full px-3 text-[12px] font-semibold ${GLASS}`} style={{ color: BLUE }}>
              Edit
            </span>
          </Spot>
        }
      />
      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-[conic-gradient(from_200deg,#ff9f0a,#ff375f,#bf5af2,#0a84ff,#64d2ff,#ff9f0a)] text-white">
          <Sparkle size={26} weight="fill" />
        </span>
        <p className="text-[16px] font-bold">Describe a Shortcut</p>
        <p className={`text-[11px] leading-snug ${SECONDARY}`}>Tell Shortcuts what you want to do, and it will build it for you.</p>
      </div>
      <div className="px-3 pb-6">
        <div className="rounded-full bg-[conic-gradient(from_200deg,#ff9f0a,#ff375f,#bf5af2,#0a84ff,#64d2ff,#ff9f0a)] p-[1.5px]">
          <div className="flex h-10 items-center gap-2 rounded-full bg-white px-3.5 text-[11px] text-[#8e8e93]">
            <span className="flex-1">What should this shortcut do?</span>
            <Microphone size={14} weight="fill" className="text-black" />
          </div>
        </div>
      </div>
    </Phone>
  );
}

export function AddTriggerScreen({ label }: { label: string }) {
  const categories = ["Automation", "Apps", "Scripting"];
  return (
    <Phone label={label}>
      <StatusBar />
      <EditorToolbar />
      <h3 className="px-4 text-[18px] font-bold">New Shortcut</h3>
      <div className={`mt-auto rounded-t-[1.75rem] px-3 pt-3 pb-5 ${SHEET}`}>
        <div className="flex h-7 items-center gap-1.5 rounded-full bg-[#767680]/12 px-2.5 text-[11px] text-[#8e8e93]">
          <MagnifyingGlass size={12} weight="bold" />
          Search Actions
        </div>
        <div className="mt-2.5 flex gap-1.5 ps-1">
          {categories.map((name, i) =>
            i === 0 ? (
              <Spot key={name} className="shrink-0 rounded-full">
                <span className="block rounded-full px-2.5 py-1 text-[10px] font-semibold text-white" style={{ background: BLUE }}>
                  {name}
                </span>
              </Spot>
            ) : (
              <span key={name} className="shrink-0 rounded-full bg-[#767680]/12 px-2.5 py-1 text-[10px] font-medium">
                {name}
              </span>
            ),
          )}
        </div>
        <div className="mt-2 [&>:last-child_.border-b]:border-b-0">
          <Row icon={Clock} color="#ff9500" label="Time of Day" />
          <Row icon={Alarm} color="#ff9500" label="Alarm" />
          <Row icon={EnvelopeSimple} color={BLUE} label="Email" />
          <Spot className="rounded-lg">
            <Row icon={ChatCircle} color="#34c759" label="Message" />
          </Spot>
          <Row icon={Bell} color="#ff3b30" label="Notification" />
          <Row icon={WifiHigh} color={BLUE} label="Wi-Fi" />
        </div>
      </div>
    </Phone>
  );
}

export function ConfigureTriggerScreen({ label, keyword }: { label: string; keyword: string }) {
  return (
    <Phone label={label}>
      <StatusBar />
      <EditorToolbar />
      <h3 className="px-4 pb-3 text-[18px] font-bold">New Shortcut</h3>
      <div className="px-3">
        <TriggerCard keyword={keyword} expanded spotKeyword spotConfirm />
      </div>
      <p className={`px-6 pt-3 text-[10px] leading-snug ${SECONDARY}`}>
        Runs when a message containing this text arrives.
      </p>
    </Phone>
  );
}

function CopyCard() {
  return (
    <ActionCard icon={ClipboardText} color="#ff9500">
      <span className="font-medium">Copy</span>
      <Token>Shortcut Input</Token>
      <span>to clipboard</span>
    </ActionCard>
  );
}

function EncodeCard() {
  return (
    <ActionCard icon={Link} color="#8e8e93">
      <span className="font-medium">URL Encode</span>
      <Token>Shortcut Input</Token>
    </ActionCard>
  );
}

export function UrlEncodeScreen({ label, keyword }: { label: string; keyword: string }) {
  return (
    <Phone label={label}>
      <StatusBar />
      <EditorToolbar />
      <h3 className="px-4 pb-3 text-[18px] font-bold">New Shortcut</h3>
      <div className="flex flex-col gap-2 px-3">
        <TriggerCard keyword={keyword} />
        <Spot className="rounded-2xl">
          <CopyCard />
        </Spot>
        <Spot className="rounded-2xl">
          <EncodeCard />
        </Spot>
      </div>
      <div className={`mt-auto rounded-t-[1.75rem] px-3 pt-3 pb-5 ${SHEET}`}>
        <div className="flex h-7 items-center gap-1.5 rounded-full bg-[#767680]/12 px-2.5 text-[11px]">
          <MagnifyingGlass size={12} weight="bold" className="text-[#8e8e93]" />
          URL Encode
          <span className="h-3.5 w-px animate-pulse" style={{ background: BLUE }} />
        </div>
        <div className="mt-2 flex items-center gap-2.5 py-1.5 text-[12px]">
          <span className="flex size-6 items-center justify-center rounded-md bg-[#8e8e93] text-white">
            <Link size={14} weight="bold" />
          </span>
          URL Encode
        </div>
      </div>
    </Phone>
  );
}

export function OpenUrlsScreen({ label, url }: { label: string; url: string }) {
  return (
    <Phone label={label}>
      <StatusBar />
      <EditorToolbar
        done={
          <Spot className="rounded-full">
            <GlassButton tint>
              <Check size={14} weight="bold" />
            </GlassButton>
          </Spot>
        }
      />
      <div className="flex flex-col gap-2 px-3 pt-1">
        <CopyCard />
        <EncodeCard />
        <Spot className="rounded-2xl">
          <ActionCard icon={Globe} color={BLUE}>
            <span className="font-medium">Open</span>
            <span className="min-w-0 break-all">
              {url}
              <Token>URL Encoded Text</Token>
            </span>
          </ActionCard>
        </Spot>
      </div>
      <div className="mt-auto bg-[#d1d3d9]/90 pb-4 backdrop-blur-xl">
        <div className="flex items-center gap-1.5 overflow-hidden px-2 py-1.5 text-[10px]">
          <span className={SECONDARY}>Select Variable</span>
          <Spot className="rounded-full">
            <span className="block rounded-full bg-white px-2 py-0.5 font-semibold" style={{ color: BLUE }}>
              URL Encoded Text
            </span>
          </Spot>
        </div>
        <div className="grid grid-cols-10 gap-1 px-1.5" aria-hidden>
          {"qwertyuiopasdfghjkl".split("").map((key) => (
            <span key={key} className="flex h-6 items-center justify-center rounded-md bg-white text-[10px] shadow-[0_1px_0_rgb(0_0_0/0.25)]">
              {key}
            </span>
          ))}
        </div>
      </div>
    </Phone>
  );
}

export function SmsArrivesScreen({ label, locale, sender, sms }: { label: string; locale: Locale; sender: string; sms: string }) {
  return (
    <Phone label={label} className="bg-white">
      <StatusBar />
      <div className="absolute inset-x-0 top-9 bottom-0">
        <Image src={`/landing/${locale}-light-sms.png`} alt="" fill sizes="236px" className="object-cover object-top" />
      </div>
      <div className={`relative mx-2 mt-1 flex gap-2 rounded-[1.4rem] p-2.5 ${GLASS}`}>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#34c759] text-white">
          <ChatCircle size={18} weight="fill" />
        </span>
        <div className="min-w-0 flex-1 text-[11px] leading-snug">
          <div className="flex justify-between gap-2">
            <span dir="auto" className="font-semibold">
              {sender}
            </span>
            <span className={SECONDARY}>now</span>
          </div>
          <p dir="auto" className="text-start whitespace-pre-line">
            {sms}
          </p>
        </div>
      </div>
    </Phone>
  );
}
