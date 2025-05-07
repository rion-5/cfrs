// src/utils/date.ts
// KST (UTC+9) 기준 시간대 처리 유틸리티
// date-fns 사용 (간단하고 신뢰성 높음)
import { format, parseISO, addHours, isValid } from 'date-fns';
import { ko } from 'date-fns/locale';

// KST로 오늘 날짜 반환 (YYYY-MM-DD)
export function getTodayKST(): string {
  const now = new Date();
  // 서버/클라이언트 시간대 무시, KST로 강제 조정
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return format(kst, 'yyyy-MM-dd', { locale: ko });
}

// KST Date 객체 반환
export function getKSTDate(date: Date | string = new Date()): Date {
  const input = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(input)) throw new Error('유효하지 않은 날짜입니다.');
  return new Date(input.getTime() + 9 * 60 * 60 * 1000);
}

// KST ISO 문자열 반환 (YYYY-MM-DDTHH:mm:ss.SSSZ, UTC로 저장)
export function toKSTISOString(date: Date | string): string {
  const kst = getKSTDate(date);
  // UTC로 변환 (DB 저장 시 UTC 표준)
  const utc = new Date(kst.getTime() - 9 * 60 * 60 * 1000);
  return utc.toISOString();
}

// KST 날짜 문자열 반환 (YYYY-MM-DD)
export function toKSTDateString(date: Date | string): string {
  const kst = getKSTDate(date);
  return format(kst, 'yyyy-MM-dd', { locale: ko });
}

// KST 시간 표시 (HH:mm)
export function toKSTTimeString(date: Date | string): string {
  const kst = getKSTDate(date);
  return format(kst, 'HH:mm', { locale: ko });
}

// UTC ISO 문자열을 KST로 변환
export function fromUTCtoKST(utc: string): Date {
  const date = parseISO(utc);
  if (!isValid(date)) throw new Error('유효하지 않은 UTC 날짜입니다.');
  return new Date(date.getTime() + 9 * 60 * 60 * 1000);
}

export function getKoreanDayOfWeek(date: Date): string {
  const kst = getKSTDate(date);
	return kst.toLocaleString('ko-KR', { weekday: 'long' }); // 예: 월요일
}