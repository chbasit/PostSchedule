import { describe, expect, it } from "vitest";
import { crc32, zipStore } from "./zip";

const bytes = (s: string) => new TextEncoder().encode(s);

// Reads the archive back through its central directory, the way unzip tools do.
function readZip(zip: Uint8Array) {
  const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  const end = zip.length - 22;
  expect(view.getUint32(end, true)).toBe(0x06054b50);
  const count = view.getUint16(end + 10, true);
  let at = view.getUint32(end + 16, true);
  const files: Array<{ name: string; data: Uint8Array; crc: number }> = [];
  for (let i = 0; i < count; i++) {
    expect(view.getUint32(at, true)).toBe(0x02014b50);
    const crc = view.getUint32(at + 16, true);
    const size = view.getUint32(at + 20, true);
    const nameLength = view.getUint16(at + 28, true);
    const local = view.getUint32(at + 42, true);
    const name = new TextDecoder().decode(zip.subarray(at + 46, at + 46 + nameLength));
    expect(view.getUint32(local, true)).toBe(0x04034b50);
    const dataAt = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
    files.push({ name, data: zip.subarray(dataAt, dataAt + size), crc });
    at += 46 + nameLength;
  }
  return files;
}

describe("crc32", () => {
  it("matches the standard check value", () => {
    expect(crc32(bytes("123456789"))).toBe(0xcbf43926);
    expect(crc32(new Uint8Array())).toBe(0);
  });
});

describe("zipStore", () => {
  it("stores every file so it can be read back byte for byte", () => {
    const entries = [
      { name: "carousel-01.jpg", data: bytes("first slide") },
      { name: "carousel-02.jpg", data: new Uint8Array([0, 255, 1, 254, 2]) },
      { name: "café/ñ.txt", data: bytes("utf-8 names") },
    ];
    const files = readZip(zipStore(entries, new Date(2026, 9, 25, 10, 30, 0)));
    expect(files.map((f) => f.name)).toEqual(entries.map((e) => e.name));
    files.forEach((f, i) => {
      expect([...f.data]).toEqual([...entries[i].data]);
      expect(f.crc).toBe(crc32(entries[i].data));
    });
  });

  it("writes an empty archive as just the end record", () => {
    const zip = zipStore([]);
    expect(zip.length).toBe(22);
    expect(readZip(zip)).toEqual([]);
  });
});
