# carbon-management-platform

(주)하나루프 SaaS 탄소경영플랫폼 — **개발자 채용 과제** 구현물.

제품 단위의 **PCF(Product Carbon Footprint)** 계산을 핵심 시나리오로 잡고, 활동 데이터(BOM/공정/물류/사용/폐기) 입력 → 배출계수 매칭 → 단계별 배출량 계산·집계 → 이력 저장·시각화의 한 사이클을 동작 가능한 수준으로 구현했다.

> ⚠️ **데모용 배출계수.** 본 저장소의 `EmissionFactor.value`는 *시연용* 합성 값이며 인증/공시 용도로 사용할 수 없다 (모든 시드 계수 `isDemo = true`, `source = "DEMO ONLY — not for certification"`).

---

## 1. 개요

- **도메인 한 줄**: 제품 1단위(`functionalUnit`)당 라이프사이클 5단계의 활동량과 배출계수를 곱해 `kgCO2e`로 환산한 뒤, 단계별/제품별로 집계하고 이력으로 박제하는 시스템.
- **핵심 시나리오** (Demo Flow, 과제 제공 자료 `CT-045` 기준):
  1. 제품 등록 — `컴퓨터 화면` (sku `CT-045`, 단위 `1 unit`)
  2. 자료 표 30행 그대로 활동 등록 — 전기 9 (USE, 한국전력 0.456 kgCO2e/kWh) · 원소재 플라스틱1 9 (RAW_MATERIAL, 2.3) · 원소재 플라스틱2 3 (RAW_MATERIAL, 3.2) · 운송 트럭 9 (TRANSPORT, 3.5 kgCO2e/ton-km, `amount` 직접입력)
  3. `POST /api/products/:id/calculate` 호출 → `CalculationRun` + `CalculationItem[]` 30행 저장
  4. 대시보드에서 단계별 비중(파이) + 이력(라인) 확인 → **총 11,072.724 kgCO2e** (전기 469.224 + 플라1 7,327.8 + 플라2 339.2 + 운송 2,936.5, 수기 합산과 일치)
- **범위에서 의식적으로 제외한 것**은 §8 비-목표 참조.

## 2. 도메인 모델 — PCF & GHG Scope 매핑

### 2.1 라이프사이클 5단계

`src/domain/pcf/stages.ts`의 단일 소스. 단계 코드는 enum + 상수 튜플 + Set 세 형태로 제공돼 Zod / Prisma / 서버 가드에서 동일 정의를 공유한다.

| `StageCode`    | 의미      | 일반적 GHG Protocol Scope 3 매핑 (Corporate Value Chain) |
| -------------- | --------- | -------------------------------------------------------- |
| `RAW_MATERIAL` | 원자재    | Category 1 — Purchased goods & services                  |
| `PRODUCTION`   | 생산 공정 | Scope 1·2 (자체 운영) 또는 Cat. 1 (위탁 생산)            |
| `TRANSPORT`    | 물류      | Category 4 — Upstream transportation & distribution      |
| `USE`          | 사용 단계 | Category 11 — Use of sold products                       |
| `END_OF_LIFE`  | 폐기      | Category 12 — End-of-life treatment of sold products     |

> 본 프로젝트는 **제품 단위(PCF)** 관점만 다루며, 조직 단위 인벤토리(Scope 1/2/3 합산 리포트)는 비-목표다. 매핑은 활동이 어떤 카테고리에 위치하는지를 평가자에게 표면화하기 위한 안내일 뿐, 자동 분류 로직은 없다.

### 2.2 계산 공식 (`src/domain/pcf/calculate.ts`)

```
일반 단계 :  kgCO2e = amount × factor.value × allocationRatio
TRANSPORT :  tonKm  = (weightKg / 1000) × distanceKm
              kgCO2e = tonKm × factor.value × allocationRatio
total     :  Σ item.kgCO2e         // 부동소수 누적 오차 회피 위해 합으로 재계산
share     :  item.kgCO2e / total   // total=0 이면 0
```

도메인 가드레일: factor 누락 / 단계 불일치 / `allocationRatio ∉ (0,1]` / `amount<=0` (TRANSPORT 제외) / TRANSPORT `weightKg|distanceKm` 누락 → `PcfDomainError(code, message)` throw. 라우트 레이어는 `code` 를 그대로 전파하며 400으로 변환한다.

### 2.3 영속 모델 (`prisma/schema.prisma`)

`Product 1—N ProductActivity N—1 EmissionFactor` + `Product 1—N CalculationRun 1—N CalculationItem`.

설계 결정 4가지:

- **`EmissionFactor @@unique([name, stageCode])`** — 시드/대량 등록을 멱등하게 만들고 “같은 단계 안에서 동일 이름 계수가 두 벌” 인 모호함을 차단.
- **`CalculationRun.snapshotJson`** — 계산 시점의 활동/계수를 JSON으로 박제. 이후 계수가 갱신돼도 과거 run은 **재현 가능**.
- **`CalculationRun → items` nested create 1회** — 총량과 명세를 단일 prisma 호출로 묶어 일관성 확보.
- **TRANSPORT 활동만 `weightKg`/`distanceKm` 사용** — 다른 단계에서는 null 강제(Zod). 운송에서는 `amount=0` 허용(`ton-km`은 `weight×distance` 파생이므로 `amount` 미사용).

