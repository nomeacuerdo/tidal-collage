"use server"
import { createAPIClient } from '@tidal-music/api';

function extractPlaylistId(url: string) {
  try {
    const u = new URL(url);
    const parts = u.pathname.split('/').filter(Boolean);
    return parts[parts.length - 1];
  } catch (e) {
    return url;
  }
}

export type TidalToken = {
  accessToken: string;
  validUntilTimestamp: number;
  expiresIn: number;
};

type TidalCredentials = {
    clientId: string;
    clientSecret: string;
    token: string;
    expires: number;
    requestedScopes: Array<string>;
};

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
}

const TIDAL_BASE = process.env.TIDAL_BASE_URL || 'https://api.tidal.com/v2';
const TIDAL_CLIENT_ID = process.env.TIDAL_CLIENT_ID;
const TIDAL_API_KEY = process.env.TIDAL_API_KEY;

let credentials: TidalCredentials | null = null;
const listeners: Array<(event: any) => void> = [];
const nodeCredentialsProvider = {
    bus: (callback: any) => {
        listeners.push(callback);
    },
    getCredentials: async (): Promise<TidalCredentials> => {
        if (!credentials) {
            throw new Error("No credentials available");
        }
        return credentials;
    },
    // Helper for updating credentials and notifying listeners
    _setCredentials: (newCreds: TidalCredentials) => {
        credentials = newCreds;
        const event = { 
            type: 'CredentialsUpdatedMessage', 
            payload: credentials 
        };
        listeners.forEach(fn => fn(event));
    }
};

const getPlaylist = async (
  playlistUrl: string,
  token: TidalToken
): Promise<{ playlistId: string; data: string[] }> => {
  const playlistId = extractPlaylistId(playlistUrl);
  // const url = `${TIDAL_BASE}/playlists/${playlistId}`;

  try {
    if (!playlistId || !TIDAL_CLIENT_ID || !TIDAL_API_KEY || !token) {
      throw new Error('Missing playlistId, API key, or auth token');
    }

    if (!token.validUntilTimestamp || token.validUntilTimestamp < Date.now()) {
      throw new Error('TIDAL access token is expired. Please re-authenticate.');
    }

    nodeCredentialsProvider._setCredentials({
      clientId: TIDAL_CLIENT_ID,
      clientSecret: TIDAL_API_KEY,
      token: token.accessToken,
      expires: token.expiresIn,
      requestedScopes: []
    });

    const tidalApi = createAPIClient(nodeCredentialsProvider);
    const playlistData = await tidalApi.GET('/playlists/{id}/relationships/items', {
      params: {
        path: { id: playlistId },
        query: { countryCode: 'US', include: [] },
      },
    });

    if (playlistData.error) throw new Error(playlistData.error?.errors?.[0]?.detail || 'API error fetching playlist');

    const tracks = playlistData?.data?.data?.map(item => item?.id);
    const trackData = await tidalApi.GET('/tracks', {
      params: {
        query: { countryCode: 'US', include: ['albums', 'sourceFile'], "filter[id]": tracks },
      },
    });

    if (trackData.error) throw new Error(trackData.error?.errors?.[0]?.detail || 'API error fetching tracks');

    const albums = trackData?.data?.included?.map(item => item?.id);
    const { data, error } = await tidalApi.GET('/albums', {
      params: {
        query: { countryCode: 'US', include: ['coverArt'], "filter[id]": albums },
      },
    });

    if (error) throw new Error(error?.errors?.[0]?.detail || 'API error fetching albums');
    
    const width320Items = data?.included?.reduce((acc: string[], inc: any): string[] => {
      if (Array.isArray(inc.attributes?.files)) {
        const filtered = inc.attributes.files.filter((file: any) => file.meta.width === 320);
        acc.push(filtered[0].href);
      }
      return acc;
    }, []);

    const filteredData: string[] = (width320Items?.filter((item: string) => !item.includes('video'))) ?? [];

    console.log('sss', filteredData);

    return { playlistId, data: filteredData };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(message);
  }
};

export {
  getStoredToken,
  getPlaylist,
};
