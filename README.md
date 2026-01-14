# 재정 입력 & 관리 프로그램

Electron과 React를 사용한 재정 관리 애플리케이션입니다.

## 기술 스택

- **Electron**: 데스크톱 애플리케이션 프레임워크
- **React**: 렌더러 프로세스 UI 라이브러리
- **SQLite (better-sqlite3)**: 메인 프로세스 데이터베이스
- **Vite**: React 빌드 도구

## 설치

```bash
npm install
```

## 개발 모드 실행

```bash
npm run dev
```

이 명령어는 React 개발 서버와 Electron을 동시에 실행합니다.

## 프로젝트 구조

```
project-setting/
├── main.js                    # Electron 메인 프로세스 엔트리 포인트
├── preload.js                 # Preload 스크립트 (보안 브릿지)
├── database.js                # SQLite 데이터베이스 초기화 모듈
├── vite.config.js             # Vite 설정
├── package.json
├── index.html                 # HTML 엔트리 포인트
└── src/
    ├── main/                  # Electron 메인 프로세스 JS 모듈
    │   ├── ipc/
    │   │   └── handlers.js    # IPC 통신 핸들러
    │   └── services/          # 비즈니스 로직 서비스
    │       ├── financeService.js    # 재정 관리 서비스
    │       ├── categoryService.js   # 항목 관리 서비스
    │       └── reportService.js     # 보고서 생성 서비스
    └── renderer/              # React 렌더러 프로세스
        ├── main.jsx           # React 엔트리 포인트
        ├── App.jsx            # 메인 App 컴포넌트
        ├── styles.css         # 전역 스타일
        └── components/
            └── MainScreen.jsx # 메인 화면 컴포넌트
```

## 기능

현재 구현된 기능:
- 메인 화면에 4개의 메뉴 버튼
  - 재정 입력
  - 항목 관리
  - 주간 보고서
  - 연간 보고서

## Electron 메인 프로세스 구조

### IPC 통신
- `src/main/ipc/handlers.js`: 렌더러 프로세스와 메인 프로세스 간 통신을 위한 IPC 핸들러
  - `finance:add`: 재정 입력
  - `category:*`: 항목 관리 (조회, 추가, 수정, 삭제)
  - `report:weekly`: 주간 보고서
  - `report:yearly`: 연간 보고서

### 서비스 레이어
- `src/main/services/financeService.js`: 재정 관련 비즈니스 로직
- `src/main/services/categoryService.js`: 항목 관리 비즈니스 로직
- `src/main/services/reportService.js`: 보고서 생성 비즈니스 로직

### 데이터베이스
- `database.js`: SQLite 데이터베이스 초기화 및 관리
- 데이터베이스 파일은 사용자 데이터 디렉토리에 `finance.db`로 저장됩니다.

## 향후 개발 예정

- SQLite 데이터베이스 모델링 및 구현
- 각 메뉴 기능 구현
- IPC 핸들러와 서비스 레이어의 실제 로직 구현
