import type { Cookies } from '@sveltejs/kit';
import { parse } from 'cookie';

// 세션 타입 정의
export interface Session {
	user: {
		id_no: string;
		user_name: string;
	} | null;
}

// 쿠키에서 세션 데이터 가져오기
export async function getSession(request: Request): Promise<Session> {
	const cookieHeader = request.headers.get('cookie');
	if (!cookieHeader) {
		return { user: null };
	}

	const cookies = parse(cookieHeader);
	const sessionToken = cookies['session_token'];

	if (!sessionToken) {
		return { user: null };
	}

	try {
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
		console.error('getSession: Session parsing error:', err);
		return { user: null };
	}
}

// 세션 설정 (로그인 시 호출)
export function setSession(cookies: Cookies, user: { id_no: string; user_name: string }) {
	const sessionData = JSON.stringify({
		id_no: user.id_no,
		user_name: user.user_name
	});
	cookies.set('session_token', sessionData, {
		path: '/',
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'strict',
		maxAge: 2 * 60 * 60 // 운영용 2시간
	});
}

// 세션 연장
export function extendSession(cookies: Cookies) {
	const sessionToken = cookies.get('session_token');
	if (!sessionToken) {
		return false;
	}

	try {
		const sessionData = JSON.parse(sessionToken);
		if (!sessionData.id_no || !sessionData.user_name) {
			return false;
		}
		cookies.set('session_token', sessionToken, {
			path: '/',
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'strict',
			maxAge: 2 * 60 * 60 // 운영용 2시간
		});
		return true;
	} catch (err) {
		console.error('extendSession: Session extension error:', err);
		return false;
	}
}

// 세션 삭제 (로그아웃 시 호출)
export function clearSession(cookies: Cookies) {
	cookies.delete('session_token', { path: '/' });
}