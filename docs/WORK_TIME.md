# 작업 시간 기록 (Work Time Log)

> **하나루프 개발자 채용 과제** — PCF 탄소관리플랫폼  
> 본 문서는 [git-commits.json](./git-commits.json) (**49개 커밋**, `main` 브랜치, `2026-05-19` 추출)을 근거로, **과제 평가 기준·자가 체크리스트·과제 자료 요구**에 맞춰 작업 시간을 정리한 기록이다.  
> README 요약은 [README.md §작업 시간](../README.md) (추가 예정 시 상호 링크)과 함께 보면 된다.

---

## 1. 총괄

| 항목 | 내용 |
| ---- | ---- |
| **캘린더 기간** | 2026-05-17 ~ 2026-05-20 (약 **2.1일**) |
| **커밋 수** | 49건 (Initial commit 포함) |
| **총 순작업 시간** | **18~20시간** (아래 §2 세션 합산) |
| **과제 권장 기간** | 2~3일 (참고) — 본인은 **집중 개발 2일 + 마무리 반나절**에 가깝게 수행 |

### 시간 산정 방법

- 커밋 **타임스탬프 간격 4시간 초과**를 작업 세션 경계로 둠.
- 세션 **범위(span)** 는 첫·마지막 커밋 시각 차이이며, 설계·디버깅·미커밋 작업을 반영해 **순작업 추정치**를 별도 기재했다.
- 커밋 메시지·본문은 `git-commits.json`과 동일하다.

---

## 2. 작업 세션 (시간순)

| 세션 | 날짜 | 커밋 span | 커밋 수 | 순작업 시간 | 주요 내용 |
| ---- | ---------- | --------- | ------- | ----------- | --------- |
| **S1** | 2026-05-17 ~ 2026-05-18 | 약 2.0h | 10 | **2.5h** | 프로젝트·Docker·Prisma 스캐폴딩, PCF 도메인 타입·계산 엔진·단위 테스트, 초기 API·스키마 |
| **S2** | 2026-05-18 | 약 5.2h | 25 | **7.0h** | REST API 완성, GHG Scope·버전, CT-045 시드, CSV bulk, 에러 코드·헬스·트랜잭션, README 1차 |
| **S3** | 2026-05-19 | 약 0.4h* | 5 | **4.0h** | 프론트 대시보드·활동 폼·CSV 탭·접근성 (*커밋은 촘촘하나 구현량 대비 실작업 더 김) |
| **S4** | 2026-05-19 ~ 2026-05-20 | 약 1.8h | 9 | **2.5h** | AI_USAGE·ERD·xlsx·OpenAPI 문서, CSV 헤더 수정, RHF forwardRef, ARCHITECTURE |
| | | | **49** | **18~20h** | |

---

## 3. 평가 기준 4축별 작업 매핑

과제 안내 **평가 기준** 가중치에 맞춰, 해당 축에 기여한 커밋·추정 시간·산출물을 묶었다.


### 3.1 도메인 이해 (25%)

**목표:** PCF·GHG Scope가 코드와 설명에 반영되었는가.

| 소요 시간 | **5.5h** |
| --------- | ----------- |

| 대응 요구 | 구현·커밋 근거 |
| --------- | -------------- |
| 생애주기 5단계 | `fd55bc2` stages.ts, Prisma `StageCode` |
| PCF 계산식 | `c8ff216` calculate.ts, `b08fb82` 단위 테스트 |
| TRANSPORT ton-km / 직접입력 | `7113fa7` amount=0, `5017ff7` 직접 ton-km 모드 |
| GHG Scope 1/2/3 | `dc1e599` scope·version, `summarize` Scope 집계 |
| 과제 자료 CT-045 30행·4계수 | `2ee1ab5` 시드, `7544236` CSV 파서, `5b4249e` 헤더 `일자(원본)` |
| 수치 검증 11,072.724 kgCO2e | 시드·calculate E2E (커밋 본문·README §1) |

**대표 커밋:** `c8ff216`, `dc1e599`, `2ee1ab5`, `7544236`, `5017ff7`

---


### 3.2 시스템 설계 (30%)

**목표:** API·모듈 구조·확장·재사용·안정성.

| 소요 시간 | **7.5h** |
| --------- | ----------- |

| 대응 요구 | 구현·커밋 근거 |
| --------- | -------------- |
| TypeScript + Next.js | `6edc239` 초기 설정 |
| PostgreSQL + Docker | `f8ccd1c` compose, `3b900ff` Prisma |
| 얇은 API + domain 분리 | `2289ed6`~`2beef00` 라우트, `75c9369` handlers, `1d5427c` adapters |
| envelope·에러 코드 | `e0ef7a7` apiFetch, `19b260c` error-codes |
| 계산 트랜잭션·스냅샷 | `2dd4ad3`, `CalculationRun.snapshotJson` |
| 배출계수 별도 테이블·버전 | `dc1e599`, `313f648` (validFrom/To 제거·version 유지) |
| OpenAPI | `f1bcb1d` 안내, `docs/openapi.yaml` |
| 상세 설계 문서 | `5718fc5` ARCHITECTURE.md |

