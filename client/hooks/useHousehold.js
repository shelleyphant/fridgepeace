import axios from 'axios';

export async function addHousehold(member_id, housename) {
  const resultCreate = await axios.post('/households/', { name: housename });
  const result = await axios.post('/member/join/', {
    member_id,
    household_id: resultCreate.data.id,
  });
  localStorage.setItem('household_id', String(result.data.id));
}

export async function joinHousehold(member_id, household_id) {
  const result = await axios.post('/member/join/', { member_id, household_id });
  localStorage.setItem('household_id', household_id);
}
