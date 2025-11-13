"use client"
import { useEffect, useState, useRef } from 'react';
import { getPlaylist } from '../actions/getPlaylist';
import Toast from './Toast';
import CollageGrid from './CollageGrid';

const PRESETS = [
  { label: '1080 × 1920 (IG Story)', value: '1080x1920' },
  { label: '1920 × 1080', value: '1920x1080' },
  { label: '1080 × 1080', value: '1080x1080' },
];

export default function PlaylistFetcher({ playlistId }: { playlistId: string; }) {
  const [resolution, setResolution] = useState(PRESETS[0].value);
  const [playlistData, setPlaylistData] = useState<string[]>([]);
  const [columns, setColumns] = useState<number>(3);
  const [canvasW, canvasH] = resolution.split('x').map(Number);
  const [isDownloading, setIsDownloading] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [toast, setToast] = useState<{show: boolean; message: string}>({ show: false, message: '' });

  const downloadCollage = async () => {
    if (playlistData?.length === 0) return

    setIsDownloading(true)

    // Determine columns; if not set, derive a sensible default from the canvas width
    const defaultCols = Math.max(1, Math.floor(canvasW / 200))
    const colsCount = columns ?? defaultCols
    const rows = Math.ceil((playlistData?.length || 0) / colsCount)

    // Canvas size is defined by the selected resolution
    const canvasWidth = canvasW
    const canvasHeight = canvasH

    // Tile size is derived from the canvas size and the grid (no gaps)
    const tileW = Math.floor(canvasWidth / colsCount)
    const tileH = tileW // always square

    // Adjust canvas height to fit all rows of square tiles
    const canvasHeightAdjusted = tileH * rows

    const canvas = document.createElement('canvas')
    canvas.width = canvasWidth
    canvas.height = canvasHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Fill background
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Draw each tile by using imageUrl directly
    for (let i = 0; i < (playlistData?.length || 0); i++) {
      const imageUrl = playlistData[i];
      const row = Math.floor(i / colsCount);
      const col = i % colsCount;

      // For the last row, center tiles horizontally if not full
      let x = col * tileW;
      const y = row * tileH + ((canvasHeight - canvasHeightAdjusted) / 2); // center vertically if needed
      if (row === rows - 1) {
        const tilesInLastRow = playlistData?.length - (rows - 1) * colsCount;
        if (tilesInLastRow < colsCount) {
          const emptySpace = (canvasWidth - tilesInLastRow * tileW) / 2;
          x = col * tileW + emptySpace;
        }
      }

      try {
        const img = document.createElement('img');
        img.crossOrigin = 'anonymous';
        img.src = `/api/image-proxy?url=${encodeURIComponent(imageUrl)}`;
        await new Promise((res, rej) => {
          img.onload = res;
          img.onerror = rej;
        });
        ctx.drawImage(img, x, y, tileW, tileH);
      } catch (err) {
        // fallback: draw placeholder box
        ctx.fillStyle = '#e5e7eb';
        ctx.fillRect(x, y, tileW, tileH);
      }
    }

    const url = canvas.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = url
    a.download = `tidal-collage-${Date.now()}.png`
    a.click()

    setIsDownloading(false)
    setToast({ show: true, message: 'Download ready' })
  };

  useEffect(() => {
    // Try to get playlist data from localStorage by playlistId
    const key = `playlistData:${playlistId}`;
    const raw = sessionStorage.getItem(key);
    if (raw) {
      try {
        const data = JSON.parse(raw);
        setPlaylistData(data);
        return;
      } catch {
        setPlaylistData([]);
      }
    }

    // If not found, try to fetch using getPlaylist and token
    const tokenRaw = sessionStorage.getItem("tidal_token");
    let token = null;
    try {
      token = tokenRaw ? JSON.parse(tokenRaw).accessToken : null;
    } catch {}

    if (!token) {
      setPlaylistData([]);
      return;
    }

    (async () => {
      try {
        const { data } = await getPlaylist(playlistId, token);
        setPlaylistData([...data]);
        sessionStorage.setItem(key, JSON.stringify(data));
      } catch {
        setPlaylistData([]);
      }
    })();
  }, [playlistId]);

  const previewDefaultCols = Math.max(1, Math.floor(canvasW / 200))
  const previewCols = columns ?? previewDefaultCols
  const previewTileW = Math.floor(canvasW / previewCols)

  return (
    <div className="mt-6">
      <div className="flex items-end justify-between mb-4">
        <h2 className="text-xl font-semibold">Playlist — {playlistData?.length || 0} tracks</h2>
        <div className="w-60">
          <label className="block text-xs text-center font-medium text-gray-300">Resolution</label>
          <select
            className="mt-2 block w-full rounded-md bg-gray-800/60 text-gray-100 py-2 px-3 border-0 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
          >
            {PRESETS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm">Columns: {columns ?? previewDefaultCols}</label>
          <input type="range" min={1} max={12} value={columns ?? previewDefaultCols} onChange={(e) => setColumns(Number(e.target.value))} />
          <button
            className="px-3 py-1 bg-green-600 text-white rounded"
            onClick={downloadCollage}
            disabled={isDownloading}
          >
            {isDownloading ? 'Generating…' : 'Download'}
          </button>
        </div>
      </div>

      <div ref={rootRef} className='flex justify-center justify-items-center content-center items-center w-full'>
        <CollageGrid albums={playlistData} tileWidth={previewTileW} columns={previewCols} canvasW={canvasW} canvasH={canvasH} />
      </div>

      {/* Toast */}
      {toast.show && (
        <Toast message={toast.message} show={toast.show} onClose={() => setToast({ show: false, message: '' })} />
      )}
    </div>
  );
}