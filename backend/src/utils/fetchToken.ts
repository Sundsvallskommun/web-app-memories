import axios from 'axios';
import qs from 'qs';
import { API_BASE_URL, CLIENT_KEY, CLIENT_SECRET } from '@/config';
import { Token } from '@interfaces/api-token.interface';

export async function fetchApiToken(): Promise<Token> {
  const authString = Buffer.from(`${CLIENT_KEY}:${CLIENT_SECRET}`, 'utf-8').toString('base64');

  const { data } = await axios({
    timeout: 30000,
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + authString,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    data: qs.stringify({ grant_type: 'client_credentials' }),
    url: `${API_BASE_URL}/token`,
  });

  return data as Token;
}
