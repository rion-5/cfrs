<!-- src/routes/lecture/+page.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { logout, auth } from '$lib/stores/auth';
	import { get } from 'svelte/store';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment'; // 브라우저 환경 확인
	import DatePicker from '$lib/components/DatePicker.svelte';
	import TimeSlider from '$lib/components/TimeSlider.svelte';
	import Timetable from '$lib/components/Timetable.svelte';
	import ReservationForm from '$lib/components/ReservationForm.svelte';
	import { reservationStore } from '$lib/stores/reservation';
	import { formatDateToYYYYMMDD } from '$lib/utils/date';
	import type {
		ClassroomAvailability,
		ClassroomReservation,
		ReservationFormData
	} from '$lib/types';

	// 상태 관리
	let view: 'search' | 'timetable' | 'form' | 'confirmation' = 'search';
	let selectedDate: Date = new Date(); // KST 오늘 날짜 (브라우저 시간대)
	let selectedTimeRange: { start: string; end: string } = { start: '09:00', end: '22:00' };
	let selectedClassroom: {
		classroom: ClassroomAvailability;
		slot: { start: string; end: string };
	} | null = null;
	let reservationResult: ClassroomReservation | null = null;
	let isLoading = true; // 로딩 상태
	let error: string | null = null; // 에러 상태
	let userId: string | null = null; // 사용자 ID

	// 서버에서 인증 상태 확인
	async function verifyAuth() {
		isLoading = true;
		try {
			const response = await fetch('/api/auth/verify', {
				credentials: 'include' // 쿠키/세션 포함
			});
			const data = await response.json();
			if (!response.ok) {
				throw new Error(data.message || '인증 실패');
			}

			auth.set({
				isLoggedIn: true,
				id_no: data.id_no,
				user_name: data.user_name
			});
			userId = data.id_no;
			error = null;
		} catch (err) {
			error = '로그인이 필요합니다.';
			const redirect = new URLSearchParams(window.location.search).get('redirect') || '/lecture';
			goto(`/login?redirect=${encodeURIComponent(redirect)}`);
		} finally {
			isLoading = false;
		}
	}

	// DatePicker change 이벤트 처리
	async function handleDateChange(event: CustomEvent<Date>) {
		selectedDate = event.detail;
		if (userId) {
			await fetchAvailability(); // 인증된 경우에만 데이터 조회
		}
	}

	// 빈 강의실 조회
	async function fetchAvailability() {
		isLoading = true;
		try {
			const response = await fetch(
				`/api/classroom-availability?date=${formatDateToYYYYMMDD(selectedDate)}&start=${selectedTimeRange.start}&end=${selectedTimeRange.end}`,
				{ credentials: 'include' }
			);
			if (!response.ok) {
				if (response.status === 401) {
					error = '세션이 만료되었습니다. 다시 로그인해주세요.';
					auth.set({ isLoggedIn: false, id_no: null, user_name: null });
					goto('/login?redirect=/lecture');
					return;
				}
				const errorData = await response.json();
				throw new Error(errorData.error || '강의실 조회에 실패했습니다.');
			}
			const data: ClassroomAvailability[] = await response.json();
			reservationStore.set({ availability: data });
			view = 'timetable';
			error = null;
		} catch (err) {
			error = err instanceof Error ? err.message : '강의실 조회에 실패했습니다.';
			view = 'search';
		} finally {
			isLoading = false;
		}
	}

	// 예약 신청
	async function handleReservation(data: ReservationFormData) {
		isLoading = true;
		try {
			const response = await fetch('/api/classroom-reservations', {
				method: 'POST',
				body: JSON.stringify(data),
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include'
			});
			if (!response.ok) {
				if (response.status === 401) {
					error = '세션이 만료되었습니다. 다시 로그인해주세요.';
					auth.set({ isLoggedIn: false, id_no: null, user_name: null });
					goto('/login?redirect=/lecture');
					return;
				}
				const errorData = await response.json();
				throw new Error(errorData.error || '예약 신청에 실패했습니다.');
			}
			reservationResult = await response.json();
			view = 'confirmation';
			error = null;
		} catch (err) {
			error = err instanceof Error ? err.message : '예약 신청에 실패했습니다.';
		} finally {
			isLoading = false;
		}
	}

	// 내 예약 내역으로 이동
	function goToMyReservations() {
		goto('/my-reservations');
	}

	function goHome() {
		goto('/');
	}

	function handleLogout() {
		logout();
		goto('/login');
	}

	// 페이지 로드 시 인증 확인
	onMount(() => {
		if (!browser) return; // 서버 사이드 렌더링에서는 실행 안 함
		const $auth = get(auth);
		if (!$auth.isLoggedIn) {
			verifyAuth(); // 서버에서 인증 확인
		} else {
			userId = $auth.id_no;
			isLoading = false;
		}
	});
</script>

<main class="container mx-auto p-4">
	<!-- 로딩 및 에러 UI -->
	{#if isLoading}
		<div class="text-center">
			<p>로딩 중...</p>
		</div>
	{:else if error}
		<div class="text-center text-red-500">
			<p>{error}</p>
			{#if error.includes('세션이 만료') || error.includes('로그인이 필요')}
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
		{#if view === 'search'}
			<h1 class="mb-4 text-2xl font-bold">강의실 예약</h1>
			<DatePicker bind:selectedDate on:change={handleDateChange} />
			<TimeSlider bind:selectedTimeRange />
			<button class="mt-4 w-full rounded bg-blue-500 py-2 text-white" on:click={fetchAvailability}>
				빈 강의실 찾기
			</button>
			<div class="mt-2 flex justify-between">
				<a href="/my-reservations" class="text-blue-500">내 예약 내역</a>
				<a href="/lecture" class="text-blue-500">오늘의 빈 강의실</a>
			</div>
		{:else if view === 'timetable'}
			<h1 class="mb-4 text-2xl font-bold">
				{formatDateToYYYYMMDD(selectedDate)} 빈 강의실
			</h1>
			<button class="mb-4 text-blue-500" on:click={() => (view = 'search')}>검색 수정</button>
			<Timetable
				{selectedDate}
				on:select={({ detail }) => {
					selectedClassroom = detail;
					view = 'form';
				}}
			/>
		{:else if view === 'form' && selectedClassroom}
			<h1 class="mb-4 text-2xl font-bold">예약 신청</h1>
			<ReservationForm
				classroom={selectedClassroom}
				date={selectedDate}
				on:submit={({ detail }) => handleReservation(detail)}
				on:cancel={() => (view = 'timetable')}
			/>
		{:else if view === 'confirmation' && reservationResult}
			<h1 class="mb-4 text-2xl font-bold">예약 완료</h1>
			<div class="rounded bg-green-100 p-4">
				<p>예약 신청이 완료되었습니다.</p>
				<p>강의실: {reservationResult.classroom_id}</p>
				<p>날짜: {reservationResult.reservation_date}</p>
				<p>
					시간: {reservationResult.start_time} ~ {reservationResult.end_time}
				</p>
				<p>목적: {reservationResult.purpose}</p>
				<p>상태: {reservationResult.status}</p>
			</div>
			<div class="mt-4 flex justify-between">
				<button class="rounded bg-blue-500 px-4 py-2 text-white" on:click={goToMyReservations}>
					내 예약 내역
				</button>
				<button class="rounded bg-gray-500 px-4 py-2 text-white" on:click={() => (view = 'search')}>
					홈으로
				</button>
			</div>
		{/if}
	{/if}
</main>

<style>
	:global(.container) {
		max-width: 640px;
	}
</style>