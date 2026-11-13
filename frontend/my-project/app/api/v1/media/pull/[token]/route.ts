import { streamMedia } from "@/server/media/storage";
import { readPullToken } from "@/server/tiktok";

// Where TikTok downloads a video it was asked to post (PULL_FROM_URL). The address carries
// a signed, one-hour token naming the stored file (src/server/tiktok.ts), so no sign-in is
// needed and nothing else can be fetched. Streamed through, never redirected: TikTok does
// not follow redirects.
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const key = readPullToken(token.replace(/\.[a-z0-9]{1,8}$/, ""));
  if (!key) return new Response("Not found", { status: 404 });
  const upstream = await streamMedia(key);
  if (!upstream) return new Response("Not found", { status: 404 });
  const headers = new Headers({ "Content-Type": upstream.headers.get("content-type") ?? "video/mp4", "Cache-Control": "private, no-store" });
  const length = upstream.headers.get("content-length");
  if (length) headers.set("Content-Length", length);
  return new Response(upstream.body, { status: 200, headers });
}
