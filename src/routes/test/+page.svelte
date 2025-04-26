<script>
  // 도담 열람실 맵 데이터 (엑셀 기반)
  const map = [
    [null, null, null, null, null, null, null, null, null, 52],
    [6, 7, 8, 9, 10, null, 41, 42, null, 53],
    [11,12,13,14,15, null, 43,44, null,54],
    [null,null,null,null,null,null,null,null,null,55],
    [16,17,18,19,20, null,45,46, null,56],
    [21,22,23,24,25, null,47,48, null,57],
    [null,null,null,null,null,null,null,null,null,58],
    [26,27,28,29,30, null,49,50, null,59],
    [31,32,33,34,35, null,null,null,null,60],
  ];

  const cellWidth = 40;
  const cellHeight = 24;
  const padding = 6;
</script>

<svg
  width={(map[0].length * (cellWidth + padding))}
  height={(map.length * (cellHeight + padding))}
  style="background-color: white;"
>
  {#each map as row, rowIndex}
    {#each row as seat, colIndex}
      {#if seat}
        <g>
          <rect
            x={colIndex * (cellWidth + padding)}
            y={rowIndex * (cellHeight + padding)}
            width={cellWidth}
            height={cellHeight}
            fill="#9BE29B"
            stroke="black"
            stroke-width="1"
            rx="4"
            ry="4"
          />
          <text
            x={colIndex * (cellWidth + padding) + cellWidth/2}
            y={rowIndex * (cellHeight + padding) + cellHeight/2 + 4}
            text-anchor="middle"
            fill="white"
            font-size="12"
            font-family="sans-serif"
          >
            {seat}
          </text>
        </g>
      {/if}
    {/each}
  {/each}
</svg>

<style>
svg {
  max-width: 100%;
  height: auto;
}
</style>
