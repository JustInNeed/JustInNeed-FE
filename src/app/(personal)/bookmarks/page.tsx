import { BookmarksView } from "@/features/community/BookmarksView";

export default function BookmarksPage() {
  // 북마크 API 가 생기기 전까지는 데이터 없이 빈 상태를 보여준다
  return <BookmarksView data={null} />;
}
