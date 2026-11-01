import "server-only";
import type { ImageAspect } from "@/lib/ai/images";
import type { AiImageQuality } from "@/lib/billing/plans";
import type { AiEnv } from "../env";

// The only place that knows how OpenAI and Gemini are called (BACKEND.md §16). Plain fetch,
// no SDKs. Keys never leave the server and are never logged; neither are prompts or bodies.

export type ProviderId = "openai" | "gemini";

export class ProviderError extends Error {
  constructor(
    public kind: "rate_limited" | "content_rejected" | "transient" | "unknown",
    message: string,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}

export type RawImage = { bytes: Buffer; mime: string };

export type ImageProvider = {
  id: ProviderId;
  model: string;
  generate(input: { prompt: string; aspect: ImageAspect; quality: AiImageQuality; count: number }): Promise<RawImage[]>;
};

export type TextProvider = {
  id: ProviderId;
  model: string;
  complete(input: { system: string; user: string; maxTokens: number }): Promise<string>;
};

const DEFAULT_MODELS = {
  openai: { text: "gpt-4.1-mini", image: "gpt-image-1" },
  gemini: { text: "gemini-2.5-flash", image: "gemini-2.5-flash-image" },
} as const;

const IMAGE_TIMEOUT_MS = 100_000;
const TEXT_TIMEOUT_MS = 30_000;

async function post(url: string, headers: Record<string, string>, body: unknown, timeoutMs: number, provider: ProviderId): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (e) {
    throw new ProviderError("transient", e instanceof DOMException && e.name === "TimeoutError" ? `${provider} timed out` : `${provider} unreachable`);
  }
  const payload = (await res.json().catch(() => null)) as { error?: { code?: string; status?: string; type?: string; message?: string } } | null;
  if (!res.ok) {
    const code = payload?.error?.code ?? payload?.error?.status ?? payload?.error?.type ?? "";
    console.warn(`[ai] ${provider} answered ${res.status} ${code}`);
    if (res.status === 429) throw new ProviderError("rate_limited", `${provider} rate limited`);
    if (res.status >= 500) throw new ProviderError("transient", `${provider} ${res.status}`);
    if (/moderation|safety|content_policy|blocked/i.test(String(code))) throw new ProviderError("content_rejected", `${provider} refused the prompt`);
    throw new ProviderError("unknown", `${provider} ${res.status}`);
  }
  return payload;
}

// ---- OpenAI -------------------------------------------------------------------------------

// gpt-image-1 renders three sizes; the closest one is cropped to the exact ratio afterwards.
const OPENAI_SIZES: Record<ImageAspect, string> = {
  "1:1": "1024x1024",
  "4:5": "1024x1536",
  "9:16": "1024x1536",
  "16:9": "1536x1024",
};

function openaiImages(key: string, model: string): ImageProvider {
  return {
    id: "openai",
    model,
    async generate({ prompt, aspect, quality, count }) {
      const data = (await post(
        "https://api.openai.com/v1/images/generations",
        { Authorization: `Bearer ${key}` },
        { model, prompt, n: count, size: OPENAI_SIZES[aspect], quality: quality === "hd" ? "high" : "medium" },
        IMAGE_TIMEOUT_MS,
        "openai",
      )) as { data?: Array<{ b64_json?: string }> };
      const images = (data.data ?? []).flatMap((d) => (d.b64_json ? [{ bytes: Buffer.from(d.b64_json, "base64"), mime: "image/png" }] : []));
      if (images.length === 0) throw new ProviderError("unknown", "openai returned no image");
      return images;
    },
  };
}

function openaiText(key: string, model: string): TextProvider {
  return {
    id: "openai",
    model,
    async complete({ system, user, maxTokens }) {
      const data = (await post(
        "https://api.openai.com/v1/chat/completions",
        { Authorization: `Bearer ${key}` },
        {
          model,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          max_completion_tokens: maxTokens,
          temperature: 0.8,
        },
        TEXT_TIMEOUT_MS,
        "openai",
      )) as { choices?: Array<{ message?: { content?: string | null; refusal?: string | null } }> };
      const message = data.choices?.[0]?.message;
      if (message?.refusal) throw new ProviderError("content_rejected", "openai refused the prompt");
      const text = message?.content?.trim();
      if (!text) throw new ProviderError("unknown", "openai returned no text");
      return text;
    },
  };
}

// ---- Gemini -------------------------------------------------------------------------------

type GeminiResponse = {
  promptFeedback?: { blockReason?: string };
  candidates?: Array<{ finishReason?: string; content?: { parts?: Array<{ text?: string; inlineData?: { mimeType?: string; data?: string } }> } }>;
};

const GEMINI_BLOCKED = new Set(["SAFETY", "PROHIBITED_CONTENT", "IMAGE_SAFETY", "BLOCKLIST", "SPII", "RECITATION"]);

function geminiCheck(data: GeminiResponse) {
  if (data.promptFeedback?.blockReason || GEMINI_BLOCKED.has(data.candidates?.[0]?.finishReason ?? "")) {
    throw new ProviderError("content_rejected", "gemini refused the prompt");
  }
}

const geminiUrl = (model: string) => `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

function geminiImages(key: string, model: string): ImageProvider {
  return {
    id: "gemini",
    model,
    // One image per call, so several run side by side.
    async generate({ prompt, aspect, count }) {
      const one = async (): Promise<RawImage> => {
        const data = (await post(
          geminiUrl(model),
          { "x-goog-api-key": key },
          {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: aspect } },
          },
          IMAGE_TIMEOUT_MS,
          "gemini",
        )) as GeminiResponse;
        geminiCheck(data);
        const part = data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
        if (!part?.inlineData?.data) throw new ProviderError("unknown", "gemini returned no image");
        return { bytes: Buffer.from(part.inlineData.data, "base64"), mime: part.inlineData.mimeType ?? "image/png" };
      };
      return Promise.all(Array.from({ length: count }, one));
    },
  };
}

function geminiText(key: string, model: string): TextProvider {
  return {
    id: "gemini",
    model,
    async complete({ system, user, maxTokens }) {
      const data = (await post(
        geminiUrl(model),
        { "x-goog-api-key": key },
        {
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: "user", parts: [{ text: user }] }],
          // No thinking budget: captions are short, and it keeps answers fast and cheap.
          generationConfig: { maxOutputTokens: maxTokens, temperature: 0.8, thinkingConfig: { thinkingBudget: 0 } },
        },
        TEXT_TIMEOUT_MS,
        "gemini",
      )) as GeminiResponse;
      geminiCheck(data);
      const text = (data.candidates?.[0]?.content?.parts ?? [])
        .map((p) => p.text ?? "")
        .join("")
        .trim();
      if (!text) throw new ProviderError("unknown", "gemini returned no text");
      return text;
    },
  };
}

export function imageProvider(env: AiEnv): ImageProvider {
  const id = env.AI_IMAGE_PROVIDER;
  const model = env.AI_IMAGE_MODEL ?? DEFAULT_MODELS[id].image;
  return id === "openai" ? openaiImages(env.OPENAI_API_KEY!, model) : geminiImages(env.GEMINI_API_KEY!, model);
}

export function textProvider(env: AiEnv): TextProvider {
  const id = env.AI_TEXT_PROVIDER;
  const model = env.AI_TEXT_MODEL ?? DEFAULT_MODELS[id].text;
  return id === "openai" ? openaiText(env.OPENAI_API_KEY!, model) : geminiText(env.GEMINI_API_KEY!, model);
}
