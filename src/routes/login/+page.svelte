<!-- src/routes/login/+page.svelte -->

<script lang="ts">
	import { onMount } from 'svelte';
	import { auth } from '$lib/stores/auth';
	import { login } from '$lib/api/login/login';
	import type { LoginParam } from '$lib/types';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { get } from 'svelte/store';

	let loginId = '';
	let password = '';
	let error: string | null = null;
	let loginIdInput: HTMLInputElement;
	let passwordInput: HTMLInputElement;

	onMount(() => {
		loginIdInput.focus();
	});

	async function handleLogin() {
		if (!loginId) {
			error = 'Please enter your Student ID';
			loginIdInput.focus();
			return;
		}

		if (!password) {
			error = 'Please enter your Password';
			passwordInput.focus();
			return;
		}

		const params: LoginParam = { loginId, password };

		try {
			const result = await login(params);
			const dept_code = result.data?.parentDept?.code;
			// console.log(JSON.stringify(result, null, 2));
			// if (result.success && (dept_code === 'Y0000502' || dept_code === 'Y0001097')) {
			if (result.success) {   //test

				auth.set({
					isLoggedIn: true,
					user_name: result.data.name,
					id_no: result.data.memberNo
					//  dept_name: result.data.parentDept.name,
					//  dept_code: result.data.parentDept.code
				});
				// 서버에 세션 설정 요청
				await fetch('/api/auth/session', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						id_no: result.data.memberNo,
						user_name: result.data.name
					})
				});
				error = null;

				const $page = get(page);
				const target = $page.url.searchParams.get('redirect') || '/';

				// console.log('리다이렉트 대상:', target);
				goto(target);
			} else {
				// Reset inputs and focus on loginId
				loginId = '';
				password = '';
				error =
					dept_code === 'Y0000502' || dept_code === 'Y0001097'
						? result.message
						: 'Access restricted to 경상대 members only';

				// if((dept_code === 'Y0000502' || dept_code === 'Y0001097' )){
				//   error = result.message;
				// } else {
				//   error = "경상대 소속만 접근 가능합니다.";
				// }
				loginIdInput.focus();
			}
		} catch (err) {
			// Reset inputs and focus on loginId
			loginId = '';
			password = '';
			loginIdInput.focus();
			error = err instanceof Error ? err.message : 'An unexpected error occurred';
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key == 'Enter') {
			if (!loginId) {
				loginIdInput.focus();
				return;
			}
			if (!password) {
				passwordInput.focus();
				return;
			}

			handleLogin();
		}
	}
</script>

<main class="flex min-h-screen items-start justify-center bg-gray-100">
	<div class="mt-40 w-full max-w-sm rounded-xl bg-white p-6 shadow-md">
		<h2 class="mb-4 text-center text-xl font-semibold">Login</h2>
		<input
			class="mb-3 w-full rounded-md border border-gray-300 p-3"
			type="text"
			placeholder="Student ID"
			bind:this={loginIdInput}
			bind:value={loginId}
			on:keydown={handleKeydown}
		/>
		<input
			class="mb-3 w-full rounded-md border border-gray-300 p-3"
			type="password"
			placeholder="Portal Password"
			bind:this={passwordInput}
			bind:value={password}
			on:keydown={handleKeydown}
		/>
		<button
			class="w-full rounded-md bg-blue-600 p-3 text-white hover:bg-blue-700"
			on:click={handleLogin}>Login</button
		>
		{#if error}
			<p class="mt-3 text-center text-sm text-red-500">{error}</p>
		{/if}
	</div>
</main>

<!-- <style>
  .error-message {
    color: #ef4444;
    font-size: 0.875rem;
    margin-top: 0.75rem;
    text-align: center;
  }
</style> -->
