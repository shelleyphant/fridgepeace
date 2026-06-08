import { useState, useEffect } from 'react';
import axios from 'axios';

const API = process.env.API_URL ?? '';

export async function addHousehold(member_id, housename) {
  const resultCreate = await axios.post(`${API}/households/`, { name: housename });
  const result = await axios.post(`${API}/member/join/`, {
    user_id: member_id,
    household_id: resultCreate.data.id,
  });
  localStorage.setItem('household_id', String(resultCreate.data.id));
}

export async function getMemberHousehold(member_id) {
  const { data } = await axios.get(`${API}/member/${member_id}/households`);
  if (data?.length) {
    localStorage.setItem('household_id', String(data[0].id));
    return true;
  }
  return false;
}

export async function joinHousehold(member_id, household_id) {
  const result = await axios.post(`${API}/member/join/`, {
    user_id: member_id,
    household_id,
  });
  localStorage.setItem('household_id', household_id);
}

export function useHousehold(household_id) {
  const [household, setHousehold] = useState(null);

  useEffect(() => {
    if (!household_id) return;
    axios.get(`${API}/households/${household_id}`).then((r) => setHousehold(r.data));
  }, [household_id]);

  return household;
}

export async function leaveHousehold() {
  localStorage.removeItem('household_id');
}
