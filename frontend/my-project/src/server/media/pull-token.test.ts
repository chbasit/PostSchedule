import { describe, expect, it } from "vitest";
import type { KeyRing } from "../crypto";
import { authorizeUrl, explain, SCOPES } from "../providers/tiktok";
import { PULL_PATH, readPull, signPull } from "./pull-token";

const ring: KeyRing = { active: "k1", keys: { k1: Buffer.alloc(32, 7), k2: Buffer.alloc(32, 9) } };
const NOW = Date.UTC(2026, 10, 13, 12);
const tokenOf = (url: string) => url.slice(url.indexOf(PULL_PATH) + PULL_PATH.length + 1).replace(/\.[a-z0-9]{1,8}$/, "");

describe("signed video links (TikTok PULL_FROM_URL)", () => {
  const url = signPull("ws-1/asset-1/clip.mp4", ring, "https://agentiqsocial.com", NOW);

  it("points at our own domain and names the file it was made for", () => {
    expect(url.startsWith(`https://agentiqsocial.com${PULL_PATH}/`)).toBe(true);
    expect(url.endsWith(".mp4")).toBe(true);
    expect(readPull(tokenOf(url), ring, NOW + 60_000)).toBe("ws-1/asset-1/clip.mp4");
  });

  it("stops working after an hour", () => {
    expect(readPull(tokenOf(url), ring, NOW + 3601_000)).toBeNull();
  });

  it("refuses a changed file name or signature", () => {
    const [payload, sig] = tokenOf(url).split(".");
    const other = Buffer.from(JSON.stringify({ k: "ws-2/secret.mp4", e: Math.floor(NOW / 1000) + 3600 })).toString("base64url");
    expect(readPull(`${other}.${sig}`, ring, NOW)).toBeNull();
    expect(readPull(`${payload}.${sig.slice(0, -2)}xx`, ring, NOW)).toBeNull();
    expect(readPull(payload, ring, NOW)).toBeNull();
  });

  it("refuses a link signed with another key", () => {
    expect(readPull(tokenOf(url), { ...ring, active: "k2" }, NOW)).toBeNull();
  });
});

describe("TikTok sign-in address", () => {
  const url = new URL(authorizeUrl({ clientKey: "abc123", redirectUri: "https://agentiqsocial.com/api/v1/oauth/tiktok/callback", state: "s".repeat(32) }));

  it("uses Login Kit for Web v2 with comma-separated scopes and our state", () => {
    expect(url.origin + url.pathname).toBe("https://www.tiktok.com/v2/auth/authorize/");
    expect(url.searchParams.get("client_key")).toBe("abc123");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("scope")).toBe(SCOPES.join(","));
    expect(url.searchParams.get("state")).toBe("s".repeat(32));
  });

  it("asks only for what posting needs", () => {
    expect([...SCOPES]).toEqual(["user.info.basic", "video.publish"]);
  });

  it("explains TikTok's refusals in plain words", () => {
    expect(explain("unaudited_client_can_only_post_to_private_accounts")).toMatch(/private/);
    expect(explain("something_new")).toBe("TikTok could not publish this post.");
  });
});
