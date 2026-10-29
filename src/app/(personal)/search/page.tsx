import { SearchView } from "@/features/community/SearchView";

export default function SearchPage() {
  // 검색 API 가 생기기 전까지는 데이터 없이 빈 상태를 보여준다 (화면 보류)
  return <SearchView data={null} />;
}
