import { PostsView } from "@/features/posts/posts-list";
import { AppPage } from "@/features/shell/app-page";

// All, Scheduled, Posted and Drafts are tabs on this one route (?tab=).
export default function PostsPage() {
  return (
    <AppPage skeleton="list">
      <PostsView />
    </AppPage>
  );
}