**대표 커밋:** `217b3b7`, `19b260c`, `2dd4ad3`, `7544236`, `23e9bce`, `5718fc5`

---


### 3.3 사용자 경험 (25%)

**목표:** 비전문가도 입력·결과 해석이 가능한가.

| 소요 시간 | **5.5h** |
| --------- | ----------- |

| 대응 요구 | 구현·커밋 근거 |
| --------- | -------------- |
| 인터랙티브 대시보드 | `7153dfa` 차트 4종·KPI, `b0714dc` 상세·계산 CTA |
| 제품·활동 입력 | `dedfcf4` ProductForm, `bc86b1b` ActivityForm·TransportFields |
| 오류 메시지(입력 화면) | Zod 한글, `6ad3848` error-messages, `9bd018d` forwardRef 수정 |
| 단위·숫자 표기 | `935a018` formatKgCO2e, `format.ts` |
| CSV/xlsx 임포트 UI | `0a3d7b5` BulkImportPanel, `23e9bce` xlsx |
| 4상태 UI | `004b807` Empty/Loading/Error |
| 접근성 | `f41669c` skip-link, 차트 sr-only `<table>` |
| 데모 흐름 문서화 | `f41669c` README §5.4 |

**대표 커밋:** `935a018`, `7153dfa`, `bc86b1b`, `0a3d7b5`, `f41669c`, `9bd018d`

**미완 (체크리스트):** UI **영상·스크린샷** 파일은 아직 `docs/screenshots/`에 미첨부 (§6 참고).

---


### 3.4 논리적 설명 (20%)

**목표:** 설계 이유·trade-off·AI 사용을 말할 수 있는가.

| 소요 시간 | **3.5h** |
| --------- | ----------- |

| 대응 요구 | 구현·커밋 근거 |
| --------- | -------------- |
| README 시스템·설계 | `76591f9` 8섹션, `09c6b09` ERD, `bb6c2ab` 실행 안내 |
| Trade-off 표 | README §7 (domain 분리, snapshotJson, envelope 등) |
| AI 3원칙 기록 | `583b197` AI_USAGE.md, README §9 |
| 벤치마킹(타 시스템) | AI_USAGE §3.6 (Ecochain 등 7종 — **보너스** 대응) |
| 발표용 데모 스크립트 | README §5.3 curl, §5.4 UI 5단계 |

**대표 커밋:** `76591f9`, `583b197`, `09c6b09`, `5718fc5`

---

## 4. 자가 체크리스트 대응표

과제 **「제출 전 자가 체크리스트」** 항목별로, 충족 여부·관련 작업 시간·근거 커밋을 정리했다.

### 4.1 필수

| 체크 항목 | 충족 | 추정 시간 | 근거 (커밋 / 산출물) |
| --------- | ---- | --------- | ------------------- |
| PCF 결과 시각화·의미 전달 | ✅ | 4.0h | `7153dfa`, `f41669c` — KPI·Scope/단계 차트·이력 |
| 수치 정확·단위 표기 | ✅ | 2.0h | `c8ff216`, `2ee1ab5`, `935a018` — 11,072.724 kgCO2e |
| 잘못된 입력 시 오류 메시지 | ✅ | 2.0h | `bc86b1b`, `dedfcf4`, `001e6d7`, `9bd018d` |
| README 로컬 실행 (5단계 이하) | △ | 1.0h | §5.2 **6단계** — 내용은 충분, 문구만 1단계 초과 |
| `yarn start` 오류 없이 | △ | — | `yarn build && yarn start` 안내 (`bb6c2ab`), 검증은 npm 기준 |
| README AI 사용 기록 | ✅ | 1.5h | `583b197`, README §9 |
| README 시스템·설계 | ✅ | 2.5h | README §1~3·7, `5718fc5` ARCHITECTURE |
| 공개 GitHub·커밋 히스토리 | ✅ | — | 49커밋 단계별 `feat`/`docs` (제출 시 remote 공개 확인) |

### 4.2 권장

| 체크 항목 | 충족 | 추정 시간 | 근거 |
| --------- | ---- | --------- | ---- |
| README ERD/스키마 | ✅ | 0.5h | `09c6b09` mermaid §2.3 |
| 설계 이유 2가지+ 설명 가능 | ✅ | — | README §7, ARCHITECTURE §6 |
| Trade-off 1가지+ | ✅ | — | README §7 표 7건 |

### 4.3 보너스

| 체크 항목 | 충족 | 추정 시간 | 근거 |
| --------- | ---- | --------- | ---- |
| Docker Compose 즉시 실행 | ✅ | 0.5h | `f8ccd1c`, README §5 |
| 과제 Excel 그대로 임포트 | ✅ | 2.5h | `7544236` CSV, `23e9bce` xlsx, `docs/sample-ct045.csv` |
| OpenAPI / Swagger | ✅ | 1.0h | `docs/openapi.yaml`, `f1bcb1d`, `redoc-static.html` |
| 타 시스템 비교 | △ | 0.5h | `AI_USAGE.md` 벤치마킹 표 (README 본문에는 요약만) |

---

## 5. 과제 자료(CT-045) 요구 대응

