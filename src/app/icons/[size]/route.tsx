import { ImageResponse } from "next/og";
import { LogoMark } from "@/components/logo";

const VARIANTS = {
  "192": { px: 192, tile: "rounded", scale: 1 },
  "512": { px: 512, tile: "rounded", scale: 1 },
  maskable: { px: 512, tile: "bleed", scale: 0.72 },
  apple: { px: 180, tile: "bleed", scale: 0.86 },
} as const;

export function generateStaticParams() {
  return Object.keys(VARIANTS).map((size) => ({ size }));
}

export async function GET(_request: Request, context: RouteContext<"/icons/[size]">) {
  const { size } = await context.params;
  const variant = VARIANTS[size as keyof typeof VARIANTS] ?? VARIANTS["512"];
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex" }}>
        <LogoMark size={variant.px} tile={variant.tile} scale={variant.scale} />
      </div>
    ),
    { width: variant.px, height: variant.px },
  );
}
