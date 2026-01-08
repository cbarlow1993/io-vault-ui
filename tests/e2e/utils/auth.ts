import axios from 'axios';

export async function fetchAuthToken(
  clientId: string,
  clientSecret: string,
  authUrl: string
): Promise<string> {
  const response = await axios.post(authUrl, {
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
  });

  return response.data.access_token;
}