| 과제 이미지 요구 | 충족 | 커밋·파일 |
| ---------------- | ---- | --------- |
| 원본 활동 표 30행 (전기/원소재/운송) | ✅ | `2ee1ab5` seed, `docs/sample-ct045.csv` |
| 배출계수 4종 (0.456 / 2.3 / 3.2 / 3.5) | ✅ | `prisma/seed.ts`, `activity-csv.ts` 규칙표 |
| 배출계수 **DB 별도 테이블** | ✅ | `EmissionFactor` model |
| **버전 이력** 추적 설계 | ✅ | `dc1e599` `version` + `@@unique([name, stageCode, version])` |
| Excel **별도 가공 없이** PG 적재 | ✅ | `23e9bce` xlsx → bulk API → Prisma (UI·curl) |

---

## 6. 시간이 많이 소요된 작업 Top 5

과제 안내: *「많은 시간이 소요된 부분을 요약」* — 커밋 밀도·구현 범위·디버깅 난이도 기준.

| 순위 | 작업 | 소요 | 이유 (커밋·내용) |
| ---- | ---- | ---- | ---------------- |
| 1 | **PCF 도메인 계산 + TRANSPORT 분기** | ~3h | `c8ff216`, `7113fa7`, `5017ff7`, `b08fb82` — 단위 차원·파생/직접 XOR·vitest 다수 |
| 2 | **CSV/xlsx 일괄 임포트 파이프** | ~2.5h | `7544236`, `23e9bce`, `5b4249e` — 한국어 헤더·행 단위 오류·30행 멱등 |
| 3 | **프론트 대시보드 + 활동 UX** | ~4h | `7153dfa`~`0a3d7b5` — recharts·SWR·폼 검증·탭 URL |
| 4 | **API 레이어·에러 계약 통일** | ~2h | `2289ed6`~`19b260c`, `e0ef7a7` — envelope·19 코드·핸들러 추출 |
| 5 | **문서·과제 제출 정합** | ~2.5h | `76591f9`, `583b197`, `5718fc5` — README 8섹션·AI_USAGE·ARCHITECTURE |

---

## 7. 일자별 요약 타임라인

```

2026-05-17  2.5h
  └─ 저장소·Docker·Prisma·domain calculate 초안·API 스캐폴딩
     커밋: 97d35ff → 2289ed6 (10건)

2026-05-18  7.0h
  └─ 백엔드 완성: Scope/version, CT-045 시드, CSV bulk, health, README
     커밋: 95439b3 → 313f648 (25건)

2026-05-19  6.5h
  └─ UI 전면 (목록·상세·차트·활동·CSV 탭·a11y)
  └─ AI_USAGE, ERD, xlsx, OpenAPI 문서
     커밋: 935a018 → f41669c, 583b197 → f1bcb1d

2026-05-20  2.5h
  └─ CSV 헤더 수정, RHF 버그 수정, ARCHITECTURE/README 보강
     커밋: 5b4249e → 5718fc5 (4건)
```

---

## 8. 커밋 전체 목록 (참조)

상세 필드(hash, subject, body, authorDate)는 **[git-commits.json](./git-commits.json)** 을 단일 소스로 한다.  
아래는 **최신순 제목만** 인덱스다.

| # | shortHash | subject | 날짜 |
| - | --------- | ------- | ---- |
| 1 | `5718fc5` | docs: README 및 ARCHITECTURE 상세 구조·설명 보강 | 2026-05-20 |
| 2 | `9bd018d` | fix(ui): Input·Textarea forwardRef로 RHF 폼 값 미수집 수정 | 2026-05-20 |
| 3 | `5b4249e` | fix: CSV 헤더 … `일자(원본)` | 2026-05-20 |
| 4 | `f1bcb1d` | docs(readme): OpenAPI … redoc-static.html | 2026-05-19 |
| 5 | `23e9bce` | feat: bulk import xlsx 업로드 지원 | 2026-05-19 |
| … | … | *(중략 39건)* | … |
| 49 | `97d35ff` | Initial commit | 2026-05-17 |

전체 49건은 JSON 파일을 열람한다.

---

## 9. 제출 전 보완 (본 문서 기준)

| 우선순위 | 항목 | 예상 추가 시간 |
| -------- | ---- | -------------- |
| P0 | `docs/screenshots/` + README 링크 | 0.5h |
| P0 | README 상단 **총 작업 시간** 요약 (본 문서 링크) | 0.2h |
| P1 | UI 시연 영상(GIF/MP4) | 0.5h |
| P2 | 부트스트랩 5단계 요약 블록 | 0.2h |

---

## 10. 관련 문서

| 문서 | 역할 |
| ---- | ---- |
| [README.md](../README.md) | 시스템 개요·실행·API·데모 |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | 상세 설계·레이어·파일 책임 |
| [AI_USAGE.md](./AI_USAGE.md) | AI 3원칙·Prompt·미반영 항목 |
| [git-commits.json](./git-commits.json) | 커밋 기계 판독 원본 |

---

*최종 갱신: git-commits.json `exportedAt` 기준 · 커밋 49건 동기화.*
