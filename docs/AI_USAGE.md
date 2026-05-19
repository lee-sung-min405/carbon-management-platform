# AI_USAGE.md

> 본 문서는 하나루프 개발자 채용 과제의 AI 사용 정책 — **"무엇을 했고 / 어떤 Prompt 를 썼고 / 왜 그렇게 결정했는가"** 3원칙 — 을 따라 본 프로젝트(Carbon Management Platform) 진행 중 AI 도구를 어디까지 활용했는지 사실대로 기록한 문서다.

---

## 1. AI 도구 사용 원칙

- AI 는 **요구사항 분석, 설계 검토, 도메인 개념 정리, 코드 초안 생성, 리팩터링 후보 도출, README 구조화** 등 사고를 가속하는 보조 도구로 사용했다.
- 최종 구현 여부는 **과제 요구사항 · 실제 백엔드 응답 shape · TypeScript 타입 · Vitest 결과 · 브라우저 실행 결과** 를 기준으로 본인이 직접 판단했다.
- AI 가 제안한 항목 중 과제 범위를 벗어나는 기능(로그인/RBAC, 멀티 테넌시, AI 자동 리포트, 감축 시나리오 등)은 의식적으로 제외했다.
- 샘플 배출계수는 공식 LCI 데이터가 아니라 **DEMO ONLY** 임을 시드(`isDemo: true`)와 UI 배너로 명시했다.
- AI 출력물은 그대로 복사하지 않고 본 프로젝트의 파일 구조 · 실제 API 응답 · Prisma 스키마에 맞게 본인이 다시 작성했다.

---

## 2. AI 사용 요약

실제 과제 진행에 사용한 AI 도구는 **ChatGPT · Figma AI · GitHub Copilot Chat** 3종이다. 단계별 용도는 아래 표대로 분리해 기록한다.

| 구분 | 사용 목적 | 사용 도구 | 사용 이유 | 최종 반영 여부 |
| --- | --- | --- | --- | --- |
| 요구사항 분석 | 과제 안내 문서·이미지에서 P0/P1/P2 항목 도출 | ChatGPT | 평가 기준(도메인 25 / 설계 30 / UX 25 / 논리 20)에 가중치 큰 항목을 먼저 식별 | 일부 반영 (우선순위는 본인이 재배열) |
| PCF 도메인 이해 | Scope 1·2·3 와 생애주기 5단계 차이 정리 | ChatGPT | UI 에서 두 축을 혼동하지 않도록 차트를 분리하기 위함 | 반영 (생애주기 단계별 차트 + Scope 1/2/3 차트 분리 구현) |
| 데이터 모델 설계 | Product / EmissionFactor / ProductActivity / CalculationRun / CalculationItem 분리안 검토 | ChatGPT + GitHub Copilot Chat | 계산 시점 박제 · 단일 소스 stages.ts 패턴 검토 | 반영 (`prisma/schema.prisma` 와 실제 라우트에 맞게 본인이 수정) |
| 계산 로직 설계 | 일반 활동 / TRANSPORT ton-km 공식 분기 검토 | ChatGPT + GitHub Copilot Chat | 단위 차원(kg·km·ton-km)이 일관되는지 다회 검토 필요 | 반영 (`src/domain/pcf/calculate.ts` — 단위 차원 본인 검증) |
| UI 프로토타입 | 제품 목록 / 제품 상세 대시보드 초기 레이아웃 시안 | Figma AI | 화면 구조와 카드/차트 배치 후보를 빠르게 시각화 | 부분 반영 (시안 그대로 사용하지 않고 API 응답 shape · 단위 표시 · DEMO ONLY 고지 · 5단계/Scope 표시 요구사항에 맞게 직접 수정) |
| 실제 제품 벤치마킹 | 외부 PCF/LCA 솔루션의 공통 UX 패턴 정리 | ChatGPT + 웹 검색 | 총량 카드 · 단계별 차트 · 계산 이력의 보편성 확인 | 반영 (Sankey · 감축 시나리오 등은 제외) |
| 코드 구현 보조 | 컴포넌트/훅 초안, 타입 시그니처 후보, 리팩터링 후보 | GitHub Copilot Chat | 반복 보일러플레이트 단축 | 부분 반영 (모든 코드는 본인이 읽고 수정 후 채택) |
| 테스트 케이스 작성 | 도메인 함수 단위 테스트 케이스 후보 도출 | GitHub Copilot Chat + ChatGPT | 누락 분기(amount=0, allocationRatio 경계, TRANSPORT 필수값) 점검 | 반영 (`vitest` 53/53 통과) |
| README/문서 정리 | 8섹션 구조 · trade-off 표 초안 · AI_USAGE 초안 | ChatGPT | 평가 4축을 본문 순서로 직결 | 반영 (실행 명령 · 경로 · 응답은 본인 검증 후 수정) |

