<script lang="ts">
	import { reservationStore } from '$lib/stores/reservation';
	import { createEventDispatcher } from 'svelte';
	import type { ClassroomAvailability, ClassroomSlot } from '$lib/types';
	const dispatch = createEventDispatcher();

	function selectSlot(classroom: ClassroomAvailability, slot: ClassroomSlot) {
		dispatch('select', { classroom, slot });
	}
</script>

<div class="overflow-x-auto">
	<table class="w-full border-collapse">
		<thead>
			<tr>
				<th class="border p-2">강의실</th>
				{#each ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'] as time}
					<th class="border p-2">{time}</th>
				{/each}
			</tr>
		</thead>
		<tbody>
			{#each $reservationStore.availability as classroom}
				<tr>
					<td class="border p-2">{classroom.classroom_id}</td>
					{#each classroom.slots as slot}
						<td
							class="border p-2 {slot.available ? 'bg-green-100' : 'bg-gray-200'}"
							on:click={() => slot.available && selectSlot(classroom, slot)}
						>
							{slot.available ? '' : 'X'}
						</td>
					{/each}
				</tr>
			{/each}
		</tbody>
	</table>
</div>