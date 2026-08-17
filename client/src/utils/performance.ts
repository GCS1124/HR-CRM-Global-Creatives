import type { AttendanceRecord } from "../types/hr";
import { getLocalDateKey } from "./formatters";

export const clampScore = (value: number): number => Math.max(0, Math.min(100, Math.round(value)));

function countWorkingDaysThrough(referenceDate: Date): number {
  const endOfMonth = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0);
  const daysToCheck = Math.min(referenceDate.getDate(), endOfMonth.getDate());

  let weekendDays = 0;
  for (let day = 1; day <= daysToCheck; day += 1) {
    const date = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), day);
    const weekday = date.getDay();
    if (weekday === 0 || weekday === 6) {
      weekendDays += 1;
    }
  }

  return Math.max(0, daysToCheck - weekendDays);
}

export function calculateAttendanceRate(
  records: Array<Pick<AttendanceRecord, "date" | "status">>,
  referenceDate: Date = new Date(),
): number {
  const todayKey = getLocalDateKey(referenceDate);
  const monthStartKey = getLocalDateKey(new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1));
  const monthRecords = records.filter((record) => record.date >= monthStartKey && record.date <= todayKey);
  const presentCount = monthRecords.reduce((count, record) => {
    if (record.status === "present" || record.status === "late" || record.status === "remote") {
      return count + 1;
    }

    return count;
  }, 0);

  const workingDays = countWorkingDaysThrough(referenceDate);
  if (workingDays === 0) {
    return 0;
  }

  return (presentCount / workingDays) * 100;
}

export function calculateCompletedWorkloadRate(completedTasks: number, totalTasks: number): number {
  if (totalTasks <= 0) {
    return 100;
  }

  return (completedTasks / totalTasks) * 100;
}

export function calculateOverallPerformanceScore(attendanceRate: number, workloadRate: number): number {
  return clampScore((attendanceRate + workloadRate) / 2);
}
