# JustInNeed

## 실행

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # 프로덕션 빌드
```

## 라우팅

| 경로             | 화면                                           |
| ---------------- | ---------------------------------------------- |
| `/login`         | 로그인/회원가입 (소셜 → OAuth → 닉네임 → 완료) |
| `/sessions`      | 세션 목록 (리스트 / 해시태그 그룹 / 즐겨찾기)  |
| `/sessions/[id]` | 세션 상세 (줄글·마인드맵 보기, 편집, 출처)     |

`/sessions` 이하는 `(personal)` 레이아웃이 감싸며, 로그인되지 않은 경우 `/login`으로 보냅니다.

## 폴더 구조

```
src/
  app/
    (personal)/            # 사이드바 + 인증 가드가 적용되는 개인 영역
      layout.tsx
      sessions/page.tsx
      sessions/[id]/page.tsx
    login/page.tsx
    layout.tsx             # 루트 레이아웃
    globals.css            # 디자인 토큰(컬러/그림자/폰트) + 리셋
  components/
    ui/                    # 공통 프리미티브 (Icon, Card, Button, HashChip, PageHeader)
    layout/Sidebar.tsx     # 좌측 네비게이션
    mindmap/Mindmap.tsx    # force-directed 그래프
  features/
    auth/                  # 인증 플로우 (providers, AuthFlow, steps/*)
    sessions/              # 세션 목록·상세·그룹 에디터·출처·인용 등
  lib/
    types.ts               # 도메인 타입
    data.ts                # mock 데이터 (API 연결 시 교체)
    storage.ts             # localStorage 헬퍼 (auth / groups)
```
