import { Wallet } from "@phosphor-icons/react/ssr";
import { ImageResponse } from "next/og";

export function generateStaticParams() {
  return [{ size: "192" }, { size: "512" }];
}

export async function GET(_request: Request, context: RouteContext<"/icons/[size]">) {
  const { size } = await context.params;
  const px = size === "512" ? 512 : 192;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#c8440f",
        }}
      >
        <Wallet size={px * 0.56} color="#fff7f2" weight="duotone" />
      </div>
    ),
    { width: px, height: px },
  );
}
