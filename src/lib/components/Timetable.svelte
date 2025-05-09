
<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { reservationStore } from '$lib/stores/reservation';
	import type { ClassroomAvailability } from '$lib/types';

	const dispatch = createEventDispatcher();

	// Props
	export let selectedDate: Date;

	// 강의실 데이터 정렬 및 슬롯 필터링
	let availability: ClassroomAvailability[] = [];
	$: sortedAvailability = $reservationStore.availability
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
	const hours = Array.from({ length: 13 }, (_, i) => 9 + i); // 9 to 21
	const timeSlots = hours.flatMap((hour) => [
		{ start: `${hour.toString().padStart(2, '0')}:00`, end: `${hour.toString().padStart(2, '0')}:30` },
		{ start: `${hour.toString().padStart(2, '0')}:30`, end: `${(hour + 1).toString().padStart(2, '0')}:00` }
	]);

	// 현재 시각 (KST, 브라우저 시간대)
	const now = new Date();

	// 슬롯이 과거인지 확인
	function isPastSlot(slot: { start: string; end: string }): boolean {
		const slotDate = new Date(`${selectedDate.toISOString().split('T')[0]}T${slot.start}:00+09:00`);
		return slotDate < now;
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
						{@const slotData = classroom.slots.find((s) => s.start === slot.start && s.end === slot.end)}
						{@const isPast = isPastSlot(slot)}
						<td
							class="border p-1"
							class:bg-gray-300={!slotData?.available || isPast}
							class:cursor-not-allowed={!slotData?.available || isPast}
							class:hover:bg-blue-100={slotData?.available && !isPast}
							class:cursor-pointer={slotData?.available && !isPast}
							role="button"
							aria-label={`Reserve ${classroom.room_number} from ${slot.start} to ${slot.end}`}
							aria-disabled={!slotData?.available || isPast}
							on:click={() => slotData?.available && !isPast && dispatch('select', { classroom, slot })}
						></td>
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