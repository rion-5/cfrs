// src/api/auth/login/+server.ts
import { json, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { login } from '$lib/api/login/login';
import { setSession } from '$lib/server/session';
import type { LoginParam, PyxisLoginData } from '$lib/types';

export const POST: RequestHandler = async ({ request, url }) => {
  try {
    const { loginId, password } = await request.json();
    if (!loginId || !password) {
      return json({ error: '아이디와 비밀번호를 입력해주세요.' }, { status: 400 });
    }
    const params: LoginParam = { loginId, password };
    const response = await fetch('https://lib.hanyang.ac.kr/pyxis-api/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    if (!response.ok) {
      throw new Error('Network response was not ok.');
    }

    const result: PyxisLoginData = await response.json();
    const user = {
      id_no: result.data.memberNo,
      user_name: result.data.name
    };
    const cookie = await setSession(user);

    const redirectTo = url.searchParams.get('redirect') || '/';
    return json({ success: true }, {
      status: 302,
      headers: {
        'Set-Cookie': cookie,
        Location: redirectTo
      }
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류';
    return json({ error: message }, { status: 500 });
  }


};