---

## 3. 사용한 Prompt 와 의도

> 아래 표의 각 단계마다 **Prompt 요지 / AI 에게 요청한 것 / 사용 이유 / 본인이 검증한 부분 / 최종 반영** 5개 컬럼을 통일해 기록한다. 각 단계 아래에 실제 사용한 Prompt 예시를 첨부한다.

### 3.1 요구사항 분석

| 단계 | Prompt 요약 | AI 에게 요청한 것 | 사용 이유 | 내가 검증한 부분 | 최종 반영 |
| --- | --- | --- | --- | --- | --- |
| 요구사항 분석 | 과제 안내에서 반드시 구현할 항목과 제외할 항목 구분 | P0/P1/P2 후보 분류 | 2~3일 작업 시간 한도 내에서 평가 가중치가 큰 항목을 먼저 배치 | 과제 첨부 이미지 3종(과제 배경 · 원본 활동 데이터 · 자가 체크리스트) 과 1:1 대조 | 반영 (단, 우선순위 P0/P1/P2 는 본인이 재배열) |

**Prompt 예시**
> "하나루프 개발자 채용 과제 설명을 기준으로 PCF 계산, 전 과정 데이터 시각화, UX, README, AI 사용 내역 작성 측면에서 반드시 구현해야 할 항목과 제외해야 할 항목을 구분해줘."

설명:
- 과제의 본질이 "탄소 SaaS 전체 구현" 이 아니라 **"PCF 계산 로직과 시각화 대시보드 구현"** 임을 정리하는 데 사용했다.
- AI 가 제안한 항목 중 로그인 · RBAC · 멀티테넌트는 과제 범위 밖이므로 제외했다.
- 최종 우선순위는 본인이 P0/P1/P2 로 재정리했다.

---

### 3.2 PCF 도메인 이해

| 단계 | Prompt 요약 | AI 에게 요청한 것 | 사용 이유 | 내가 검증한 부분 | 최종 반영 |
| --- | --- | --- | --- | --- | --- |
| PCF 도메인 이해 | Scope 1·2·3 와 생애주기 5단계 차이 설명 | 두 축의 개념 정리와 UI 표현 시 주의점 | UI 에서 두 축을 혼동하지 않게 분리 설계 | 단계 코드(`RAW_MATERIAL / PRODUCTION / TRANSPORT / USE / END_OF_LIFE`) 가 실제 `src/domain/pcf/stages.ts` 와 시드 데이터에 일치하는지 확인 | 반영 (생애주기 단계별 차트 + Scope 1/2/3 차트 분리 구현) |

**Prompt 예시**
> "PCF(Product Carbon Footprint), GHG Scope 1/2/3, 원자재·생산·운송·사용·폐기 생애주기 단계의 차이를 개발 과제 관점에서 설명해줘."

설명:
- PCF 생애주기 단계와 GHG Scope 는 서로 다른 분류 축이므로, UI 에서는 생애주기 단계별 차트와 Scope 1/2/3 차트를 분리해 표현했다. 생애주기 단계는 원자재·생산·운송·사용·폐기 5단계로, Scope 는 직접배출(Scope 1) · 전력/열 간접배출(Scope 2) · 기타 간접배출(Scope 3) 로 구분했다.
- 5단계 생애주기는 값이 0 이어도 항상 노출하도록 `src/domain/pcf/summarize.ts` 에서 0-fill 처리.
- 생산 단계 코드는 실제 enum 값과 동일한 `PRODUCTION` 으로 통일했다(`MANUFACTURING` 아님).

