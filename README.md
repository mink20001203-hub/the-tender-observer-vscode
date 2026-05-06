# The Tender Observer (VS Code 확장)

코딩 리듬을 로컬에서 관찰하고, 필요한 순간에만 조용하게 개입하는 프라이버시 우선 확장입니다.

## 무엇을 하나요

- 60초마다 로컬 작업 신호를 수집합니다.
  - 타이핑량
  - 파일 전환 수
  - 유휴 시간
- 작업 리듬 상태를 분류합니다.
  - `calm`, `focused`, `anxious`, `idle`, `lost`
- 웹뷰로 앰비언트 피드백을 보여줍니다.
- 트리거 조건을 만족할 때만 whisper 메시지를 노출합니다.
- 모든 데이터는 로컬 `weekly-rhythm.json`(schema v2)에 저장합니다.

## 사용 시나리오

1. 평소처럼 코딩을 시작합니다.
2. `Tender Observer: Open Ambient View` 명령으로 패널을 엽니다.
3. 작업 중 패널을 열어둔 채 리듬 변화를 관찰합니다.
4. 필요한 순간에만 개입 메시지를 받습니다.
5. `Tender Observer: Open Weekly Rhythm Log`로 누적 데이터를 확인합니다.

이 확장은 끊임없이 코치하는 도구가 아니라, 부담을 줄인 작업 인식 도구를 목표로 합니다.

## 명령어

- `Tender Observer: Open Ambient View`
- `Tender Observer: Open Weekly Rhythm Log`
- `Tender Observer: Secret Mode (Disperse)`

## 설정

VS Code 설정의 `tenderObserver.*` 키를 사용합니다.

- `tenderObserver.whisperEnabled` (`true`/`false`)
  - whisper 메시지 전체 on/off
- `tenderObserver.sensitivity` (`low`/`normal`/`high`)
  - 상태 분류 민감도 조절
- `tenderObserver.nightWhisperEnabled` (`true`/`false`)
  - 새벽 시간(2AM-5AM) 개입 허용/차단

## 개입 철학

- 1분짜리 노이즈보다, 지속된 신호를 우선합니다.
- 쿨다운으로 과도한 개입을 방지합니다.
- 동작은 로컬 중심이며, 로그로 설명 가능해야 합니다.
- A/B 트리거(`A`/`B`)를 비교해 피로도가 낮은 규칙을 찾습니다.

## 데이터 스키마 (weekly-rhythm.json v2)

파일은 다음 구조를 포함합니다.

- `meta`
  - 확장 버전
  - 샘플링 간격
  - A/B 트리거 변형
  - 활성 설정 스냅샷
- `summary`
  - 상태별 집계
  - whisper 발생 횟수
  - 평균 지표
- `snapshots`
  - 분 단위 관측값과 트리거 이유

## 디버깅 체크리스트

1. 빌드 확인
   - `npm run build`
2. 명령어가 안 보일 때
   - VS Code 창 다시 로드
   - 확장 설치/활성 상태 확인
3. TypeScript 진단이 이상할 때 (`NodeJS`, `setInterval`, `TextEncoder` 등)
   - Workspace TypeScript 버전 선택
   - TS 서버 재시작
4. 개입이 너무 잦거나 너무 적을 때
   - `tenderObserver.sensitivity` 조정
   - 주간 로그의 `triggerVariant`, `whisperReason` 확인

## 개인정보/프라이버시

런타임 신호는 로컬에서 처리되고 로컬에만 저장됩니다.
이 확장은 외부 네트워크 전송을 포함하지 않습니다.
