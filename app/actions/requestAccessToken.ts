"use server"
// Code modified from https://github.com/Lioncat6/SAMBL-React/blob/37791bd8555282b594e85f209201e44893f3e8fb/pages/api/providers/tidal.ts#L4
// Code permanently borrowed from https://github.com/kellnerd/harmony/tree
// Credit to @kellnerd and @outsidecontext
export async function requestAccessToken() {
  const TIDAL_CLIENT_ID = process.env.TIDAL_CLIENT_ID;
  const TIDAL_API_KEY = process.env.TIDAL_API_KEY;
  if (!TIDAL_CLIENT_ID || !TIDAL_API_KEY) {
    console.log('halo', TIDAL_CLIENT_ID, TIDAL_API_KEY, process.env)
    throw new Error("TIDAL_CLIENT_ID and TIDAL_API_KEY must be set in environment variables.");
  }

    // See https://developer.tidal.com/documentation/api-sdk/api-sdk-quick-start
    const url = 'https://auth.tidal.com/v1/oauth2/token';
    const auth = btoa(`${TIDAL_CLIENT_ID}:${TIDAL_API_KEY}`);
    const body = new URLSearchParams();
    body.append('grant_type', 'client_credentials');
    body.append('client_id', TIDAL_CLIENT_ID);

    try {
      const response = await fetch(url, {
          method: 'POST',
          headers: {
              'Authorization': `Basic ${auth}`,
              'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: body,
      });

      const content = await response.json();
      if (!content?.access_token) {
        throw new Error(`Failed to authenticate Tidal! Reason: ${content.error || response.statusText}`);
      }

      return {
          accessToken: content?.access_token,
          validUntilTimestamp: Date.now() + (content.expires_in * 1000),
          expiresIn: content.expires_in,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(message);
    }
}