---

### 3.3 데이터 모델 설계

| 단계 | Prompt 요약 | AI 에게 요청한 것 | 사용 이유 | 내가 검증한 부분 | 최종 반영 |
| --- | --- | --- | --- | --- | --- |
| 데이터 모델 설계 | Product / EmissionFactor / ProductActivity / CalculationRun / CalculationItem 분리 검토 | 각 엔티티의 책임과 unique 제약 후보 | 계산 시점 박제 · 단계 코드 단일 소스 패턴 결정 | 실제 `prisma/schema.prisma` 와 라우트 파일, `npm run db:seed` 멱등성 검증 | 반영 (snapshotJson 박제 채택, EmissionFactor 별도 version 테이블은 trade-off 후 제외) |

**Prompt 예시**
> "제품별 PCF 계산 대시보드를 만들기 위해 Product, LifeCycleStage, EmissionFactor, ProductActivity, CalculationRun, CalculationItem 모델을 어떻게 나누면 좋은지 설계해줘."

설명:
- AI 가 제안한 모델을 그대로 사용하지 않고, 실제 라우트와 Prisma 스키마에 맞게 본인이 조정했다.
- 계산 결과는 `CalculationRun` + `CalculationItem` 으로 분리해 계산 시점의 결과를 보존하도록 했다.
- 배출계수는 `source / unit / value / isDemo` 컬럼으로 **DEMO ONLY** 임을 명확히 했다.
- `EmissionFactor` 의 별도 version 테이블은 과제 안내가 권장한 "버전 이력" 요구의 대안으로 `CalculationRun.snapshotJson` 박제를 채택했다(README §7 trade-off 표 참조).

---

### 3.4 PCF 계산 로직

| 단계 | Prompt 요약 | AI 에게 요청한 것 | 사용 이유 | 내가 검증한 부분 | 최종 반영 |
| --- | --- | --- | --- | --- | --- |
| PCF 계산 로직 | 일반 활동 / TRANSPORT ton-km 공식 분기 설계 | TypeScript 순수 함수 시그니처 후보 | UI 와 분리된 도메인 계층에서 테스트 가능하도록 | `calculate.test.ts` 19건 · `summarize.test.ts` 3건이 mock 0개로 통과하는지 확인 | 반영 (`src/domain/pcf/calculate.ts`) |

**Prompt 예시**
> "활동량 × 배출계수 × 할당비율 기반 PCF 계산 로직과 운송 ton-km 계산 로직을 TypeScript 순수 함수로 설계해줘."

채택한 공식:
- 일반 활동 배출량 = `amount × factor.value × allocationRatio`
- ton-km = `(weightKg / 1000) × distanceKm`
- 운송 활동 배출량 = `ton-km × factor.value × allocationRatio`
- 총 PCF = 모든 활동별 배출량 합계

설명:
- 계산 로직을 UI 내부에 두지 않고 `src/domain/pcf/` 하위 순수 함수로 분리 — React/Prisma/fetch import 금지 규칙 명시.
- TRANSPORT 단계는 `weightKg` 와 `distanceKm` 을 이용해 ton-km 로 환산.
- AI 가 제안한 공식의 단위 차원(`kg × km / 1000 = ton-km`)이 맞는지 종이로 직접 계산해 검증했다.
- `__tests__/calculate.test.ts` 19건 + `summarize.test.ts` 3건 으로 회귀 보호.

---

### 3.5 UI/UX 설계

