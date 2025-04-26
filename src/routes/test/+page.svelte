<script lang="ts">
  export let seats = Array.from({ length: 60 }, (_, i) => i + 1);
  export let usedSeats: number[] = [];
  export let mySeat: number | null = null;


	const seatPositions: Record<number, { x: number; y: number }> = {
  // 오른쪽부터 왼쪽으로 내려오는 좌석
  1: { x: 400, y: 50 },
  2: { x: 350, y: 50 },
  3: { x: 300, y: 50 },
  4: { x: 250, y: 50 },
  5: { x: 200, y: 50 },

  6: { x: 400, y: 100 },
  7: { x: 350, y: 100 },
  8: { x: 300, y: 100 },
  9: { x: 250, y: 100 },
  10: { x: 200, y: 100 },

  11: { x: 400, y: 150 },
  12: { x: 350, y: 150 },
  13: { x: 300, y: 150 },
  14: { x: 250, y: 150 },
  15: { x: 200, y: 150 },

  16: { x: 400, y: 200 },
  17: { x: 350, y: 200 },
  18: { x: 300, y: 200 },
  19: { x: 250, y: 200 },
  20: { x: 200, y: 200 },

  21: { x: 400, y: 250 },
  22: { x: 350, y: 250 },
  23: { x: 300, y: 250 },
  24: { x: 250, y: 250 },
  25: { x: 200, y: 250 },

  26: { x: 400, y: 300 },
  27: { x: 350, y: 300 },
  28: { x: 300, y: 300 },
  29: { x: 250, y: 300 },
  30: { x: 200, y: 300 },

  31: { x: 400, y: 350 },
  32: { x: 350, y: 350 },
  33: { x: 300, y: 350 },
  34: { x: 250, y: 350 },
  35: { x: 200, y: 350 },

  36: { x: 400, y: 400 },
  37: { x: 350, y: 400 },
  38: { x: 300, y: 400 },

  39: { x: 100, y: 500 },
  40: { x: 150, y: 500 },
  41: { x: 100, y: 550 },
  42: { x: 150, y: 550 },
  43: { x: 100, y: 600 },
  44: { x: 150, y: 600 },
  45: { x: 100, y: 650 },
  46: { x: 150, y: 650 },
  47: { x: 100, y: 700 },
  48: { x: 150, y: 700 },
  49: { x: 100, y: 750 },
  50: { x: 150, y: 750 },

  51: { x: 0, y: 500 },
  52: { x: 0, y: 550 },
  53: { x: 0, y: 600 },
  54: { x: 0, y: 650 },
  55: { x: 0, y: 700 },
  56: { x: 0, y: 750 },
  57: { x: 0, y: 800 },
  58: { x: 0, y: 850 },
  59: { x: 0, y: 900 },
  60: { x: 0, y: 950 },
};

  function selectSeat(seat: number) {
    if (usedSeats.includes(seat) && mySeat !== seat) return;
    if (mySeat === seat) {
      mySeat = null; // 이미 선택한 거 클릭하면 취소
    } else {
      mySeat = seat;
    }
  }

  function handleKeydown(event: KeyboardEvent, seat: number) {
    if (event.key === 'Enter' || event.key === ' ') {
      selectSeat(seat);
    }
  }
	function getX(seat: number) {
  return seatPositions[seat]?.x ?? 0;
}

function getY(seat: number) {
  return seatPositions[seat]?.y ?? 0;
}

</script>

<svg viewBox="0 0 500 800" class="w-full h-auto">
  <text x="250" y="780" text-anchor="middle" font-size="20">입구</text>

  {#each seats as seat (seat)}
    <foreignObject
      x={getX(seat)}
      y={getY(seat)}
      width="40"
      height="40"
      style="overflow: visible;"
    >
      <button
        type="button"
        tabindex="0"
        class="w-10 h-10 rounded-md font-bold text-white text-sm flex items-center justify-center
          {mySeat === seat
            ? 'bg-red-500'
            : usedSeats.includes(seat)
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-green-500 hover:bg-green-600'}"
        on:click={() => selectSeat(seat)}
        on:keydown={(e) => handleKeydown(e, seat)}
        disabled={usedSeats.includes(seat) && mySeat !== seat}
      >
        {seat}
      </button>
    </foreignObject>
  {/each}
</svg>

<style>
  button:focus {
    outline: 2px solid blue;
  }
</style>

