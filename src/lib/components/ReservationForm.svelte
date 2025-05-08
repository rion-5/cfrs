<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { auth } from '$lib/stores/auth';
	import { formatDateToYYYYMMDD } from '$lib/utils/date';
	import type { ReservationFormData, ClassroomAvailability } from '$lib/types';
	const dispatch = createEventDispatcher();

	export let classroom: { classroom: ClassroomAvailability; slot: { start: string; end: string } };
	export let date: Date;

	let formData: ReservationFormData = {
		classroom_id: classroom.classroom.classroom_id,
		user_id: $auth.id_no || '',
		purpose: '',
		attendees: 1,
		email: $auth.email || '',
		tel: $auth.tel || '',
		start_time: classroom.slot.start,
		end_time: classroom.slot.end,
		reservation_date: formatDateToYYYYMMDD(date)
	};

	function submit() {
		if (!formData.purpose || formData.attendees <= 0) {
			alert('사용 목적과 이용 인원을 입력하세요.');
			return;
		}
		dispatch('submit', formData);
	}
</script>

<form on:submit|preventDefault={submit} class="space-y-4">
	<div>
		<label for="user_id" class="block text-sm font-medium">사용자 ID</label>
		<input
			id="user_id"
			type="text"
			value={formData.user_id}
			readonly
			class="w-full p-2 border rounded"
		/>
	</div>
	<div>
		<label for="purpose" class="block text-sm font-medium">사용 목적</label>
		<input
			id="purpose"
			type="text"
			bind:value={formData.purpose}
			class="w-full p-2 border rounded"
			required
		/>
	</div>
	<div>
		<label for="attendees" class="block text-sm font-medium">이용 인원</label>
		<input
			id="attendees"
			type="number"
			bind:value={formData.attendees}
			min="1"
			class="w-full p-2 border rounded"
			required
		/>
	</div>
	<div>
		<label for="email" class="block text-sm font-medium">이메일 (선택)</label>
		<input
			id="email"
			type="email"
			bind:value={formData.email}
			class="w-full p-2 border rounded"
		/>
	</div>
	<div>
		<label for="tel" class="block text-sm font-medium">전화번호 (선택)</label>
		<input
			id="tel"
			type="tel"
			bind:value={formData.tel}
			class="w-full p-2 border rounded"
		/>
	</div>
	<div class="flex justify-between">
		<button
			type="button"
			class="bg-gray-500 text-white py-2 px-4 rounded"
			on:click={() => dispatch('cancel')}
		>
			취소
		</button>
		<button
			type="submit"
			class="bg-blue-500 text-white py-2 px-4 rounded"
		>
			예약 신청
		</button>
	</div>
</form>