| 단계 | Prompt 요약 | AI 에게 요청한 것 | 사용 이유 | 내가 검증한 부분 | 최종 반영 |
| --- | --- | --- | --- | --- | --- |
| UI/UX 설계 | 제품 목록 / 활동 입력 / 총 PCF / 단계별 차트 / Scope 차트 / Top 배출원 테이블 화면 구조 | 컴포넌트 분할 후보와 화면 흐름 | 비전문가 평가자가 5단계로 데모를 완주할 수 있도록 동선 단축 | 단위(`kgCO2e / kg / kWh / ton-km / %`) 표시 · DEMO ONLY 배너 · Empty/Loading/Error 상태 모두 화면에서 확인 | 부분 반영 (제품 목록 + 제품 상세 2 페이지 구조, 탭 3종으로 압축) |
| UI 프로토타입 | 제품 목록 / 제품 상세 대시보드 초기 시안 | 화면 레이아웃과 카드/차트 배치 후보 | 빠른 시각적 검토 | 실제 API 응답 shape 과 일치하는지 · 단위 표기 · DEMO ONLY 고지 · 5단계/Scope 표시 요구사항 충족 여부 | 부분 반영 (시안 그대로 사용하지 않고 직접 컴포넌트로 재작성) |

**Prompt 예시 (ChatGPT)**
> "비전문가 실무자와 경영자가 PCF 계산 결과를 이해할 수 있도록 제품 목록, 활동 입력, 총 PCF, 생애주기 단계별 차트, Scope 차트, Top 배출원 테이블을 포함한 화면 구조를 설계해줘."

**Prompt 예시 (Figma AI)**
> "제품 PCF 대시보드 — 좌측 제품 목록, 우측 상세(총 PCF 카드 · 단계별 막대 · Scope 도넛 · Top 배출원 테이블) 구조의 SaaS 대시보드 시안을 생성해줘."

설명:
- AI(ChatGPT) 를 통해 초기 컴포넌트 목록만 받고, 화면은 **제품 목록 + 제품 상세(탭 3종: activities/runs/csv)** 로 압축했다.
- **Figma AI** 는 제품 목록과 제품 상세 대시보드의 초기 프로토타입을 빠르게 확인하기 위해 사용했다. 다만 생성된 화면을 그대로 구현하지 않고, 실제 API 응답 shape · 컴포넌트 구조 · 단위 표시 · DEMO ONLY 고지 · 5단계 생애주기/Scope 표시 요구사항에 맞게 직접 수정했다.
- 단위 표시 · DEMO ONLY 배너 · 오류 상태 · Empty/Loading State 는 본인이 직접 반영.

---

### 3.6 실제 제품 벤치마킹

| 단계 | Prompt 요약 | AI 에게 요청한 것 | 사용 이유 | 내가 검증한 부분 | 최종 반영 |
| --- | --- | --- | --- | --- | --- |
| 실제 제품 벤치마킹 | Ecochain / CO2 AI / One Click LCA / SimaPro / Watershed 등 공통 UX 패턴 | 화면 구성·차트 유형의 공통점/차이점 정리 | 산업 표준 UX 와 본 과제 범위의 교집합 식별 | 각 제품의 공식 자료(스크린샷·블로그) 와 본인이 교차 확인 | 부분 반영 (총량 카드 · 단계별 차트 · 계산 이력만 채택, Sankey/감축 시나리오/공급사 포털 제외) |

**Prompt 예시**
> "Ecochain, CO2 AI, ClimatePartner, One Click LCA, SimaPro, Watershed, Sweep 등 실제 탄소관리/PCF 제품들이 어떤 차트와 UX 를 사용하는지 분석하고, 내 과제 프로젝트에 적용할 수 있는 것과 제외할 것을 구분해줘."

설명:
- 공통 패턴(총량 카드 · 단계별 차트 · Scope 구분 · Hotspot 분석 · 배출계수 출처 · 계산 이력) 중 본 과제와 직결되는 것만 채택했다.
- 감축 시나리오 · 공급사 포털 · AI 배출계수 자동 매칭 · 복잡한 인증 워크플로는 과제 범위를 벗어나므로 제외.
- 최종 UI 핵심: `TotalPcfCard / StageBarChart(div 기반) / StageDonut(Recharts) / TopEmittersTable / CalculationBasisNote` 중심.

**참고한 제품 목록 (공식 사이트 · 공개 블로그 · 데모 영상 기준)**

