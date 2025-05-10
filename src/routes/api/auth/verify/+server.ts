// src/routes/api/auth/verify/+server.ts

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSession } from '$lib/server/session';

export const GET: RequestHandler = async ({ request }) => {
  const session = await getSession(request);
  if (!session.user) {
    throw error(401, '인증되지 않은 사용자입니다.');
  }

  return json({
    id_no: session.user.id_no,
    user_name: session.user.user_name
  });
};