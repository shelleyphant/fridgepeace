import axios from 'axios';
import { API_URL, STORAGE_KEYS } from '../constants';

export async function addHousehold(member_id, housename) {
  const resultCreate = await axios.post(`${API_URL}/households/`, { name: housename });
  const result = await axios.post(`${API_URL}/member/join/`, {
    user_id: member_id,
    household_id: resultCreate.data.id,
  });
  localStorage.setItem(STORAGE_KEYS.HOUSEHOLD_ID, String(resultCreate.data.id));
  localStorage.setItem(STORAGE_KEYS.HOUSEHOLD_MEMBER_ID, String(result.data.id));
}

export async function joinHousehold(member_id, household_id) {
  const result = await axios.post(`${API_URL}/member/join/`, {
    user_id: member_id,
    household_id,
  });
  localStorage.setItem(STORAGE_KEYS.HOUSEHOLD_ID, household_id);
  localStorage.setItem(STORAGE_KEYS.HOUSEHOLD_MEMBER_ID, String(result.data.id));
}