| 제품 | 본 과제에 참고한 부분 | 의식적으로 제외한 부분 |
| --- | --- | --- |
| Ecochain Mobius / Helix | 총 PCF 카드 + 생애주기 단계별 막대 분해, 활동량 입력 폼 구성 | 다중 제품 비교 보드, 시나리오 모델링 |
| CO2 AI (구 Carbon Maps) | Top 배출원 테이블, 배출계수 출처 컬럼 노출 | AI 자동 분류, 공급사 포털 |
| One Click LCA | 활동 항목별 배출계수 매핑 UX, 계산 결과 박제 개념 | 인증(EPD) 워크플로, 대규모 자재 라이브러리 |
| SimaPro | 생애주기 단계 5분류와 단위 표기 규약 | 데스크톱 LCA 모델링 전 영역 |
| Watershed | 대시보드의 단위·DEMO/실측 구분 표기 톤 | 금융 데이터·감축 목표 트래킹 |
| ClimatePartner | 결과 신뢰도 고지(DEMO/공식 데이터 구분) 문구 톤 | 오프셋 마켓플레이스 |
| Sweep | Empty/Loading/Error 상태와 안내 문구 패턴 | 멀티 테넌시 · RBAC |

> 위 제품들은 평가자에게 "실제 PCF/LCA 제품의 어떤 UX 가 산업 표준인지" 를 보여주기 위한 외부 참조이며, 본 과제는 그 중 핵심 5요소(총량 카드 · 단계별 차트 · Scope 차트 · Top 배출원 테이블 · 계산 이력 박제) 만 채택했다.

---

### 3.7 코드 구현 보조

| 단계 | Prompt 요약 | AI 에게 요청한 것 | 사용 이유 | 내가 검증한 부분 | 최종 반영 |
| --- | --- | --- | --- | --- | --- |
| 코드 구현 보조 | 기존 컴포넌트 개선 · 훅 분리 후보 | 컴포넌트가 직접 fetch 하지 않고 props 기반으로 동작하도록 리팩터 | 컴포넌트 책임 분리 (데이터 로딩은 페이지 레벨로 끌어올림) | 실제 API 응답 shape · TypeScript 타입 · 빌드 통과 여부 | 부분 반영 (AI 제안 중 존재하지 않는 필드를 가정한 코드는 모두 제거) |

**Prompt 예시**
> "현재 Next.js 프로젝트 구조에서 TotalPcfCard 에 최대 배출 단계, 최대 배출 활동, 활동 수, 배출계수 수를 표시하도록 기존 컴포넌트를 개선해줘. 단, 컴포넌트에서 직접 fetch 하지 말고 props 기반으로 구현해줘."

설명:
- AI 를 코드 초안 생성과 리팩터링 후보 도출에 사용했다.
- 반영 전 TypeScript 타입 · API 응답 shape · 컴포넌트 책임 분리를 본인이 확인.
- AI 가 현재 프로젝트에 없는 API 나 필드를 가정한 부분(예: `factor.scope`, `product.organizationId`)은 반영하지 않았다.

---

### 3.8 테스트 케이스 작성

| 단계 | Prompt 요약 | AI 에게 요청한 것 | 사용 이유 | 내가 검증한 부분 | 최종 반영 |
| --- | --- | --- | --- | --- | --- |
| 테스트 케이스 작성 | 도메인 함수 단위 테스트 분기 후보 도출 | 정상 / 경계 / 실패 케이스 분류 | 누락 분기 점검 (amount=0, allocationRatio 경계, TRANSPORT 필수값) | 실제 계산 결과와 수기 계산값 비교 후 expect 값 수정 | 반영 (vitest 53/53 통과) |

**Prompt 예시**
> "PCF 계산 함수에 대해 원자재 계산, 전력 계산, 운송 ton-km 계산, 할당비율 계산, 음수 입력, 운송 필수값 누락 케이스를 Vitest 테스트로 작성해줘."

설명:
- AI 로 테스트 케이스 초안을 받고, 실제 계산 결과와 수기 계산값을 비교해 수정했다.
- 테스트 범위는 **도메인 계산 + Zod 검증 + HTTP envelope** 에 집중했고, UI 스냅샷 테스트는 우선순위에서 제외했다.

---

### 3.9 README / 문서 작성

