# Nx 기본 개념 정리

이 문서는 Nx가 무엇인지, 왜 쓰는지, Turborepo와 무엇이 다른지를 이 워크스페이스(`web` + `api`)를 예시로 정리한 것입니다.

> 기준 버전: Nx 23.2.0, pnpm, Node 24

---

## 1. Nx란?

**Nx는 모노레포(monorepo)를 위한 빌드 시스템이자 개발 도구 모음**입니다.

- **모노레포**: 여러 앱과 라이브러리를 하나의 저장소에서 관리하는 방식입니다. 이 워크스페이스라면 프론트엔드 `web`과 백엔드 `api`가 한 저장소에 함께 있습니다.
- Nx는 저장소 안의 프로젝트들이 **서로 어떻게 의존하는지 파악**하고, 그 정보를 바탕으로 **빌드·테스트·린트 같은 작업을 빠르고 올바른 순서로 실행**해 줍니다.

한 줄로 말하면, **"프로젝트가 많아져도 느려지지 않고 일관되게 관리되는 모노레포"를 만들어 주는 도구**입니다.

---

## 2. 왜 Nx를 쓰나?

모노레포가 커지면 보통 아래 문제가 생깁니다. Nx는 각 문제에 대한 해결책을 제공합니다.

| 모노레포에서 생기는 문제                                               | Nx의 해결 방법                                                                            |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 코드 한 줄을 고쳐도 전체를 다시 빌드·테스트해서 CI가 느림              | **affected**: 변경의 영향을 받는 프로젝트만 실행                                          |
| 이미 했던 빌드를 또 함                                                 | **계산 캐시**: 입력이 같으면 이전 결과를 그대로 재사용                                    |
| 라이브러리를 먼저 빌드해야 앱을 빌드할 수 있는데, 순서를 사람이 관리함 | **프로젝트 그래프 + 태스크 파이프라인**으로 순서를 자동 결정하고, 가능한 작업은 병렬 실행 |
| 프로젝트마다 설정과 폴더 구조가 제각각                                 | **제너레이터**로 같은 규칙의 코드를 생성                                                  |
| 도구(React, Vite, Jest 등) 버전 업그레이드가 고통스러움                | **`nx migrate`**로 의존성 버전과 설정 코드를 자동 마이그레이션                            |
| 아무 프로젝트나 아무 프로젝트를 import 해서 구조가 무너짐              | **모듈 경계 규칙**(ESLint)으로 의존 방향 제한                                             |

---

## 3. 핵심 개념

### 3.1 워크스페이스와 프로젝트

- **워크스페이스**: `nx.json`이 있는 저장소 루트 전체입니다.
- **프로젝트**: 워크스페이스 안의 앱이나 라이브러리 하나입니다. 이 워크스페이스에는 `@org/web`과 `@org/api` 두 프로젝트가 있습니다.

```
.
├── apps/
│   ├── web/      # React 19 + Vite
│   └── api/      # NestJS 11 (webpack 빌드)
├── packages/     # 공유 라이브러리를 둘 곳 (현재 비어 있음)
├── nx.json       # Nx 전역 설정 (플러그인, 캐시, 태스크 기본값)
└── pnpm-workspace.yaml
```

### 3.2 타깃(Target)과 태스크(Task)

- **타깃**: 프로젝트에서 실행할 수 있는 작업 이름입니다. 예: `build`, `test`, `lint`, `serve`
- **태스크**: "어떤 프로젝트의 어떤 타깃"을 실제로 한 번 실행하는 단위입니다. 예: `@org/web:build`

```bash
pnpm nx build @org/web     # 태스크 하나 실행
pnpm nx run-many -t build  # 모든 프로젝트의 build 실행
```

### 3.3 플러그인과 추론 태스크(Inferred Tasks)

Nx 플러그인은 프로젝트 안의 설정 파일을 읽고 **타깃을 자동으로 만들어 줍니다.** 그래서 `package.json`에 스크립트를 일일이 적지 않아도 됩니다.

| 설정 파일           | 플러그인             | 자동으로 생기는 타깃               |
| ------------------- | -------------------- | ---------------------------------- |
| `vite.config.mts`   | `@nx/vite/plugin`    | `build`, `serve`, `dev`, `preview` |
| `webpack.config.js` | `@nx/webpack/plugin` | `build`, `serve`                   |
| `vitest.config.mts` | `@nx/vitest`         | `test`                             |
| `eslint.config.mjs` | `@nx/eslint/plugin`  | `lint`                             |
| `tsconfig.*.json`   | `@nx/js/typescript`  | `typecheck`                        |

어떤 타깃이 어떻게 만들어졌는지는 아래 명령으로 볼 수 있습니다.

```bash
pnpm nx show project @org/web
```

### 3.4 프로젝트 그래프

Nx는 소스 코드의 `import`와 `package.json` 의존성을 분석해 **프로젝트 간 의존 관계 그래프**를 만듭니다. 캐시, affected, 실행 순서가 모두 이 그래프를 기반으로 동작합니다.

```bash
pnpm nx graph   # 브라우저에서 그래프 보기
```

