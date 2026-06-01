import axios from 'axios';

const API = process.env.API_URL ?? '';

export async function addHousehold(member_id, housename) {
  const resultCreate = await axios.post(`${API}/households/`, { name: housename });
  const result = await axios.post(`${API}/member/join/`, {
    user_id: member_id,
    household_id: resultCreate.data.id,
  });
  localStorage.setItem('household_id', String(resultCreate.data.id));
  localStorage.setItem('household_member_id', String(result.data.id));
}

export async function joinHousehold(member_id, household_id) {
  const result = await axios.post(`${API}/member/join/`, {
    user_id: member_id,
    household_id,
  });
  localStorage.setItem('household_id', household_id);
  localStorage.setItem('household_member_id', String(result.data.id));
}