| 단계 | Prompt 요약 | AI 에게 요청한 것 | 사용 이유 | 내가 검증한 부분 | 최종 반영 |
| --- | --- | --- | --- | --- | --- |
| README/문서 작성 | 평가자가 빠르게 훑을 수 있는 8섹션 구조 초안 | 섹션 순서와 trade-off 표 후보 | 평가 4축(도메인 25 / 설계 30 / UX 25 / 논리 20)을 본문 순서로 직결 | 실행 명령 · 파일 경로 · 실제 API · 커밋 히스토리 모두 본인이 1:1 확인 | 반영 (일반론 문장은 제거하고 본 프로젝트에 실제 존재하는 내용만 남김) |

**Prompt 예시**
> "하나루프 과제 제출용 README 에 프로젝트 개요, 실행 방법, 기술 스택, PCF 계산 방식, 데이터 모델, 설계 결정, trade-off, AI 사용 내역을 평가자가 보기 좋게 정리해줘."

설명:
- AI 는 README 초안 구조화에 사용했다.
- 실행 명령(`npm ci / dev / build / start`), 실제 파일 경로, 실제 API 응답, 작업 시간, 커밋 히스토리는 본인이 직접 확인해서 수정했다.
- AI 가 만든 일반론(예: "엔터프라이즈 등급의 확장성") 같은 검증 불가 문장은 제거했다.

---

## 4. AI 제안 중 반영하지 않은 내용

| AI 제안 | 반영하지 않은 이유 | 최종 결정 |
| --- | --- | --- |
| 로그인 / 회원가입 추가 | 과제 범위 초과 · 평가 기준과 직접 관련 낮음 | 제외 |
| RBAC 권한 관리 | 과제 범위 초과 · 단일 사용자 가정 | 제외 (비-목표 §8 명시) |
| 멀티 테넌트 구조 | 과제 범위 초과 · Prisma 스키마 복잡도 급증 | 제외 (비-목표 §8 명시) |
| AI 자동 리포트 생성 | 평가 기준의 "논리적 설명 20%" 는 본인 설명이 핵심 — AI 산출물 의존은 본 문서의 취지에 반함 | 제외 |
| 감축 시나리오 모델링 | 과제 범위 초과 · 2~3일 작업 시간 대비 리스크 | 제외 |
| Sankey Chart | 단계 5개 + 활동 30행 규모에서는 단순 막대/도넛이 더 정확한 인지 — UX 복잡도 대비 가치 낮음 | 제외 |
| 공급사 포털 | 과제 범위 초과 · 별도 도메인 | 제외 |
| "공식 배출계수" 처럼 보이는 문구 | 시드 데이터는 DEMO ONLY 이며 공식 데이터셋(ecoinvent 등) 라이선스 미보유 | 제외 (UI 에 DEMO ONLY 배너 + 시드에 `isDemo: true`) |
| tRPC 도입 | Next route handler + envelope `{data\|error}` 로 충분 — 의존성 무게 회피 | 제외 |
| Zustand / Jotai 등 클라이언트 상태 라이브러리 | 서버 상태는 **SWR** (`swr@^2.4.1`, `src/lib/api/hooks.ts` · `src/app/providers.tsx`) 로, UI 상태는 URL 쿼리(`?tab=`) 와 `useState` 로 충분 — TanStack Query 도 미도입 | 제외 |
| `framer-motion` 차트 애니메이션 | 데이터 정확성 전달이 1순위 — 인지 부담 증가 위험 | 제외 |

---

## 5. AI 결과 검증 방식

- **요구사항 검증**: 과제 첨부 이미지 3종과 본인이 만든 체크리스트로 P0 항목 재확인.
- **코드 검증 (실측)**: `npx tsc --noEmit` · `npm run lint` · `npm test` (= `vitest run`) 를 본 문서 작성 시점에 실제 실행해 통과 확인.
- **단위 검증**: `kgCO2e / kg / kWh / ton-km / %` 표기가 모든 UI 와 응답에서 누락 없는지 본인이 화면 단위로 확인.
- **UI 검증**: 제품 목록 → 상세 → 활동 입력 → 계산 실행 → 계산 이력 → CSV 임포트 흐름을 브라우저에서 실제 수행.
- **데이터 검증**: 샘플 배출계수는 시드(`isDemo: true`) + UI DEMO ONLY 배너로 표시.
- **문서 검증**: README 의 실행 방법 · AI 사용 내역 · 설계 결정 · trade-off 가 실제 구현과 일치하는지 본인이 1:1 대조.