지금은 `web`과 `api`가 서로 참조하지 않아서 연결선이 없습니다. `packages/`에 공유 라이브러리를 만들고 두 앱에서 import 하면 선이 생깁니다.

### 3.5 태스크 파이프라인

`nx.json`의 `targetDefaults`에 "이 타깃을 실행하기 전에 무엇을 먼저 실행할지"를 정의합니다. 이 워크스페이스의 `nx.json`에는 아래 설정이 들어 있습니다.

```json
{
  "targetDefaults": {
    "test": { "dependsOn": ["^build"] }
  }
}
```

`^build`는 "**내가 의존하는 프로젝트들의** `build`를 먼저 실행하라"는 뜻입니다. 즉 어떤 프로젝트의 `test`를 돌리기 전에, 그 프로젝트가 의존하는 라이브러리들을 먼저 빌드합니다. 순서를 사람이 기억할 필요가 없어집니다.

### 3.6 계산 캐시 (Computation Caching)

Nx는 태스크를 실행하기 전에 **입력(소스 파일, 설정, 의존성 버전, 환경 등)의 해시**를 계산합니다. 같은 해시로 실행한 적이 있으면 실제로 실행하지 않고 **이전 결과(출력 파일과 터미널 로그)를 복원**합니다.

```bash
pnpm nx build @org/web   # 처음: 실제 빌드
pnpm nx build @org/web   # 두 번째: [local cache] 로 즉시 완료
```

- **로컬 캐시**: 내 컴퓨터의 `.nx/cache`
- **원격 캐시**: Nx Cloud 등을 연결하면 팀원과 CI가 캐시를 공유합니다. 동료가 이미 빌드한 결과를 내가 받아 쓸 수 있습니다. (이 워크스페이스는 연결하지 않았습니다.)

### 3.7 Affected (영향받는 프로젝트만 실행)

git 변경 내역과 프로젝트 그래프를 조합해 **변경의 영향을 받는 프로젝트만** 골라 실행합니다.

```bash
pnpm nx affected -t test                # 기본 브랜치(main) 대비 변경분
pnpm nx affected -t build --base=HEAD~1 # 기준 커밋 지정
```

예를 들어 `apps/api`만 수정했다면 `web`의 테스트는 건너뜁니다. 공유 라이브러리를 수정했다면 그 라이브러리를 쓰는 앱도 모두 대상에 포함됩니다.

### 3.8 제너레이터 (Generators)

코드와 설정을 일관된 규칙으로 생성해 주는 도구입니다. 이 워크스페이스의 두 앱도 제너레이터로 만들었습니다.

```bash
pnpm nx g @nx/react:app apps/web --bundler=vite
pnpm nx g @nx/nest:app apps/api
pnpm nx g @nx/react:lib packages/ui   # 라이브러리 추가 예시
pnpm nx g @nx/react:app apps/admin --dry-run   # 실제로 만들지 않고 미리 보기
```

### 3.9 Nx 데몬

Nx는 백그라운드 프로세스(데몬)를 띄워 파일 변경을 감시하고, 프로젝트 그래프를 메모리에 유지합니다. 그래서 두 번째 명령부터 빨라집니다.

```bash
pnpm nx daemon          # 상태 확인
pnpm nx daemon --stop   # 중지
pnpm nx reset           # 데몬 중지 + 캐시/워크스페이스 데이터 초기화
```

> **이 워크스페이스에서 겪은 일**: 워크스페이스 루트에 `_tmp_*` 파일이 계속 생겼다 지워지면서 데몬이 프로젝트 그래프를 1분에 약 160번씩 다시 계산했고, CPU 사용률이 높아졌습니다. 이런 증상이 보이면 `nx daemon --stop`으로 멈추고, `.nx/workspace-data/d/daemon.log`에서 어떤 파일 변경이 재계산을 일으키는지 확인하세요.

### 3.10 `nx migrate`

Nx와 플러그인을 업그레이드할 때 **버전만 올리는 것이 아니라 설정 파일과 코드까지 자동으로 수정**합니다.

```bash
pnpm nx migrate latest      # migrations.json 생성 + package.json 업데이트
pnpm install
pnpm nx migrate --run-migrations
```

---

## 4. Nx vs Turborepo

둘 다 JavaScript/TypeScript 모노레포에서 **태스크 실행, 캐싱, 영향 범위 분석**을 해 주는 도구라서 자주 비교됩니다. 가장 큰 차이는 **범위**입니다.

- **Turborepo**: "빠른 **태스크 러너**"에 집중합니다. 기존 패키지 매니저 워크스페이스 위에 얇게 얹어 쓰는 도구입니다.
- **Nx**: 태스크 러너에 더해 **코드 생성, 마이그레이션, 아키텍처 규칙, 분산 실행**까지 포함하는 **모노레포 플랫폼**입니다.

### 4.1 비교표

