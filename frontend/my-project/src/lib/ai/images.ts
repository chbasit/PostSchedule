// AI Studio's options, shared by the page, the mock API and the server so they always agree.
// Aspect ratios are the ones the social platforms crop to; every image comes back at exactly
// that ratio, so pre-flight passes without a crop.

export const IMAGE_STYLES = ["photo", "illustration", "3d", "minimal", "flat", "cinematic"] as const;
export type ImageStyle = (typeof IMAGE_STYLES)[number];

export const IMAGE_ASPECTS = ["1:1", "4:5", "9:16", "16:9"] as const;
export type ImageAspect = (typeof IMAGE_ASPECTS)[number];

// Output size per aspect: 1080 px on the short side, what the platforms display at.
export const ASPECT_SIZES: Record<ImageAspect, { width: number; height: number }> = {
  "1:1": { width: 1080, height: 1080 },
  "4:5": { width: 1080, height: 1350 },
  "9:16": { width: 1080, height: 1920 },
  "16:9": { width: 1920, height: 1080 },
};

export const IMAGE_QUALITIES = ["standard", "hd"] as const;

export const PROMPT_MAX = 1000;
export const MAX_IMAGES_PER_REQUEST = 4;

// Style words appended to the person's prompt. Kept short so the prompt stays theirs.
const STYLE_HINTS: Record<ImageStyle, string> = {
  photo: "Photorealistic photograph, natural light, sharp focus.",
  illustration: "Clean digital illustration, bold shapes, vibrant colours.",
  "3d": "Polished 3D render, soft studio lighting, subtle shadows.",
  minimal: "Minimalist composition, lots of negative space, two or three colours.",
  flat: "Flat vector graphic, simple geometric shapes, no gradients.",
  cinematic: "Cinematic still, dramatic lighting, shallow depth of field.",
};

// No text in the image unless asked: generated lettering is often misspelled, and captions
// carry the words on every platform anyway.
export function buildImagePrompt(prompt: string, style: ImageStyle, aspect: ImageAspect): string {
  return `${prompt.trim()}\n\n${STYLE_HINTS[style]} Composed for a ${aspect} social media post. Do not add text, logos or watermarks unless the request above asks for them.`;
}
