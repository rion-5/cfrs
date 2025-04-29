import { redirect, type Actions } from '@sveltejs/kit';
import { setSession } from '$lib/server/session';

export const actions: Actions = {
  default: async ({ request, cookies }) => {
    const form = await request.formData();
    const id_no = form.get('id_no')?.toString();
    const password = form.get('password')?.toString();

    // 인증 로직 (예: 하드코딩, 실제로는 외부 인증 서비스)
    if (id_no === 'test_user' && password === 'password') {
      setSession(cookies, {
        id_no,
        user_name: 'Test User' // 실제로는 DB/서비스에서 가져옴
      });
      throw redirect(303, '/reading');
    }

    return { error: '잘못된 자격 증명' };
  }
};