| 항목                                   | Nx                                                                               | Turborepo                                                  |
| -------------------------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| 만든 곳                                | Nx (구 Nrwl)                                                                     | Vercel                                                     |
| 구현                                   | TypeScript + Rust 코어                                                           | Rust                                                       |
| 설정 파일                              | `nx.json` (+ 필요하면 `project.json`)                                            | `turbo.json`                                               |
| 태스크 정의 방식                       | `package.json` 스크립트도 되고, **플러그인이 설정 파일을 보고 타깃을 자동 추론** | `package.json`의 `scripts`를 `turbo.json`의 `tasks`로 연결 |
| 의존 관계 파악                         | 소스 코드 import 분석 + `package.json`                                           | 주로 `package.json` 의존성 (패키지 단위)                   |
| 로컬 캐시                              | 있음                                                                             | 있음                                                       |
| 원격 캐시                              | Nx Cloud (또는 자체 호스팅 옵션)                                                 | Vercel Remote Cache (또는 자체 호스팅 서버)                |
| 영향 범위 실행                         | `nx affected`                                                                    | `turbo run --affected`, `--filter`                         |
| 분산 실행 (여러 CI 머신에 태스크 분배) | Nx Cloud의 Nx Agents로 지원                                                      | 기본 제공 없음                                             |
| 코드 생성                              | 플러그인별 제너레이터가 풍부함                                                   | `turbo gen` (간단한 템플릿 기반)                           |
| 자동 마이그레이션                      | `nx migrate`가 Nx, 플러그인, 프레임워크 설정까지 업데이트                        | Turborepo 자체 업그레이드용 codemod 정도                   |
| 의존 방향 규칙                         | `@nx/enforce-module-boundaries` (ESLint, 태그 기반)                              | `turbo boundaries` (상대적으로 최근 추가된 기능)           |
| 그래프 시각화                          | `nx graph` (인터랙티브 웹 UI)                                                    | `turbo run --graph` (Graphviz 등 파일 출력)                |
| JS 외 언어                             | 플러그인으로 Gradle 등 지원                                                      | JS/TS 패키지 매니저 워크스페이스 중심                      |
| 학습 곡선                              | 개념이 많아 처음엔 무거움                                                        | 개념이 적어 바로 도입하기 쉬움                             |

> 두 도구 모두 빠르게 발전하고 있어 세부 기능은 바뀔 수 있습니다. 도입 전에는 공식 문서를 확인하세요.

### 4.2 같은 일을 하는 설정 비교

**"build 전에 의존 패키지의 build를 먼저 실행하고, dist를 캐시하라"**

Turborepo (`turbo.json`):

```json
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    }
  }
}
```

Nx (`nx.json`):

```json
{
  "targetDefaults": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["{projectRoot}/dist"],
      "cache": true
    }
  }
}
```

개념은 거의 같습니다. 다만 Nx는 플러그인을 쓰면 `outputs`와 캐시 설정까지 **자동으로 추론**하기 때문에, 이 워크스페이스처럼 직접 적지 않아도 되는 경우가 많습니다.

### 4.3 언제 무엇을 고를까?

**Turborepo가 잘 맞는 경우**

- 이미 pnpm/npm/yarn 워크스페이스로 잘 굴러가는 저장소에 **캐시와 병렬 실행만 빠르게 추가**하고 싶을 때
- 패키지 수가 많지 않고 구조가 단순할 때
- Vercel에 배포하고 Vercel Remote Cache를 쓰고 싶을 때

**Nx가 잘 맞는 경우**

- 프로젝트가 많고 계속 늘어날 예정이라 **일관된 생성 규칙과 아키텍처 규칙**이 필요할 때
- CI가 느려서 **affected + 원격 캐시 + 분산 실행**까지 필요할 때
- React, Nest, Angular 등 **프레임워크 업그레이드를 자동화**하고 싶을 때
- 이 워크스페이스처럼 **프론트엔드와 백엔드를 한 저장소에서** 관리할 때

> 참고: Nx도 `nx init`으로 기존 저장소에 **태스크 러너 + 캐시 용도로만** 가볍게 도입할 수 있습니다. 처음부터 모든 기능을 쓸 필요는 없습니다.

---

## 5. 이 워크스페이스에서 자주 쓰는 명령

```bash
# 개발 서버
pnpm nx dev @org/web          # Vite 개발 서버
pnpm nx serve @org/api        # NestJS 서버

# 빌드, 테스트, 린트
pnpm nx run-many -t build
pnpm nx run-many -t test lint typecheck
pnpm nx affected -t test      # 변경된 것만

# 정보 확인
pnpm nx show projects          # 프로젝트 목록
pnpm nx show project @org/api  # 타깃과 설정 상세
pnpm nx graph                  # 프로젝트 그래프

# 코드 생성
pnpm nx g @nx/react:lib packages/ui
pnpm nx list                   # 설치된 플러그인 확인

# 문제 해결
pnpm nx reset                  # 캐시 + 데몬 초기화
```

---

## 6. 참고 자료

- Nx 공식 문서: https://nx.dev
- Nx 새 프로젝트 시작: https://nx.dev/docs/getting-started/start-new-project
- Turborepo 공식 문서: https://turborepo.com/docs
