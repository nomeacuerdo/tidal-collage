import React from 'react'

export default function CollageGrid({ albums, tileWidth, canvasW, canvasH, columns }: { albums: string[]; tileWidth: number; canvasW: number; canvasH: number; columns?: number }) {
  const maxContainer = 800;
  const numberOfAlbums = albums?.length || 0;
  const defaultCols = Math.max(1, Math.floor(maxContainer / Math.max(1, tileWidth)));
  const cols = columns ?? defaultCols;
  const rows = Math.ceil(numberOfAlbums / cols);
  const visualScale = (tileWidth * cols) < maxContainer ? 2 : 2.5;

  // Use fixed pixel columns so the preview matches the exported tiles
  // Center grid horizontally using flex and auto margins
  return (
    <div className={`album-grid overflow-hidden flex items-center justify-center bg-black`} data-testid="collage-root" style={{ width: canvasW / visualScale, height: canvasH / visualScale, transformOrigin: 'top left', margin: '0 auto' }}>
      <div
        className="grid justify-items-center"
        style={{ gridTemplateColumns: `repeat(${cols}, ${tileWidth / visualScale}px)`, gridTemplateRows: `repeat(${rows}, ${tileWidth / visualScale}px)`,gap: '0' }}
      >
        {albums?.map((t, i) => {
          // Center last row if not full
          const row = Math.floor(i / cols)
          const isLastRow = row === Math.floor((numberOfAlbums - 1) / cols)
          const tilesInLastRow = numberOfAlbums - row * cols
          const isPartialRow = isLastRow && tilesInLastRow < cols
          const marginLeft = isPartialRow 
            ? `${((cols - tilesInLastRow) * tileWidth) / visualScale}px`
            : undefined
          return (
            <div
              key={i}
              className="relative bg-gray-800 rounded overflow-hidden shadow-lg hover:scale-105 transform transition-transform border border-gray-700"
              style={{
                width: tileWidth / visualScale,
                height: tileWidth / visualScale,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginLeft,
              }}
            >
              <img src={t} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
