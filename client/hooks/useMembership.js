import axios from 'axios';

export async function addMembership(username) {
  const result = await axios.post('/users/', { username, display_name: username });
  localStorage.setItem('member_id', String(result.data.id));
}

export async function setMembership(username) {
  const { data } = await axios.get('/users/');
  const user = data.find((u) => u.username === username);
  if (!user) throw new Error('Username not found');
  localStorage.setItem('member_id', String(user.id));
}