## 3. 아키텍처

```
src/
├─ app/
│  ├─ api/                     # Route Handlers (얇은 HTTP 레이어)
│  │  ├─ products/             # CRUD + calculate + calculation-runs
│  │  ├─ emission-factors/     # 계수 조회 (?stage= 필터)
│  │  └─ lifecycle-stages/     # 단계 메타 (UI 셀렉터용)
│  └─ (ui)/                    # 대시보드/입력 UI 트리
├─ domain/pcf/                 # 순수 도메인 — React/Prisma/fetch 의존 없음
│  ├─ calculate.ts             # 계산 엔진
│  ├─ summarize.ts             # 단계별 집계
│  ├─ stages.ts                # 단계 상수 단일 소스
│  └─ types.ts                 # 도메인 타입 (Prisma 모델과 분리)
├─ lib/
│  ├─ adapters/pcf.ts          # Prisma row ↔ 도메인 객체 어댑터
│  ├─ api/
│  │  ├─ response.ts           # ok / fail / failFromZod (envelope)
│  │  └─ handlers.ts           # parseJsonBody / requireProduct / validateFactorForStage
│  ├─ validations/             # Zod 입력 스키마 (product, activity)
│  ├─ db.ts                    # Prisma 7 driver-adapter 싱글톤
│  └─ http.ts                  # 클라이언트용 apiFetch + ApiClientError
└─ generated/prisma/           # Prisma Client (gitignored)
```

레이어 규칙:

1. **`domain/`은 무의존**. fetch/React/Prisma import 금지. 단위 테스트는 외부 mock 0개로 통과.
2. **`app/api/`는 얇다**. 검증 → DB → 도메인 함수 호출 → envelope 응답. 계산식은 한 줄도 없다.
3. **응답 봉투는 단 하나** — `{ data } | { error: { message, code?, fields? } }`. 클라이언트(`apiFetch`)는 이 모양 외에는 알지 못한다.
4. **에러 코드는 식별자**. 사용자용 한글 메시지와 분리해 클라이언트 분기에 사용한다.

## 4. API 명세

기본 URL: `http://localhost:3000/api`. 모든 응답은 envelope.

| Method | Path                                   | 설명                                                   | 주요 에러 코드                                                                                                  |
| ------ | -------------------------------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| GET    | `/products`                            | 제품 목록 (활동 수 / 마지막 run 포함)                  | `INTERNAL_ERROR`                                                                                                |
| POST   | `/products`                            | 제품 생성 `{name, sku?, functionalUnit, description?}` | `INVALID_JSON`, `VALIDATION_ERROR`, `SKU_CONFLICT`                                                              |
| GET    | `/products/:id`                        | 제품 단건 (활동 + 마지막 run)                          | `INVALID_PRODUCT_ID`, `PRODUCT_NOT_FOUND`                                                                       |
| POST   | `/products/:id/activities`             | 활동 추가                                              | `INVALID_JSON`, `VALIDATION_ERROR`, `PRODUCT_NOT_FOUND`, `FACTOR_NOT_FOUND`, `FACTOR_STAGE_MISMATCH`            |
| PUT    | `/activities/:id`                      | 활동 수정                                              | `INVALID_ACTIVITY_ID`, `VALIDATION_ERROR`, `FACTOR_NOT_FOUND`, `FACTOR_STAGE_MISMATCH`, `ACTIVITY_NOT_FOUND`    |
| DELETE | `/activities/:id`                      | 활동 삭제                                              | `INVALID_ACTIVITY_ID`, `ACTIVITY_NOT_FOUND`                                                                     |
| POST   | `/products/:id/calculate`              | PCF 계산 + `CalculationRun` 저장                       | `PRODUCT_NOT_FOUND`, `NO_ACTIVITIES`, `FACTOR_MISMATCH`, `FACTOR_STAGE_MISMATCH`, `NEGATIVE_AMOUNT`, `INVALID_ALLOCATION`, `INVALID_TRANSPORT` |
| GET    | `/products/:id/calculation-runs`       | 계산 이력 (`?include=items`로 명세 포함)               | `PRODUCT_NOT_FOUND`, `INTERNAL_ERROR`                                                                           |
| GET    | `/emission-factors`                    | 배출계수 목록 (`?stage=PRODUCTION` 필터)               | `INVALID_STAGE`, `INTERNAL_ERROR`                                                                               |
| GET    | `/lifecycle-stages`                    | 단계 메타 (UI 셀렉터)                                  | —                                                                                                               |
| GET    | `/health`                              | 프로세스 + DB 상태 (`SELECT 1` ping)                       | `INTERNAL_ERROR` (503, DB 연결 실패 시)                                                                       |

전체 에러 코드 카탈로그는 [src/lib/api/error-codes.ts](src/lib/api/error-codes.ts)에 단일 정의로 모아 두었다. 라우트는 반드시 `API_ERROR_CODES.X`를 통해 `code` 를 부여한다.

