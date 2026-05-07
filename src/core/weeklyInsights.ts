import { RhythmSnapshot, WeeklyRhythmPayload } from "./types";

function ratio(numerator: number, denominator: number): number {
  if (denominator <= 0) {
    return 0;
  }
  return numerator / denominator;
}

function countByHourRange(
  snapshots: RhythmSnapshot[],
  state: RhythmSnapshot["state"],
  startHourInclusive: number,
  endHourExclusive: number
): number {
  return snapshots.filter(
    (snapshot) =>
      snapshot.state === state && snapshot.hour >= startHourInclusive && snapshot.hour < endHourExclusive
  ).length;
}

export function buildWeeklyInsights(payload: WeeklyRhythmPayload): string[] {
  const insights: string[] = [];
  const { summary, snapshots } = payload;
  const total = summary.totalSnapshots;

  if (total === 0) {
    return ["이번 주 데이터가 아직 충분하지 않아요. 조금 더 사용하면 패턴을 보여드릴 수 있어요."];
  }

  const lostRatio = ratio(summary.stateCounts.lost, total);
  const focusedRatio = ratio(summary.stateCounts.focused, total);
  const anxiousRatio = ratio(summary.stateCounts.anxious, total);
  const whisperPerHour = ratio(summary.whisperCount, total) * 60;

  const lostAfternoon = countByHourRange(snapshots, "lost", 12, 18);
  const lostMorning = countByHourRange(snapshots, "lost", 6, 12);
  if (lostAfternoon >= 3 && lostAfternoon > lostMorning) {
    insights.push("이번 주 lost 상태가 오후 시간대(12-18시)에 집중되는 경향이 있어요.");
  }

  if (focusedRatio >= 0.45) {
    insights.push("이번 주에는 focused 비율이 높아 집중 흐름이 비교적 안정적이었어요.");
  }

  if (anxiousRatio >= 0.3) {
    insights.push("anxious 상태 비중이 높았어요. 작업 블록을 더 짧게 나누면 피로를 줄일 수 있어요.");
  }

  if (whisperPerHour > 1.2) {
    insights.push("개입 빈도가 다소 높은 편이에요. sensitivity를 낮추거나 whisper 설정을 조정해보세요.");
  }

  if (insights.length === 0) {
    insights.push("이번 주 리듬은 전반적으로 안정적이에요. 현재 설정을 유지해도 좋아요.");
  }

  return insights;
}
