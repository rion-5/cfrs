// src/lib/api/login/login.ts

import type { LoginParam } from '$lib/types/LoginParam';
import type { PyxisLoginData } from '$lib/types/PyxisLoginData';

export async function login(params: LoginParam): Promise<PyxisLoginData> {
  const response = await fetch('https://lib.hanyang.ac.kr/pyxis-api/api/login', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(params)
  });
  
  if (!response.ok) {	
    throw new Error('Network response was not ok.');
  }

  const data: PyxisLoginData = await response.json();
  return data;
}

  
