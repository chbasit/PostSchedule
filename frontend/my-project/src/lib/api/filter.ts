import type { Post, PostFilter } from "./types";

// The same filter the API applies, so the browser can preview a filtered list instantly
// from data it already has while the real request runs.
export function matchesFilter(post: Post, filter: PostFilter): boolean {
  if (filter.status) {
    const list = Array.isArray(filter.status) ? filter.status : [filter.status];
    if (!list.includes(post.status)) return false;
  }
  const when = post.scheduledAt ?? post.updatedAt;
  if (filter.from && when < filter.from) return false;
  if (filter.to && when >= filter.to) return false;
  if (filter.q && !post.mainCaption.toLowerCase().includes(filter.q.toLowerCase())) return false;
  if (filter.tagIds?.length && !filter.tagIds.some((id) => post.tagIds.includes(id))) return false;
  return true;
}

export function sortPosts(posts: Post[]): Post[] {
  return [...posts].sort((a, b) => (b.scheduledAt ?? b.updatedAt).localeCompare(a.scheduledAt ?? a.updatedAt));
}
