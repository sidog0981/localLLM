# localLLM

로컬 LLM 코딩 실험을 위한 Expo 기본 프로젝트입니다. 첫 화면은 비어 있으며, `app/index.tsx`부터 원하는 기능을 추가하면 됩니다.

## 실행

```sh
npm install
npm run web
```

- `npm start`: Expo 개발 서버
- `npm run ios` / `npm run android`: 네이티브 앱 빌드 및 실행
- `npm run typecheck`: TypeScript 검사

## 구조

```text
app/
  _layout.tsx         앱 테마, 폰트, 전역 CSS, 라우팅
  index.tsx           빈 홈 화면
  +not-found.tsx      404 화면
  +html.tsx           웹 HTML 설정
components/          테마 Text/View, 버튼, 외부 링크, 공통 훅
constants/Colors.ts  공통 색상
utils/storage.ts     실험용 키-값 저장 유틸
assets/              아이콘과 폰트
global.css           NativeWind / Tailwind 스타일 진입점
```

`@/`는 프로젝트 루트를 가리킵니다. 예: `@/components/Themed`.
화면 파일만 `app/`에 두고, 공통 컴포넌트와 로직은 바깥에 둡니다.

기존 NativeWind 5 / Tailwind 4 설정을 유지합니다. 전역 CSS는 루트 레이아웃에서 한 번 불러오며, 스타일 확장은 `global.css`에서 시작합니다.

`storage`는 웹에서는 localStorage를 사용하고, 사용할 수 없는 환경에서는 메모리에만 저장합니다. 네이티브에서 앱을 종료하면 데이터가 사라집니다. 실제 인증이나 영구 저장이 필요할 때 해당 기능에 맞는 저장 방식을 추가하세요.

관리자, 인증, 가이드, 통계, 샘플 탭과 데모 모달은 제거했습니다. 필요한 기능을 정한 뒤 화면과 라우트를 추가하면 됩니다.
