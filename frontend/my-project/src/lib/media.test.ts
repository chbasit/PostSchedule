import { describe, expect, it } from "vitest";
import { MAX_UPLOAD_BYTES, mediaKey, uploadKind } from "./media";

const WS = "11111111-1111-4111-8111-111111111111";
const ASSET = "22222222-2222-4222-8222-222222222222";

describe("uploadKind", () => {
  it("knows the photo and video types the composer accepts", () => {
    expect(uploadKind("image/jpeg")).toBe("image");
    expect(uploadKind("image/png")).toBe("image");
    expect(uploadKind("video/mp4")).toBe("video");
    expect(uploadKind("video/quicktime")).toBe("video");
  });

  it("refuses everything else, including inherited object keys", () => {
    expect(uploadKind("application/pdf")).toBeNull();
    expect(uploadKind("image/svg+xml")).toBeNull();
    expect(uploadKind("toString")).toBeNull();
    expect(uploadKind("")).toBeNull();
  });

  it("matches the storage plan's 50 MB file limit", () => {
    expect(MAX_UPLOAD_BYTES).toBe(50 * 1024 * 1024);
  });
});

describe("mediaKey", () => {
  it("files each upload under its workspace and asset", () => {
    expect(mediaKey(WS, ASSET, "Summer sale.MP4")).toBe(`${WS}/${ASSET}/Summer-sale.mp4`);
  });

  it("keeps keys safe whatever the file is called", () => {
    expect(mediaKey(WS, ASSET, "../../etc/passwd")).toBe(`${WS}/${ASSET}/passwd`);
    expect(mediaKey(WS, ASSET, "C:\\photos\\shop.v2.JPG")).toBe(`${WS}/${ASSET}/shop-v2.jpg`);
    expect(mediaKey(WS, ASSET, "  ")).toBe(`${WS}/${ASSET}/file`);
    expect(mediaKey(WS, ASSET, "café crème.jpeg")).toBe(`${WS}/${ASSET}/cafe-creme.jpeg`);
    expect(mediaKey(WS, ASSET, ".hidden")).toBe(`${WS}/${ASSET}/hidden`);
    expect(mediaKey(WS, ASSET, `${"a".repeat(200)}.png`).length).toBeLessThan(WS.length + ASSET.length + 100);
  });
});
