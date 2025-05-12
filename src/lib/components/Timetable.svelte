<!-- src/lib/components/Timetable.svelte -->
<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { reservationStore } from '$lib/stores/reservation';
	import { formatDateToYYYYMMDD, toKSTDateString } from '$lib/utils/date';
	import type { ClassroomAvailability, ClassroomReservation } from '$lib/types';

	const dispatch = createEventDispatcher();

	// Props
	export let selectedDate: Date;
	export let userId: string | null;

	// 강의실 데이터 및 예약 정보
	let availability: ClassroomAvailability[] = [];
	let reservations: ClassroomReservation[] = [];
	$: ({ availability, reservations } = $reservationStore);

	$: sortedAvailability = availability
		.sort((a, b) => a.room_number.localeCompare(b.room_number))
		.map((classroom) => ({
			...classroom,
			slots: classroom.slots.filter(
				(slot) =>
					slot.start >= '09:00' &&
					slot.end <= '22:00' &&
					['00', '30'].includes(slot.start.split(':')[1])
			)
		}));

	// 시간축: 9시 ~ 22시, 30분 단위
	const hours = Array.from({ length: 13 }, (_, i) => 9 + i);
	const timeSlots = hours.flatMap((hour) => [
		{ start: `${hour.toString().padStart(2, '0')}:00`, end: `${hour.toString().padStart(2, '0')}:30` },
		{ start: `${hour.toString().padStart(2, '0')}:30`, end: `${(hour + 1).toString().padStart(2, '0')}:00` }
	]);

	// 현재 시각 (KST)
	const now = new Date();

	// 슬롯이 과거인지 확인
	function isPastSlot(slot: { start: string; end: string }): boolean {
		const slotDate = new Date(`${selectedDate.toISOString().split('T')[0]}T${slot.start}:00+09:00`);
		return slotDate < now;
	}

	// 시간 문자열을 분 단위로 변환
	function timeToMinutes(time: string): number {
		const [hours, minutes] = time.split(':').map(Number);
		return hours * 60 + minutes;
	}

	// 슬롯 상태 확인
	function getSlotStatus(
		classroom: ClassroomAvailability,
		slot: { start: string; end: string }
	): { status: 'my-pending' | 'my-approved' | 'my-rejected' | 'other-reservation' | 'available' | 'unavailable'; reservationId?: number } {
		const slotData = classroom.slots.find((s) => s.start === slot.start && s.end === slot.end);
		if (!slotData || isPastSlot(slot)) {
			return { status: 'unavailable' };
		}

		const selectedDateStr = toKSTDateString(selectedDate);
		const slotStartMinutes = timeToMinutes(slot.start);
		const slotEndMinutes = timeToMinutes(slot.end);

		console.log('Checking slot:', { classroom: classroom.classroom_id, slot, selectedDateStr, reservations });

		const reservation = reservations.find((res) => {
			const resStartMinutes = timeToMinutes(res.start_time);
			const resEndMinutes = timeToMinutes(res.end_time);
			return (
				res.classroom_id === classroom.classroom_id &&
				res.reservation_date === selectedDateStr &&
				resStartMinutes <= slotStartMinutes &&
				resEndMinutes > slotStartMinutes &&
				['approved', 'pending', 'rejected'].includes(res.status)
			);
		});

		if (reservation) {
			console.log('Found reservation:', reservation);
			if (reservation.user_id === userId) {
				if (reservation.status === 'pending') {
					return { status: 'my-pending', reservationId: reservation.reservation_id };
				} else if (reservation.status === 'approved') {
					return { status: 'my-approved', reservationId: reservation.reservation_id };
				} else {
					return { status: 'my-rejected', reservationId: reservation.reservation_id };
				}
			}
			return { status: 'other-reservation', reservationId: reservation.reservation_id };
		}

		return { status: slotData.available ? 'available' : 'unavailable' };
	}
</script>

<div class="overflow-x-auto">
	<table class="w-full border-collapse text-sm">
		<thead>
			<tr>
				<th class="border p-1 bg-gray-100 sticky left-0 z-20">강의실</th>
				{#each hours as hour}
					<th class="border p-1 bg-gray-100" colspan="2">{hour}</th>
				{/each}
			</tr>
			<tr>
				<th class="border p-1 bg-gray-100 sticky left-0 z-20"></th>
				{#each timeSlots as slot}
					<th class="border p-1 text-center">
						{slot.start.split(':')[1] === '00' ? '00' : '30'}
					</th>
				{/each}
			</tr>
		</thead>
		<tbody>
			{#each sortedAvailability as classroom}
				<tr>
					<td class="border p-1 bg-gray-100 sticky left-0 z-10">{classroom.room_number}</td>
					{#each timeSlots as slot}
						{@const { status, reservationId } = getSlotStatus(classroom, slot)}
						<td
							class="border p-1 relative"
							class:bg-yellow-500={status === 'my-pending'}
							class:bg-green-500={status === 'my-approved'}
							class:bg-red-500={status === 'my-rejected'}
							class:bg-gray-500={status === 'other-reservation'}
							class:bg-white={status === 'available'}
							class:bg-gray-300={status === 'unavailable'}
							class:cursor-pointer={status === 'available' || status === 'my-pending' || status === 'my-approved'}
							class:cursor-not-allowed={status === 'my-rejected' || status === 'other-reservation' || status === 'unavailable'}
							class:hover:bg-blue-100={status === 'available'}
							role="button"
							aria-label={`Reserve ${classroom.room_number} from ${slot.start} to ${slot.end}`}
							aria-disabled={status !== 'available' && status !== 'my-pending' && status !== 'my-approved'}
							on:click={() => {
								if (status === 'available') {
									dispatch('select', { classroom, slot });
								} else if ((status === 'my-pending' || status === 'my-approved') && reservationId) {
									dispatch('cancel', { reservationId });
								}
							}}
						>
							{#if status === 'my-approved'}
								<button
									class="absolute top-0 right-0 text-xs text-white px-1 rounded"
									on:click|stopPropagation={() => dispatch('cancel', { reservationId })}
								>
									승인
								</button>
							{:else if status === 'my-pending'}
								<button
									class="absolute top-0 right-0 text-xs text-white px-1 rounded"
									on:click|stopPropagation={() => dispatch('cancel', { reservationId })}
								>대기
								</button>
							{:else if status === 'my-rejected'}
								<span class="absolute top-0 left-0 text-xs text-white px-1 rounded">
									거절
								</span>
							{/if}

						</td>
					{/each}
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<style>
	:global(.overflow-x-auto) {
		max-width: 100%;
		overflow-x: auto;
	}
	:global(table) {
		min-width: 800px;
	}
	:global(th, td) {
		min-width: 30px;
		padding: 4px;
	}
	:global(thead) {
		position: sticky;
		top: 0;
		z-index: 10;
	}
	:global(.sticky) {
		background: #f3f4f6;
	}
</style>