<!-- src/routes/reading/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { logout, auth } from '$lib/stores/auth';
  import { get } from 'svelte/store';
  import { goto } from '$app/navigation';
  import { browser } from '$app/environment'; // 브라우저 환경 확인

  let mySeat: number | null = null;
  let usedSeats: number[] = [];
  let userId: string | null;
  let userName: string | null;
  let userInZone = false;
  let isLoading = true; // 로딩 상태 추가
  let error: string | null = null; // 에러 상태 추가

  const map = [
    [1, 2, 3, 4, 5, null, 6, 7, null, 51],
    [null, null, null, null, null, null, null, null, null, 52],
    [8, 9, 10, 11, 12, null, 13, 14, null, 53],
    [15, 16, 17, 18, 19, null, 20, 21, null, 54],
    [null, null, null, null, null, null, null, null, null, 55],
    [22, 23, 24, 25, 26, null, 27, 28, null, 56],
    [29, 30, 31, 32, 33, null, 34, 35, null, 57],
    [null, null, null, null, null, null, null, null, null, 58],
    [36, 37, 38, 39, 40, null, 41, 42, null, 59],
    [43, 44, 45, 46, 47, null, null, null, null, 60],
    [null, null, null, null, null, null, null, null, null, null],
    [null, null, 48, 49, 50, null, null, null, null, null]
  ];

  function goHome() {
    goto('/');
  }

  async function fetchSeatStatus() {
    if (!userId) {
      error = '로그인이 필요합니다.';
      isLoading = false;
      return;
    }
    try {
      const response = await fetch('/api/reading-seats', {
        // headers: {
        //   'x-user-id': userId
        // }
        credentials: 'include' // 쿠키 포함
      });
      if (!response.ok) {
        // throw new Error(await response.text());
        if (response.status === 401) {
					error = '세션이 만료되었습니다. 다시 로그인해주세요.';
					goto('/login');
					return;
				}
				throw new Error('현황을 불러오지 못했습니다.');
      }
      const data = await response.json();
      usedSeats = data.usedSeats;
      mySeat = data.mySeat;
      error = null;
    } catch (err) {
      // error = err.message || '좌석 정보를 불러오지 못했습니다.';
      error = err instanceof Error ? err.message : '좌석 정보를 불러오지 못했습니다.';
    } finally {
      isLoading = false;
    }
  }

  async function handleSeatClick(seat: number) {
    // if (!userInZone) {
    //   alert('열람실 내에서만 등록이 가능합니다.');
    //   return;
    // }
    try {
      if (mySeat === seat) {
        if (confirm(`${seat}번 좌석 퇴실하시겠습니까?`)) {
          const res = await fetch('/api/reading-seats', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ seat, user_id: userId })
          });
          if (!res.ok) {
            // throw new Error(await res.text());
            const data = await res.json();
            alert(`퇴실 실패: ${data.message}`);
					  return;
          }
          await fetchSeatStatus();
        }
      } else if (!usedSeats.includes(seat)) {
        if (confirm(`${seat}번 좌석을 이용 등록하시겠습니까?`)) {
          const res = await fetch('/api/reading-seats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ seat, user_id: userId, name: userName })
          });
          if (!res.ok) {
            // throw new Error(await res.text());
            const data = await res.json();
            alert(`등록 실패: ${data.message}`);
					  return;
          }
          await fetchSeatStatus();
        }
      }
    } catch (err: any) {
      alert(`작업 실패: ${err.message}`);
    }
  }

  function checkLocation() {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const roomLat = 37.2996, roomLng = 126.8360;
        const distance = getDistanceFromLatLonInMeters(latitude, longitude, roomLat, roomLng);
        userInZone = distance < 100;
      },
      (err) => {
        console.error('위치 정보 확인 실패', err);
        userInZone = false;
      }
    );
  }

  function getDistanceFromLatLonInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // 서버에서 인증 상태 확인
  async function verifyAuth() {
    isLoading = true;
    try {
      const response = await fetch('/api/auth/verify', {
        credentials: 'include' // 쿠키/세션 포함
      });
      if (!response.ok) {
        throw new Error('인증 실패');
      }
      const data = await response.json();
      auth.set({
        isLoggedIn: true,
        id_no: data.id_no,
        user_name: data.user_name
      });
      userId = data.id_no;
      userName = data.user_name;
      await fetchSeatStatus();
      checkLocation();
    } catch (err) {
      error = '로그인이 필요합니다.';
      // 쿼리 파라미터로 리다이렉션 URL 유지
      const redirect = new URLSearchParams(window.location.search).get('redirect') || '/reading';
      goto(`/login?redirect=${encodeURIComponent(redirect)}`);
    } finally {
      isLoading = false;
    }
  }

  onMount(() => {
    if (!browser) return; // 서버 사이드 렌더링에서는 실행 안 함
    const $auth = get(auth);
    if (!$auth.isLoggedIn) {
      verifyAuth(); // 서버에서 인증 확인
    } else {
      userId = $auth.id_no;
      userName = $auth.user_name;
      fetchSeatStatus();
      // checkLocation();
    }
  });

  function handleLogout() {
    logout();
    goto('/login');
  }
