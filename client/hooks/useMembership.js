import axios from 'axios';
import { API_URL, STORAGE_KEYS } from '../constants';

export async function addMembership(username) {
  const result = await axios.post(`${API_URL}/users/`, { username, display_name: username });
  localStorage.setItem(STORAGE_KEYS.MEMBER_ID, String(result.data.id));
}

export async function setMembership(username) {
  const { data } = await axios.get(`${API_URL}/users/`);
  const user = data.find((u) => u.username === username);
  if (!user) throw new Error('Username not found');
  localStorage.setItem(STORAGE_KEYS.MEMBER_ID, String(user.id));
}