> 아래 표에는 **본 문서 작성 시점에 실제 실행해 결과를 확인한 항목만** 결과 열에 구체값을 적었다.

| 검증 항목 | 검증 방법 | 결과 |
| --- | --- | --- |
| 도메인 + HTTP + 검증 단위 테스트 | `npm test` (= `vitest run`) | 6 파일 / **53 / 53 통과** (calculate 19 · activity 13 · activity-csv 11 · product 4 · http 3 · summarize 3) |
| 타입 안전성 | `npx tsc --noEmit` | 에러 0 |
| 린트 | `npm run lint` | `✔ No ESLint warnings or errors` |
| 프로덕션 빌드 | `npm run build` | `✓ Compiled successfully` · 9 라우트 생성 · 공유 First Load JS 87.3 kB · 메인 페이지 First Load JS 160 kB |
| 시드 멱등성 | `npm run db:seed` (tsx + .env, Postgres 연결) | `Seed completed (CT-045)` · factors 4 · activities 30 · 기대 총합 `11072.724 kgCO2e` (`prisma/seed.ts` 자체 출력값과 일치) |
| 단위 표기 | UI 화면 · API 응답 본인 확인 | 누락 없음 |
| 검증 응답 형태 | 의도적 422 유발 → 폼 인라인 표시 확인 | `aria-invalid` 토글 + fields 매핑 동작 |
| DEMO ONLY 표기 | UI 배너 · 시드 데이터 `isDemo: true` | 명시 |
| README ↔ 구현 | 실행 명령 · 파일 경로 · 응답 본문 1:1 대조 | 일치 |

---

## 6. AI 사용에 대한 최종 책임 범위

- AI 는 설계 검토와 코드 초안 생성을 보조했지만, **최종 구현 여부와 구조 결정은 본인이 직접 판단**했다.
- AI 가 제안한 코드를 그대로 신뢰하지 않고 프로젝트 타입 · API 응답 shape · 테스트 결과를 기준으로 검증했다.
- AI 가 잘못 가정한 API · 필드 · 화면은 반영하지 않았다(예: 존재하지 않는 `factor.scope` 필드를 참조한 코드, Zod v3 와 v4 의 메서드 시그니처 혼동, Tailwind v3 의 `tailwind.config.ts` 패턴 등).
- 최종 제출물의 동작 · 코드 품질 · 설명 책임은 모두 본인에게 있다.

---

## 7. 최종 정리

> "AI 도구는 세 종류를 단계별 용도를 분리해서 사용했습니다. **ChatGPT** 로 과제 요구사항 분류 · PCF 도메인 개념 검토 · 실제 PCF/LCA 제품 벤치마킹 · README 와 AI_USAGE 초안 작성을 했고, **Figma AI** 로 제품 목록과 제품 상세 대시보드의 초기 레이아웃 시안을 빠르게 시각화했으며, **GitHub Copilot Chat** 으로 컴포넌트 초안 · 리팩터링 후보 · 테스트 케이스 분기 후보를 받았습니다. 다만 최종 구현은 과제 평가 기준과 실제 백엔드 응답 shape, TypeScript 타입, Vitest 결과를 기준으로 직접 판단했습니다. 특히 로그인·RBAC·멀티테넌트·감축 시나리오처럼 AI 가 흔히 제안하는 일반 SaaS 기능은 이번 과제의 핵심이 아니라고 보고 제외했습니다. 계산 로직은 `src/domain/pcf/` 순수 함수로 분리해 vitest 53건으로 검증했고, 생애주기 단계별 차트와 Scope 1/2/3 차트는 서로 다른 분류 축이므로 UI 에서 분리해 표현했습니다. 샘플 배출계수는 공식 데이터가 아니라 DEMO ONLY 임을 시드와 UI 배너로 명시했습니다. 정리하면, AI 는 사고를 가속하는 보조 도구로 썼고, 도메인 결정·검증·문서화는 본인이 책임졌습니다."

