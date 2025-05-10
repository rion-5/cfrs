<!-- <script lang="ts">
	import '../app.css';

	let { children } = $props();
</script>

{@render children()} -->
<script lang="ts">
	import '../app.css';
	import SessionManager from '$lib/components/SessionManager.svelte';
	import { auth, logout } from '$lib/stores/auth';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { get } from 'svelte/store';
	import { browser } from '$app/environment';

	$: isLoggedIn = $auth.isLoggedIn;
	$: requiresAuth = $page.url.pathname !== '/login';
	$: isRoot = $page.url.pathname === '/';

	function handleLogout() {
		logout();
		goto('/login');
	}
</script>

<div class="container mx-auto p-4">
	<!-- 상단 네비게이션 -->
	{#if isLoggedIn && requiresAuth}
		<div class="flex items-center justify-between px-2 sm:px-4 mb-4">
			<!-- 루트 페이지에서는 Home 버튼 비워둠 -->
			{#if !isRoot}
				<button on:click={() => goto('/')} class="text-sm text-blue-600 hover:underline">← Home</button>
			{:else}
				<div class="text-sm sm:text-base font-semibold text-gray-800">{$auth.user_name} 님</div>
			{/if}
			<button class="text-sm text-red-500 hover:underline" on:click={handleLogout}>로그아웃</button>
		</div>
	{/if}

	<!-- 세션 관리 -->
	{#if browser}
		<SessionManager {requiresAuth} />
	{/if}

	<!-- 페이지 콘텐츠 -->
	<slot />
</div>

<style>
	:global(.container) {
		max-width: 640px;
	}
</style>