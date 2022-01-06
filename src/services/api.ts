import axios from 'axios';

/* const { CLIENT_ID } = process.env;
 */
const api = axios.create({
  /* headers: {
    'Client-Id': CLIENT_ID,
  }, */
  baseURL: 'https://api.twitch.tv/helix',
});

export { api };
