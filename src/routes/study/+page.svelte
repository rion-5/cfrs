<script lang="ts">
	import { onMount } from 'svelte';
	import type { Room } from '$lib/types/Room';
	import type { Reservation } from '$lib/types/Reservation';

  let date = new Date().toISOString().split('T')[0];
	let rooms: Room[] = [];
	let reservations: Reservation[] = [];
	let userId = '2023001234'; // 로그인 사용자 ID, 실제 로그인 상태에서 가져와야 함

	async function fetchData() {
		const roomRes = await fetch('/api/rooms?type=STUDY');
		rooms = await roomRes.json();
    
		const resvRes = await fetch(`/api/reservations?inquery_date=${date}`);
		reservations = await resvRes.json();
    // console.log(reservations)
	}

	onMount(() => {
		fetchData();

	});

  const HOURS = Array.from({ length: 14 }, (_, i) => i + 9);

	function isReserved(roomId: number, hour: number) {
		return reservations.some(
			(r) =>
        r.room_id === roomId &&
        r.start_time.startsWith(date) &&
        new Date(r.start_time).getHours() === hour
		);
	}

	function isMine(roomId: number, hour: number) {
		return reservations.some(
			(r) =>
				r.room_id === roomId &&
        r.start_time.startsWith(date) &&
        new Date(r.start_time).getHours() === hour &&
				r.user_id === userId
		);
	}

  function handleClick(roomId: number, hour: number) {
    const mine = isMine(roomId, hour);
    const reserved = isReserved(roomId, hour);
    console.log(reserved);
    if (mine) {
      if (confirm(`${hour}시 예약을 취소하시겠습니까?`)) {
        // 예약 취소 API 호출
        console.log('예약 취소');
      }
    } else if (!reserved) {
      const nextHour = hour + 1;
      const nextAvailable = !isReserved(roomId, nextHour);
      const msg = `${hour}시에 예약되었습니다.` + (nextAvailable ? ` ${nextHour}시도 예약하시겠습니까?` : '');

      if (confirm(msg)) {
        // 예약 API 호출 (hour 예약)
        console.log(`${hour}시 예약`);

        if (nextAvailable && confirm(`${nextHour}시도 예약할까요?`)) {
          console.log(`${nextHour}시도 예약`);
        }
      }
    }
  }
</script>


<style>
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
  .btn.available { background-color: #3b82f6; } /* 파란색 */
  .btn.mine { background-color: #ef4444; }      /* 빨간색 */
  .btn.reserved { background-color: #d1d5db; }  /* 회색 */
</style>
<h1>토론실 예약</h1>

<label for="date">날짜 선택</label>
<input type="date" id="date" bind:value={date} on:change={fetchData} />

{#each rooms as room}
  <div class="room">
    <h3>{room.name}</h3>
    <div>
      {#each HOURS as hour}
        <button
          class="btn {isMine(room.id, hour) ? 'mine' : isReserved(room.id, hour) ? 'reserved' : 'available'}"
          on:click={() => handleClick(room.id, hour)}>
          {hour}
        </button>
      {/each}
    </div>
  </div>
{/each}