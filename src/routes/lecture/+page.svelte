<script lang="ts">
	import { goto } from '$app/navigation';
	import { auth, logout } from '$lib/stores/auth';

	function goHome() {
		goto('/');
	}
	function handleLogout() {
		logout();
		goto('/login');
	}
</script>

<main
	class="mx-auto max-w-screen-md space-y-8 px-4 py-6 text-center text-neutral-800 sm:px-6 lg:px-8"
>
	<div class="flex items-center justify-between px-2 sm:px-4">
		<button on:click={goHome} class="text-sm text-blue-600 hover:underline">← Home</button>
		<button class="text-sm text-red-500 hover:underline" on:click={handleLogout}>로그아웃</button>
	</div>

	ing...
</main>
