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
		console.log('getSession: No cookie header');
		return { user: null };
	}

	const cookies = parse(cookieHeader);
	const sessionToken = cookies['session_token'];

	if (!sessionToken) {
		console.log('getSession: No session_token');
		return { user: null };
	}

	try {
		const sessionData = JSON.parse(sessionToken);
		if (sessionData.id_no && sessionData.user_name) {
			// console.log('getSession: Valid session data', sessionData);
			return {
				user: {
					id_no: sessionData.id_no,
					user_name: sessionData.user_name
				}
			};
		}
		console.log('getSession: Invalid session data');
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
	// console.log('setSession: Setting session_token', sessionData);
	cookies.set('session_token', sessionData, {
		path: '/',
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production', // 로컬: false, 운영: true
		sameSite: 'strict',
		// maxAge: 5 * 60 // 테스트용 5분
		maxAge: 2 * 60 * 60 // 운영용 2시간
	});
}

// 세션 연장
export function extendSession(cookies: Cookies) {
	const sessionToken = cookies.get('session_token');
	if (!sessionToken) {
		// console.log('extendSession: No session_token');
		return false;
	}

	try {
		const sessionData = JSON.parse(sessionToken);
		if (!sessionData.id_no || !sessionData.user_name) {
			console.log('extendSession: Invalid session data');
			return false;
		}
		// console.log('extendSession: Extending session', sessionData);
		cookies.set('session_token', sessionToken, {
			path: '/',
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'strict',
			// maxAge: 5 * 60 // 테스트용 5분
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
	console.log('clearSession: Deleting session_token');
	cookies.delete('session_token', { path: '/' });
}