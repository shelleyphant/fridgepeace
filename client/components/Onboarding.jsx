import React, { useState } from 'react';
import axios from 'axios';
import { addMembership, setMembership } from '../hooks/useMembership';
import Button from './Button';
import { addHousehold, joinHousehold } from '../hooks/useHousehold';
import { API_URL, STORAGE_KEYS } from '../constants';

const Onboarding = ({ onComplete }) => {
  const [member_id, setMemberId] = useState(localStorage.getItem(STORAGE_KEYS.MEMBER_ID));
  const [memberFormType, setMemberFormType] = useState(null);
  const [houseFormType, setHouseFormType] = useState(null);
  const [input, setInput] = useState('');
  const [error, setError] = useState(null);
  const [householdCode, setHouseholdCode] = useState(null);

  const handleMembership = async () => {
    try {
      memberFormType === 'signup'
        ? await addMembership(input)
        : await setMembership(input);
      localStorage.setItem(STORAGE_KEYS.MEMBER_NAME, input);
      const userId = localStorage.getItem(STORAGE_KEYS.MEMBER_ID);

      const { data: households } = await axios.get(`${API_URL}/member/${userId}/households`);
      if (households.length > 0) {
        const household = households[0];
        localStorage.setItem(STORAGE_KEYS.HOUSEHOLD_ID, household.id);
        const { data: members } = await axios.get(`${API_URL}/member/${household.id}/members`);
        const myMembership = members.find((m) => String(m.user_id) === String(userId));
        if (myMembership) {
          localStorage.setItem(STORAGE_KEYS.HOUSEHOLD_MEMBER_ID, String(myMembership.id));
        }
        onComplete();
        return;
      }

      setMemberId(userId);
      setInput('');
      setError(null);
    } catch (e) {
      const detail = e.response?.data?.detail;
      setError(Array.isArray(detail) ? detail.map((d) => d.msg).join(', ') : detail ?? e.message);
    }
  };
  const handleHousehold = async () => {
    try {
      if (houseFormType === 'create') {
        await addHousehold(member_id, input);
        setHouseholdCode(localStorage.getItem(STORAGE_KEYS.HOUSEHOLD_ID));
      } else {
        await joinHousehold(member_id, input);
        onComplete();
      }
    } catch (e) {
      const detail = e.response?.data?.detail;
      setError(Array.isArray(detail) ? detail.map((d) => d.msg).join(', ') : detail ?? e.message);
    }
  };

  if (!member_id) {
    if (!memberFormType)
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-4">
          <h1 className="mb-4 text-2xl font-bold">FridgePeace</h1>
          <Button title="Sign Up" action={() => setMemberFormType('signup')} />
          <Button title="Log In" action={() => setMemberFormType('login')} />
        </div>
      );
    return (
      <div className="flex min-h-screen flex-col justify-center gap-3 p-4">
        <label className="text-sm font-medium">
          {memberFormType === 'signup' ? 'Choose a username' : 'Enter your username'}
        </label>
        <input
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-water-500 focus:ring-1 focus:ring-water-500"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button title="Submit" action={handleMembership} />
        <button className="w-full rounded-full bg-gray-100 px-4 py-1.5 text-center text-sm text-gray-600 hover:bg-gray-200" onClick={() => { setMemberFormType(null); setError(null); setInput(''); }}>
          Back
        </button>
      </div>
    );
  }
  if (householdCode) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4 text-center">
        <p className="text-lg font-bold">Household Created!</p>
        <p className="text-sm text-gray-600">Share this code with others to join:</p>
        <div className="flex items-center justify-center gap-2">
          <span className="rounded bg-gray-100 px-6 py-3 text-2xl font-mono font-bold tracking-widest">
            {householdCode}
          </span>
          <button
            className="rounded-full bg-water-600 px-4 py-3 text-center text-sm text-white hover:bg-water-700"
            onClick={() => navigator.clipboard?.writeText(householdCode)}
          >
            Copy
          </button>
        </div>
        <div className="mt-2">
          <Button title="Continue to Fridge" action={onComplete} />
        </div>
      </div>
    );
  }

  if (member_id) {
    if (!houseFormType)
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-4">
          <h1 className="mb-4 text-2xl font-bold">FridgePeace</h1>
          <Button
            title="Create a Household"
            action={() => setHouseFormType('create')}
          />
          <Button title="Join a Household" action={() => setHouseFormType('join')} />
        </div>
      );
    return (
      <div className="flex min-h-screen flex-col justify-center gap-3 p-4">
        <label className="text-sm font-medium">
          {houseFormType === 'create'
            ? 'Enter a name for your household'
            : 'Enter the unique House ID'}
        </label>
        <input
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-water-500 focus:ring-1 focus:ring-water-500"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button title="Submit" action={handleHousehold} />
        <button className="w-full rounded-full bg-gray-100 px-4 py-1.5 text-center text-sm text-gray-600 hover:bg-gray-200" onClick={() => { setHouseFormType(null); setError(null); setInput(''); }}>
          Back
        </button>
      </div>
    );
  }
};

export default Onboarding;