응답 봉투 예:

```jsonc
// 성공
{ "data": { "id": "cmp...", "totalKgCO2e": 142.37, "items": [/* ... */] } }

// 실패
{ "error": { "message": "활동이 참조한 배출계수의 단계가 일치하지 않습니다.",
             "code": "FACTOR_STAGE_MISMATCH" } }

// 검증 실패
{ "error": { "message": "입력값이 올바르지 않습니다.",
             "code": "VALIDATION_ERROR",
             "fields": { "amount": ["0보다 커야 합니다"] } } }
```

## 5. 실행 (Getting Started)

### 5.1 요구사항

- Node.js ≥ 20 (`.nvmrc` 22.18.0 권장)
- npm 10.x
- Docker (Postgres 16)

### 5.2 부트스트랩

```bash
# 1) 의존성
npm ci

# 2) 환경변수
cp .env.example .env       # DATABASE_URL 기본값 사용

# 3) Postgres 기동
docker compose up -d

# 4) 마이그레이션 + 시드 (멱등)
npx prisma migrate dev     # 스키마 적용
npm run db:seed            # 제품 1 + 계수 4 + 활동 30 upsert (CT-045 컴퓨터 화면 시드)

# 5) 개발 서버
npm run dev                # http://localhost:3000
```

### 5.3 빠른 검증 (curl)

```bash
# 제품 목록
curl -s localhost:3000/api/products | jq

# 계산 실행 (CT-045 = 시드된 "컴퓨터 화면")
PID=$(curl -s localhost:3000/api/products | jq -r '.data[] | select(.sku=="CT-045") | .id')
curl -s -X POST localhost:3000/api/products/$PID/calculate | jq
#   → totalKgCO2e: 11072.724 (자료 표 수기 합산과 일치)

# 이력
curl -s "localhost:3000/api/products/$PID/calculation-runs?include=items" | jq

# 헬스체크 (프로세스 + DB ping)
curl -s localhost:3000/api/health | jq
```

## 6. 테스트

```bash
npm test          # vitest run (단위 42건)
npm run test:watch
```

| 영역            | 파일                                      | 커버                                       |
| --------------- | ----------------------------------------- | ------------------------------------------ |
| 계산 엔진       | `src/domain/pcf/__tests__/calculate.test` | 일반/TRANSPORT/배분비/가드 15건            |
| Zod (activity)  | `src/lib/validations/__tests__`           | 단계별 필수/금지 필드 8건                  |
| Zod (product)   | `src/lib/validations/__tests__`           | name/sku/functionalUnit 4건                |
| HTTP 클라이언트 | `src/lib/__tests__/http.test`             | 봉투 풀이 / 에러 전파 / JSON 파싱 실패 3건 |

도메인 테스트는 mock 0개 — `src/domain/`이 외부 의존을 갖지 않기에 가능한 구조다.

## 7. 설계 결정 & Trade-off

| 결정                                          | 대안                  | 채택 이유                                                                          |
| --------------------------------------------- | --------------------- | ---------------------------------------------------------------------------------- |
| `domain/`과 `app/api/` 강제 분리              | 라우트에 계산식 인라인 | 도메인 단위 테스트 가능 + 백오피스/CLI에서 재사용 여지                              |
| envelope `{data｜error}` 단일화               | 200/4xx body 자유     | 클라이언트 단일 분기, 에러 코드 표면화                                              |
| `CalculationRun.snapshotJson` 박제            | run에 factorId만 저장 | 계수 갱신 후에도 과거 PCF 재현 가능 (감사 추적성)                                    |
| `EmissionFactor @@unique([name, stageCode])`  | 자유 중복             | 시드/재실행 멱등성 + 같은 단계 내 모호성 제거                                       |
| Prisma 7 driver-adapter (`@prisma/adapter-pg`) | 기본 엔진             | 서버리스/엣지 친화 + 추후 다른 어댑터 교체 용이                                     |
| TRANSPORT `amount=0` 허용                     | 항상 >0               | `ton-km`은 `weight×distance` 파생, `amount` 미사용                                  |
| 한글 메시지 + 영문 `code`                     | 한쪽 단일             | UX(한글) ↔ 식별자(영문) 책임 분리                                                  |

알려진 한계: ① 다중 사용자/권한 없음 ② 통화/환산/검증 워크플로 없음 ③ 계산 시점 동시성은 단일 트랜잭션 미적용.

## 8. 비-목표 (Non-goals)

- 조직 단위(Scope 1·2·3) 인벤토리 리포트
- 인증급 LCI/LCA 데이터셋 연동 (ecoinvent, GaBi 등)
- 인증·공시 워크플로 (검증인·서명·감사 로그)
- 인증(SSO/RBAC), 멀티 테넌시
- 배출계수 출처 메타데이터 (year/region/method) — 현 스키마에는 `source` 텍스트만 있음
- 실시간 협업, 알림, 워크플로 자동화

이 항목들은 의도적으로 잘라낸 범위이며, 데이터 모델을 단순화해 평가 시연 동선을 분명히 하기 위한 결정이다.
