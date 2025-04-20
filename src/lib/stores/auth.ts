// src/lib/stores/auth.ts
import { writable } from 'svelte/store';

export interface AuthState {
  isLoggedIn: boolean;
  user_name?: string;  // optional property
  id_no?: string;
  dept_name?: string;
  dept_code?: string;
}

const initialAuthState: AuthState = {
  isLoggedIn: false
  // optional 속성은 생략 가능
};

export const auth = writable<AuthState>(initialAuthState);

export function logout() {
  auth.set({
    isLoggedIn: false
    // optional 속성은 생략하면 undefined로 설정됨
  });
}