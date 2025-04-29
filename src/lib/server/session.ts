// src/lib/server/session.ts
import type { Cookies } from '@sveltejs/kit';
import { parse } from 'cookie'; // 쿠키 파싱용

// 세션 타입 정의
export interface Session {
  user: {
    id_no: string;
    user_name: string;
  } | null;
}

// 쿠키에서 세션 데이터 가져오기
export async function getSession(request: Request): Promise<Session> {
  // 쿠키 추출
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) {
    return { user: null };
  }

  const cookies = parse(cookieHeader);
  const sessionToken = cookies['session_token']; // 쿠키 이름 가정

  if (!sessionToken) {
    return { user: null };
  }

  // 세션 검증 (예: JWT 파싱 또는 메모리 스토어 조회)
  try {
    // 간단히: 세션 토큰이 JSON 문자열이라고 가정 (실제로는 JWT 디코딩 필요)
    const sessionData = JSON.parse(sessionToken);
    if (sessionData.id_no && sessionData.user_name) {
      return {
        user: {
          id_no: sessionData.id_no,
          user_name: sessionData.user_name
        }
      };
    }
    return { user: null };
  } catch (err) {
    console.error('세션 파싱 에러:', err);
    return { user: null };
  }
}

// 세션 설정 (로그인 시 호출)
export function setSession(cookies: Cookies, user: { id_no: string; user_name: string }) {
  // 세션 데이터 JSON 문자열로 저장 (실제로는 JWT 생성 권장)
  const sessionData = JSON.stringify({
    id_no: user.id_no,
    user_name: user.user_name
  });
  cookies.set('session_token', sessionData, {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 // 1일
  });
}

// 세션 삭제 (로그아웃 시 호출)
export function clearSession(cookies: Cookies) {
  cookies.delete('session_token', { path: '/' });
}