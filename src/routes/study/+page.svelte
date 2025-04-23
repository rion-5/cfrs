<script lang="ts">
	import { onMount } from 'svelte';
	import type { Room } from '$lib/types/Room';
	import type { Reservation } from '$lib/types/Reservation';

	let date = new Date().toISOString().split('T')[0];
	let rooms: Room[] = [];
	let reservations: Reservation[] = [];
	let userId = '2023001234';

	const HOURS = Array.from({ length: 14 }, (_, i) => i + 9);

	const dates = Array.from({ length: 3 }, (_, i) => {
		const d = new Date();
		d.setDate(d.getDate() + i);
		return d.toISOString().split('T')[0];
	});

	async function fetchData() {
		const roomRes = await fetch('/api/rooms?type=STUDY');
		rooms = await roomRes.json();

		const resvRes = await fetch(`/api/reservations?inquery_date=${date}`);
		reservations = await resvRes.json();
	}

	onMount(() => {
		fetchData();
	});

	// function isReserved(roomId: number, hour: number): boolean {
	// 	return reservations.some((r) => {
	// 		if (r.room_id !== roomId) return false;
	// 		const startDateUTC = new Date(r.start_time);
	// 		const startDateKST = new Date(startDateUTC.getTime() + 9 * 60 * 60 * 1000);
	// 		const kstDateStr = startDateKST.toISOString().split('T')[0];
	// 		return kstDateStr === date && startDateKST.getHours() === hour;
	// 	});
	// }

	function isReserved(roomId: number, hour: number): boolean {
	return reservations.some((r) => {
		if (r.room_id !== roomId) return false;

		//const startDateUTC = new Date(r.start_time);
		// const startDateKST = new Date(startDateUTC.getTime() + 9 * 60 * 60 * 1000);
		
		const startDateKST = new Date(r.start_time);
		const kstHour = startDateKST.getHours();
		const kstDateStr = startDateKST.toISOString().split('T')[0];

		//console.log(`startDateUTC ${startDateUTC}   startDateKST ${startDateKST}`);

		if (kstDateStr === date && kstHour === hour) {
			// console.log(`[DEBUG] room ${roomId}, 예약 matched at ${kstHour}시 (버튼 hour=${hour})`);
			return true;
		} else {
			// console.log(`[SKIP] room ${roomId}, KST=${kstHour}시, 버튼 hour=${hour}`);
			return false;
		}
	});
}

	function isMine(roomId: number, hour: number): boolean {
		return reservations.some((r) => {
			const startDateUTC = new Date(r.start_time);
			const startDateKST = new Date(startDateUTC.getTime() + 9 * 60 * 60 * 1000);
			const kstDateStr = startDateKST.toISOString().split('T')[0];
			return (
				r.room_id === roomId &&
				kstDateStr === date &&
				startDateKST.getHours() === hour &&
				r.user_id === userId
			);
		});
	}

	function handleClick(roomId: number, hour: number) {
		const mine = isMine(roomId, hour);
		const reserved = isReserved(roomId, hour);
		if (mine) {
			if (confirm(`${hour}시 예약을 취소하시겠습니까?`)) {
				console.log('예약 취소');
			}
		} else if (!reserved) {
			const nextHour = hour + 1;
			const nextAvailable = !isReserved(roomId, nextHour);
			const msg = `${hour}시에 예약되었습니다.` + (nextAvailable ? ` ${nextHour}시도 예약하시겠습니까?` : '');
			if (confirm(msg)) {
				console.log(`${hour}시 예약`);
				if (nextAvailable && confirm(`${nextHour}시도 예약할까요?`)) {
					console.log(`${nextHour}시도 예약`);
				}
			}
		}
	}
</script>

<style>
	.date-tab {
		display: flex;
		gap: 1rem;
		margin-bottom: 1rem;
	}
	.date-tab button {
		padding: 0.5rem 1rem;
		border-radius: 0.5rem;
		font-weight: bold;
		cursor: pointer;
		border: 2px solid transparent;
	}
	.date-tab button.active {
		border-color: #3b82f6;
		background-color: #dbeafe;
	}

	.room { margin-bottom: 2rem; }
	.btn {
		margin: 0.2rem;
		padding: 0.6rem;
		width: 2.5rem;
		border-radius: 0.5rem;
		text-align: center;
		font-weight: bold;
		color: white;
		border: none;
	}
	.btn.available { background-color: #3b82f6; }
	.btn.mine { background-color: #ef4444; }
	.btn.reserved { background-color: #d1d5db; }
	.btn-info {
		font-size: 0.6rem;
		color: #6b7280;
		text-align: center;
		margin-top: 0.2rem;
	}
</style>

<h1>토론실 예약</h1>

<div class="date-tab">
	{#each dates as d}
		<button class:active={d === date} on:click={() => { date = d; fetchData(); }}>
			{d}
		</button>
	{/each}
</div>

{#each rooms as room}
	<div class="room">
		<h3>{room.name}</h3>
		<div>
			{#each HOURS as hour}
				<div style="display: inline-block; text-align: center;">
					<button
						class="btn {isMine(room.id, hour) ? 'mine' : isReserved(room.id, hour) ? 'reserved' : 'available'}"
						on:click={() => handleClick(room.id, hour)}>
						{hour}
					</button>
					<div class="btn-info">
						{#each reservations.filter(r => r.room_id === room.id) as r}
							<!-- {@const utc = new Date(r.start_time)}
							{@const kst = new Date(utc.getTime() + 9 * 60 * 60 * 1000)}
							{#if utc.getHours() === hour}
								<div>
									{utc.toISOString().slice(11, 16)} → {kst.toISOString().slice(11, 16)}<br />
									({kst.toISOString().split('T')[0]})
								</div>
							{/if} -->
						{/each}
					</div>
				</div>
			{/each}
		</div>
	</div>
{/each}
