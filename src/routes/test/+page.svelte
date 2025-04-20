<script lang="ts">
	import { onMount } from 'svelte';
	import type { Room } from '$lib/types/Room';
	import type { Reservation } from '$lib/types/Reservation';

  // let date = new Date().toISOString().split('T')[0];
	let rooms: Room[] = [];
	// let reservations: Reservation[] = [];
	let user_id = '2023001234'; // 로그인 사용자 ID, 실제 로그인 상태에서 가져와야 함

	// async function fetchData() {
	// 	const roomRes = await fetch('/api/rooms?type=STUDY');
	// 	rooms = await roomRes.json();
    
	// 	const resvRes = await fetch(`/api/reservations?inquery_date=${date}`);
	// 	reservations = await resvRes.json();
  //   console.log(reservations)
	// }

	// onMount(()=>{
	// 	fetchData();
	// })
	const HOURS = Array.from({ length: 14 }, (_, i) => i + 9);
	console.log(HOURS);

// ✅ 테스트용 데이터
const date = '2025-04-19';

const reservations = [
  {
    room_id: 1,
    start_time: '2025-04-19T09:00:00.000Z' // 18:00 KST (UTC 기준)
  },
  {
    room_id: 1,
    start_time: '2025-04-19T13:00:00.000Z' // 22:00 KST
  },
  {
    room_id: 2,
    start_time: '2025-04-19T09:00:00.000Z'
  }
];
function isReserved(roomId: number, hour: number) {
		return reservations.some(
			(r) => 
				{
					if (r.room_id !== roomId) return false;
					console.log(date);
					if (!r.start_time.startsWith(date)) return false;
					return new Date(r.start_time).getHours() === hour;
				}
		);
	}


// ✅ 테스트 실행
console.log(isReserved(1, 18)); // true
console.log(isReserved(1, 22)); // true
console.log(isReserved(1, 9));  // false
console.log(isReserved(2, 18)); // true
console.log(isReserved(2, 9));  // false


</script>

{#each rooms as room}
	<p>[ {room.id} / {room.name} ]</p> 
{/each}

{#each reservations as reservation}
	<p>[ {reservation.room_id}  -- {reservation.start_time}] </p>
{/each}


