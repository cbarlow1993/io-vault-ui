import axios from 'axios';

export async function fetchAuthToken(
  clientId: string,
  clientSecret: string,
  authUrl: string
): Promise<string> {
  try {
    const response = await axios.post(authUrl, {
      clientId,
      clientSecret,
    });

    // Handle different response formats
    const token = response.data.access_token || response.data.accessToken || response.data.token;

    if (!token) {
      console.error('[Auth] No token in response. Response data:', JSON.stringify(response.data, null, 2));
      throw new Error('No access token in auth response');
    }

    return token;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('[Auth] Request failed:', error.response?.status, error.response?.data);
    }
    throw error;
  }
}
