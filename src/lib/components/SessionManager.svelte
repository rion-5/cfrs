<script lang="ts">
	import { onMount } from 'svelte';
	import { auth, logout } from '$lib/stores/auth';
	import { get } from 'svelte/store';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';

	export let requiresAuth: boolean = true;

	let isLoading = true;
	let error: string | null = null;
	let sessionTimeout: NodeJS.Timeout | null = null;
	let sessionWarning = false;
	let userId: string | null = null;

	function startSessionTimer() {
		if (sessionTimeout) clearTimeout(sessionTimeout);
		sessionTimeout = setTimeout(() => {
			sessionWarning = true;
			setTimeout(() => {
				if (!sessionWarning) return;
				logout();
				goto('/login?redirect=' + encodeURIComponent(window.location.pathname));
			}, 5 * 60 * 1000);
		}, 115 * 60 * 1000);
	}

	async function extendSession() {
		try {
			const response = await fetch('/api/auth/extend', { credentials: 'include' });
			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || '세션 연장 실패');
			}
			sessionWarning = false;
			startSessionTimer();
		} catch (err) {
			error = err instanceof Error ? err.message : '세션 연장 중 오류가 발생했습니다.';
			logout();
			goto('/login?redirect=' + encodeURIComponent(window.location.pathname));
		}
	}

	function resetSessionTimer() {
		if (userId) startSessionTimer();
	}

	async function verifyAuth() {
		isLoading = true;
		try {
			const response = await fetch('/api/auth/verify', {
				credentials: 'include'
			});
			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || '인증 실패');
			}
			const data = await response.json();
			auth.set({
				isLoggedIn: true,
				id_no: data.id_no,
				user_name: data.user_name
			});
			userId = data.id_no;
			error = null;
			startSessionTimer();
		} catch (err) {
			error = '로그인이 필요합니다.';
			const redirect = new URLSearchParams(window.location.search).get('redirect') || window.location.pathname;
			goto(`/login?redirect=${encodeURIComponent(redirect)}`);
		} finally {
			isLoading = false;
		}
	}

	onMount(() => {
		if (!browser) return;
		const $auth = get(auth);
		if (requiresAuth && !$auth.isLoggedIn) {
			verifyAuth();
		} else {
			userId = $auth.id_no;
			isLoading = false;
			if (requiresAuth) startSessionTimer();
		}
		['click', 'mousemove', 'keydown'].forEach((event) =>
			window.addEventListener(event, resetSessionTimer)
		);
		return () => {
			if (sessionTimeout) clearTimeout(sessionTimeout);
			['click', 'mousemove', 'keydown'].forEach((event) =>
				window.removeEventListener(event, resetSessionTimer)
			);
		};
	});
</script>

{#if sessionWarning}
	<div class="fixed top-4 left-1/2 transform -translate-x-1/2 bg-yellow-100 p-4 rounded shadow">
		<p>5분 후 세션이 만료됩니다.</p>
		<button on:click={extendSession} class="mt-2 bg-blue-500 text-white px-2 py-1 rounded">
			세션 연장
		</button>
	</div>
{/if}

{#if isLoading}
	<div class="text-center">
		<svg class="animate-spin h-5 w-5 mx-auto" viewBox="0 0 24 24">
			<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
			<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
		</svg>
		<p>로딩 중...</p>
	</div>
{:else if error}
	<div class="text-center text-red-500 bg-red-100 p-4 rounded">
		<p>{error}</p>
		{#if error.includes('세션이 만료') || error.includes('로그인이 필요')}
			<a href="/login" class="mt-2 text-sm text-blue-600 hover:underline">로그인</a>
		{:else}
			<button class="mt-2 text-sm text-blue-600 hover:underline" on:click={() => verifyAuth()}>
				재시도
			</button>
		{/if}
	</div>
{/if}