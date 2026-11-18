// 정책 #22 디자인 토큰 lint: CSS 모듈에서 색을 직접 쓰지 않고 globals.css 의 토큰(var(--…))만 쓴다.
// 토큰을 정의하는 globals.css 는 예외. 반투명 rgba() · hsla() 는 이번 규칙 범위 밖이다.
const config = {
  ignoreFiles: ["src/app/globals.css", ".next/**", "node_modules/**"],
  rules: {
    "color-no-hex": [true, { message: "색은 globals.css 의 토큰(var(--…))으로 씁니다. 맞는 토큰이 없으면 가장 가까운 기존 토큰을 쓰고 정책 #22 기록에 남깁니다." }],
    "color-named": ["never", { message: "색 이름(white, red 등) 대신 globals.css 의 토큰(var(--…))을 씁니다." }],
  },
};

export default config;
