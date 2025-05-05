<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import DatePicker from '$lib/components/DatePicker.svelte';
	import TimeSlider from '$lib/components/TimeSlider.svelte';
	import Timetable from '$lib/components/Timetable.svelte';
	import ReservationForm from '$lib/components/ReservationForm.svelte';
	import { reservationStore } from '$lib/stores/reservation';
	import { getTodayKST, toKSTDateString } from '$lib/utils/date';
	import type { ClassroomAvailability, ClassroomReservation, ReservationFormData } from '$lib/types';

	// 상태 관리
	let view: 'search' | 'timetable' | 'form' | 'confirmation' = 'search';
	let selectedDate: Date = new Date(getTodayKST());
	let selectedTimeRange: { start: string; end: string } = { start: '08:00', end: '22:00' };
	let selectedClassroom: { classroom: ClassroomAvailability; slot: { start: string; end: string } } | null = null;
	let reservationResult: ClassroomReservation | null = null;

	// 빈 강의실 조회
	async function fetchAvailability() {
		const response = await fetch(
			`/api/classroom-availability?date=${toKSTDateString(selectedDate)}&start=${selectedTimeRange.start}&end=${selectedTimeRange.end}`
		);
		if (!response.ok) {
			alert('강의실 조회에 실패했습니다.');
			return;
		}
		const data: ClassroomAvailability[] = await response.json();
		reservationStore.set({ availability: data });
		view = 'timetable';
	}

	// 예약 신청
	async function handleReservation(data: ReservationFormData) {
		const response = await fetch('/api/classroom-reservations', {
			method: 'POST',
			body: JSON.stringify(data),
			headers: { 'Content-Type': 'application/json' }
		});
		if (!response.ok) {
			const error = await response.json();
			alert(error.error || '예약 신청에 실패했습니다.');
			return;
		}
		reservationResult = await response.json();
		view = 'confirmation';
	}

	// 내 예약 내역으로 이동
	function goToMyReservations() {
		goto('/my-reservations');
	}
</script>

<main class="container mx-auto p-4">
	{#if view === 'search'}
		<h1 class="text-2xl font-bold mb-4">강의실 예약</h1>
		<DatePicker bind:selectedDate />
		<TimeSlider bind:selectedTimeRange />
		<button
			class="w-full bg-blue-500 text-white py-2 rounded mt-4"
			on:click={fetchAvailability}
		>
			빈 강의실 찾기
		</button>
		<div class="flex justify-between mt-2">
			<a href="/my-reservations" class="text-blue-500">내 예약 내역</a>
			<a href="/lecture" class="text-blue-500">오늘의 빈 강의실</a>
		</div>
	{:else if view === 'timetable'}
		<h1 class="text-2xl font-bold mb-4">
			{toKSTDateString(selectedDate)} 빈 강의실
		</h1>
		<button
			class="mb-4 text-blue-500"
			on:click={() => (view = 'search')}
		>
			검색 수정
		</button>
		<Timetable
			on:select={({ detail }) => {
				selectedClassroom = detail;
				view = 'form';
			}}
		/>
	{:else if view === 'form' && selectedClassroom}
		<h1 class="text-2xl font-bold mb-4">예약 신청</h1>
		<ReservationForm
			classroom={selectedClassroom}
			date={selectedDate}
			on:submit={({ detail }) => handleReservation(detail)}
			on:cancel={() => (view = 'timetable')}
		/>
	{:else if view === 'confirmation' && reservationResult}
		<h1 class="text-2xl font-bold mb-4">예약 완료</h1>
		<div class="bg-green-100 p-4 rounded">
			<p>예약 신청이 완료되었습니다.</p>
			<p>강의실: {reservationResult.classroom_id}</p>
			<p>날짜: {reservationResult.reservation_date}</p>
			<p>
				시간: {reservationResult.start_time} ~ {reservationResult.end_time}
			</p>
			<p>목적: {reservationResult.purpose}</p>
			<p>상태: {reservationResult.status}</p>
		</div>
		<div class="flex justify-between mt-4">
			<button
				class="bg-blue-500 text-white py-2 px-4 rounded"
				on:click={goToMyReservations}
			>
				내 예약 내역
			</button>
			<button
				class="bg-gray-500 text-white py-2 px-4 rounded"
				on:click={() => (view = 'search')}
			>
				홈으로
			</button>
		</div>
	{/if}
</main>

<style>
	:global(.container) {
		max-width: 640px;
	}
</style>