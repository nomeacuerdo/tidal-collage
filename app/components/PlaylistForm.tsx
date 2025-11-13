"use client"

import { useState, useEffect, useTransition } from 'react';
import { useRouter } from "next/navigation";
import { getPlaylist, TidalToken } from '../actions/getPlaylist';
import { requestAccessToken } from '../actions/requestAccessToken';

const getStoredToken = (): TidalToken | null => {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("tidal_token");
  if (!raw) return null;
  try {
    const token: TidalToken = JSON.parse(raw);
    if (token.validUntilTimestamp > Date.now()) {
      return token;
    } else {
      localStorage.removeItem("tidal_token");
      return null;
    }
  } catch {
    localStorage.removeItem("tidal_token");
    return null;
  }
};

export default function PlaylistForm() {
  const [playlistUrl, setPlaylistUrl] = useState<string>('');
  const [isPending, startTransition] = useTransition();
  const [isLogingin, setLogin] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<TidalToken | null>(null);
  const router = useRouter();

  useEffect(() => {
    const stored = getStoredToken();
    setToken(stored);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLogin(true);
    setError(null);

    try {
      const authToken: TidalToken = await requestAccessToken();
      localStorage.setItem("tidal_token", JSON.stringify(authToken));
      setToken(authToken);
      setLogin(false);
    } catch (err: any) {
      setLogin(false);
      setError(err.message);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token?.accessToken) {
      setError("Please login with TIDAL first.");
      setToken(null);
      return;
    }

    startTransition(async () => {
      try {
        const { playlistId, data } = await getPlaylist(playlistUrl, token);
        const key = `playlistData:${playlistId}`;

        sessionStorage.setItem(key, JSON.stringify(data));

        // Redirect to character page
        router.push(`/playlist/${playlistId}`);
      } catch (err: any) {
        setError(err.message);
      }
    });
  };

  return (
    <form
      className="w-full"
      onSubmit={handleSubmit}
    >
      <div className="mb-4">
        <label className="block text-xs text-center font-medium text-gray-300">Tidal playlist URL</label>
        <input
          name="playlistUrl"
          className="mt-2 block w-full rounded-lg border-0 bg-gray-800/60 placeholder-gray-400 text-gray-100 py-3 px-4 shadow-inner focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="https://tidal.com/playlist/12345678"
          value={playlistUrl}
          onChange={(e) => setPlaylistUrl(e.target.value)}
        />
      </div>

      <div className="flex flex-col items-center justify-center gap-4">
        <div className="flex gap-2">
          {
            !token?.accessToken && (
              <button className="px-4 py-2 bg-black hover:bg-gray-900 text-white font-semibold rounded-md shadow" onClick={handleLogin}>
                {isLogingin ? "Loading..." : "Login with TIDAL"}
              </button>
          )}
          {
            token?.accessToken && (
              <>
                <button className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-gray-900 font-semibold rounded-md shadow" type="submit">
                  {isPending ? "Loading..." : "Get Playlist"}
                </button>
                <button className="px-4 py-2 bg-transparent text-gray-900 font-semibold rounded-md" onClick={() => setPlaylistUrl('https://tidal.com/playlist/06ad8683-b362-4a9a-bce4-3e0a9ac2d0dd')}>
                  TEH
                </button>
              </>
          )}
        </div>
        <div className="flex gap-2">
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
      </div>
    </form>
  )
}
