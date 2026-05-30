import axios from 'axios';

export async function addHousehold(housename) {
  const result = await axios.post('/households/', { name: housename });
  localStorage.setItem('household_id', String(result.data.id));
}

export async function joinHousehold(member_id, household_id) {
  const result = await axios.get('/member/join/', { member_id, household_id });
  localStorage.setItem('household_id', household_id);
}