</script>

<main class="mx-auto max-w-screen-md space-y-8 px-4 py-6 text-center text-neutral-800 sm:px-6 lg:px-8">
  <!-- 로딩 및 에러 UI -->
  {#if isLoading}
    <div class="text-center">
      <p>로딩 중...</p>
    </div>
  {:else if error}
    <div class="text-center text-red-500">
      <p>{error}</p>
			{#if error.includes('세션이 만료')}
				<a href="/login" class="mt-2 text-sm text-blue-600 hover:underline">로그인</a>
			{:else}
				<button class="mt-2 text-sm text-blue-600 hover:underline" on:click={() => verifyAuth()}>
					재시도
				</button>
			{/if}
    </div>
  {:else}
    <!-- 상단 네비게이션 -->
    <div class="flex items-center justify-between px-2 sm:px-4">
      <button on:click={goHome} class="text-sm text-blue-600 hover:underline">← Home</button>
      <button class="text-sm text-red-500 hover:underline" on:click={handleLogout}>로그아웃</button>
    </div>
    <h1 class="text-center text-2xl font-bold">도담 📖열람실 이용 등록</h1>
    <!-- 색상 안내 -->
    <div class="mt-4 text-sm text-gray-600">
      <span class="inline-block h-4 w-4 bg-green-500 mr-1"></span> 사용 가능
      <span class="inline-block h-4 w-4 bg-red-500 mr-1 ml-4"></span> 내 좌석
      <span class="inline-block h-4 w-4 bg-gray-400 mr-1 ml-4"></span> 사용 중
    </div>
    <!-- Seat Map Layout -->
    <div class="flex justify-center">
      <div
        class="grid gap-1 sm:gap-2"
        style="grid-template-columns: repeat({map[0].length}, minmax(28px, 32px));"
      >
        {#each map as row}
          {#each row as seat}
            {#if seat === null}
              <div class="h-7 w-7 sm:h-8 sm:w-8"></div>
            {:else}
              <button
                class="h-8 w-8 sm:h-9 sm:w-9 rounded-md text-sm font-bold text-white
                  {mySeat === seat
                    ? 'bg-red-500'
                    : usedSeats.includes(seat)
                      ? 'cursor-not-allowed bg-gray-400'
                      : 'bg-green-500 hover:bg-green-600'}"
                on:click={() => handleSeatClick(seat)}
                disabled={usedSeats.includes(seat) && mySeat !== seat}
                aria-label="좌석 {seat} {mySeat === seat ? '선택됨' : usedSeats.includes(seat) ? '사용 중' : '사용 가능'}"
              >
                {seat}
              </button>
            {/if}
          {/each}
        {/each}
      </div>
    </div>
  {/if}
</main>