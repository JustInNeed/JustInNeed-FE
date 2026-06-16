# JustInNeed

웹서핑 정리 도우미 프론트엔드. Next.js (App Router) + TypeScript + CSS Modules.

## 실행

```bash
npm install
cp .env.example .env.local   # 최초 1회 (백엔드 주소 설정)
npm run dev                  # http://localhost:3000  ← CORS가 3000에만 열려있어 반드시 3000 사용
npm run build                # 프로덕션 빌드
```

> ⚠️ 백엔드 CORS가 `http://localhost:3000`에만 허용돼 있어 dev 서버는 **3000 포트**로 띄워야 합니다.
> 3000이 막혀 있으면 Next가 자동으로 3001로 올라가는데, 그 경우 API 호출이 CORS로 막힙니다.

## 환경 변수 (`.env.local`)

| 변수 | 설명 | 기본값 |
| --- | --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | 백엔드 Base URL | `http://localhost:8080` |
| `NEXT_PUBLIC_DEV_USER_ID` | 인증 전 임시 `X-User-Id` 헤더 값 | `1` |

## 라우팅

| 경로 | 화면 |
| --- | --- |
| `/login` | 로그인/회원가입 (소셜 → OAuth → 닉네임 → 완료) |
| `/sessions` | 세션 목록 (리스트 / 해시태그 그룹 / 즐겨찾기) |
| `/sessions/[id]` | 세션 상세 (줄글·마인드맵 보기, 편집, 출처) |

`/sessions` 이하는 `(personal)` 레이아웃이 감싸며, 로그인되지 않은 경우 `/login`으로 보냅니다.

## 폴더 구조

```
src/
  app/                     # 라우팅 (login, (personal)/sessions, [id])
  components/
    ui/                    # 공통 프리미티브 (Icon, Card, Button, HashChip, PageHeader)
    layout/Sidebar.tsx
    mindmap/Mindmap.tsx
  features/
    auth/                  # 인증 플로우 (UI만, X-User-Id=1 임시)
    sessions/              # 세션 목록·상세·그룹 에디터·출처·인용
  lib/
    api/                   # ★ API 레이어
      client.ts            #   공통 request 래퍼 (Base URL, X-User-Id, ApiResponse 언래핑, 에러 throw)
      types.ts             #   백엔드 스키마 타입 (원본/source of truth)
      sessions.ts          #   GET/PATCH/DELETE /sessions
      tagGroups.ts         #   GET/POST/PATCH/DELETE /tag-groups (+/order)
    hooks/useApi.ts        # 데이터 페칭 훅 (로딩/에러/refetch)
    format.ts              # 날짜·소요시간·host·해시태그(#) 포맷
    hashtag.ts             # 해시태그 검증 규칙 (1~10자, 한글/영문/숫자, 최대 10개)
    storage.ts             # 인증 localStorage 헬퍼
    types.ts               # 화면 전용 타입 (Auth, Mindmap)
```

## 백엔드 API 연동

- 모든 API 호출은 `lib/api`를 통해서만. mock 데이터는 제거됨.
- `client.ts`의 `request()` 한 곳에서 `X-User-Id` 헤더를 주입 → **인증 도입 시 이 함수만 교체**하면 됨.
- 응답 Envelope(`{success, data, message}`)를 언래핑하고, `success===false` 또는 비2xx면 `message`로 `ApiError`를 throw → 화면에서 에러 노출.
- 해시태그는 저장값에 `#`가 없고(raw), 화면 표시 시 `withHash()`로 `#`를 붙임.

### 추가로 필요한 API (백엔드 협의)
- **세션 생성(POST /sessions)**: 현재 없음 → 목록은 빈 상태부터 시작. (확장 프로그램 수집 연동 시 필요)
- **요약 heading / insights 개별 수정**: `PATCH /sessions/{id}`가 `editedMarkdown`만 받음. 편집 화면에서 소제목·하이라이트를 따로 저장하려면 필드 추가 필요. (현재는 `title` + `editedMarkdown`만 영속화)
- (선택) **북마크 API**: 인용 팝업의 "북마크" 버튼은 아직 동작 없음.
