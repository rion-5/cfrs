// src/lib/server/session.ts
import { query } from './db'; // 기존 DB 연결 모듈
// import type { Request } from '@sveltejs/kit';
import type { Session } from '$lib/types'; 


// 세션 생성
export async function setSession(user: Session): Promise<string> {
  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7일 후
  await query(
    'INSERT INTO sessions (session_id, user_id, user_name, expires_at) VALUES ($1, $2, $3, $4)',
    [sessionId, user.id_no, user.user_name, expiresAt]
  );
  return `session_id=${sessionId}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${7 * 24 * 60 * 60}`;
}

// 세션 조회
export async function getSession(request: Request): Promise<Session | null> {
  const sessionId = request.headers.get('cookie')?.match(/session_id=([^;]+)/)?.[1];
  if (!sessionId) return null;

  const result : any = await query(
    'SELECT user_id, user_name FROM sessions WHERE session_id = $1 AND expires_at > CURRENT_TIMESTAMP',
    [sessionId]
  );
  if (result.rows.length === 0) return null;

  return {
    id_no: result.rows[0].user_id,
    user_name: result.rows[0].user_name
  };
}

// 세션 삭제
export async function clearSession(request: Request): Promise<void> {
  const sessionId = request.headers.get('cookie')?.match(/session_id=([^;]+)/)?.[1];
  if (sessionId) {
    await query('DELETE FROM sessions WHERE session_id = $1', [sessionId]);
  }
}