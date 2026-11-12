import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { decrypt, encrypt, parseKeyRing } from "./crypto";

const k1 = randomBytes(32).toString("base64");
const k2 = randomBytes(32).toString("base64");

describe("parseKeyRing", () => {
  it("reads the key map and the active key", () => {
    const ring = parseKeyRing(JSON.stringify({ k1, k2 }), "k2");
    expect(ring?.active).toBe("k2");
    expect(Object.keys(ring?.keys ?? {})).toEqual(["k1", "k2"]);
  });

  it("refuses missing, malformed or short keys, and an active id that is not in the map", () => {
    expect(parseKeyRing(undefined, "k1")).toBeNull();
    expect(parseKeyRing("not json", "k1")).toBeNull();
    expect(parseKeyRing(JSON.stringify({ k1: "c2hvcnQ=" }), "k1")).toBeNull();
    expect(parseKeyRing(JSON.stringify({ k1 }), "k9")).toBeNull();
  });
});

describe("encrypt and decrypt", () => {
  const ring = parseKeyRing(JSON.stringify({ k1, k2 }), "k1")!;

  it("round-trips, with a fresh IV every time", () => {
    const a = encrypt(ring, "xxxx-yyyy-zzzz-wwww");
    const b = encrypt(ring, "xxxx-yyyy-zzzz-wwww");
    expect(a).not.toBe(b);
    expect(a.startsWith("k1:")).toBe(true);
    expect(a).not.toContain("xxxx");
    expect(decrypt(ring, a)).toBe("xxxx-yyyy-zzzz-wwww");
  });

  it("keeps reading values written with an older key after rotation", () => {
    const old = encrypt(ring, "token-1");
    const rotated = parseKeyRing(JSON.stringify({ k1, k2 }), "k2")!;
    expect(decrypt(rotated, old)).toBe("token-1");
    expect(encrypt(rotated, "token-2").startsWith("k2:")).toBe(true);
  });

  it("refuses a changed value or a removed key", () => {
    const value = encrypt(ring, "secret");
    const [id, iv, tag, data] = value.split(":");
    const flipped = Buffer.from(data, "base64url");
    flipped[0] ^= 1;
    expect(() => decrypt(ring, [id, iv, tag, flipped.toString("base64url")].join(":"))).toThrow();
    expect(() => decrypt(parseKeyRing(JSON.stringify({ k2 }), "k2")!, value)).toThrow("undecryptable");
  });
});
