import axios from 'axios';

const API = process.env.API_URL ?? '';

export async function addMembership(username) {
  const result = await axios.post(`${API}/users/`, {
    username,
    display_name: username,
  });
  localStorage.setItem('member_id', String(result.data.id));
}

export async function setMembership(username) {
  const { data } = await axios.get(`${API}/users/`);
  const user = data.find((u) => u.username === username);
  if (!user) throw new Error('Username not found');
  localStorage.setItem('member_id', String(user.id));
}

export async function logOut() {
  localStorage.removeItem('member_id');
  localStorage.removeItem('household_id');
}
