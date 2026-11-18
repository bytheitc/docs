// RFC 8058 one-click unsubscribe. Every campaign message carries
//
//   List-Unsubscribe: <https://…/unsubscribe/TOKEN/one-click>
//   List-Unsubscribe-Post: List-Unsubscribe=One-Click
//
// and the mail client (Gmail's, Yahoo's "Unsubscribe" button) POSTs here directly, with no page
// and no confirmation step: the POST *is* the confirmation. A plain GET must never unsubscribe —
// link scanners and previewers fetch every URL in a message — so GET only sends people to the
// ordinary page, where they press a button.
import { NextResponse, type NextRequest } from "next/server";
import { confirmUnsubscribe } from "@/lib/email";

export async function POST(_req: NextRequest, ctx: RouteContext<"/unsubscribe/[token]/one-click">) {
  const { token } = await ctx.params;
  const result = await confirmUnsubscribe(token);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.message }, { status: result.status === 404 ? 404 : 502 });
  }
  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest, ctx: RouteContext<"/unsubscribe/[token]/one-click">) {
  const { token } = await ctx.params;
  return NextResponse.redirect(new URL(`/unsubscribe/${encodeURIComponent(token)}`, req.url), 303);
}
