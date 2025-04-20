<!-- src/routes/+page.svelte -->
<script lang='ts'>
	import { auth, logout } from '$lib/stores/auth';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

  const handleSelect = (type: 'STUDY' | 'READING' | 'LECTURE') => {
  goto(`/${type.toLowerCase()}`);
};
	function handleLogout() {
		logout();
		goto('/login');
	}

	onMount(() => {
		if (!$auth.isLoggedIn) {
			goto('/login');
		}
	});
</script>

<main class="mx-auto max-w-md space-y-8 p-6 text-center text-neutral-800">
	<div class="flex items-center justify-between p-4">
		<div class="text-lg font-semibold">이상근님</div>
		<button class="text-sm text-red-500 hover:underline" on:click={handleLogout}>로그아웃</button>
	</div>

	<div class="text-base text-neutral-600">어떤 공간을 예약하시겠어요?</div>

	<div class="grid gap-3">
		<button
			class="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm
      font-medium text-gray-800 transition-colors hover:bg-orange-100"
      on:click={() => handleSelect('STUDY')}>토론실</button>
		<button
			class="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm
      font-medium text-gray-800 transition-colors hover:bg-blue-100">도담</button
		>
		<button
			class="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm
      font-medium text-red-800 transition-colors hover:bg-yellow-100">강의실</button
		>
	</div>
</main>
