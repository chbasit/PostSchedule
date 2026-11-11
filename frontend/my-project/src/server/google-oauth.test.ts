import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { authorizeUrl, decodeAttempt, encodeAttempt, newAttempt } from "./google-oauth";

const attempt = newAttempt("/dashboard/posts");

describe("authorizeUrl", () => {
  const url = new URL(authorizeUrl({ clientId: "client-123.apps.googleusercontent.com", redirectUri: "https://example.com/api/v1/auth/google/callback", attempt }));
  const q = url.searchParams;

  it("asks Google for an OpenID code sent back to our own domain", () => {
    expect(url.origin + url.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(q.get("client_id")).toBe("client-123.apps.googleusercontent.com");
    expect(q.get("redirect_uri")).toBe("https://example.com/api/v1/auth/google/callback");
    expect(q.get("response_type")).toBe("code");
    expect(q.get("scope")).toBe("openid email profile");
    expect(q.get("state")).toBe(attempt.state);
  });

  // Supabase hashes the raw nonce it is given and compares it with the token's nonce claim.
  it("sends the SHA-256 hex of the nonce, never the nonce itself", () => {
    expect(q.get("nonce")).toBe(createHash("sha256").update(attempt.nonce).digest("hex"));
    expect(url.href).not.toContain(attempt.nonce);
  });

  it("uses PKCE with S256 and keeps the verifier out of the URL", () => {
    expect(q.get("code_challenge")).toBe(createHash("sha256").update(attempt.verifier).digest("base64url"));
    expect(q.get("code_challenge_method")).toBe("S256");
    expect(url.href).not.toContain(attempt.verifier);
  });
});

describe("attempt cookie", () => {
  it("round-trips", () => {
    expect(decodeAttempt(encodeAttempt(attempt))).toEqual(attempt);
    const noNext = newAttempt(null);
    expect(decodeAttempt(encodeAttempt(noNext))).toEqual(noNext);
  });

  it("gives every attempt fresh random values", () => {
    const other = newAttempt(null);
    expect(other.state).not.toBe(attempt.state);
    expect(other.nonce).not.toBe(attempt.nonce);
    expect(other.verifier).not.toBe(attempt.verifier);
    // RFC 7636: the verifier is 43 to 128 characters.
    expect(attempt.verifier.length).toBeGreaterThanOrEqual(43);
    expect(attempt.verifier.length).toBeLessThanOrEqual(128);
  });

  it("refuses a missing or altered cookie", () => {
    expect(decodeAttempt(undefined)).toBeNull();
    expect(decodeAttempt("")).toBeNull();
    expect(decodeAttempt("not-base64-json")).toBeNull();
    expect(decodeAttempt(Buffer.from(JSON.stringify({ state: "x" })).toString("base64url"))).toBeNull();
  });
});
