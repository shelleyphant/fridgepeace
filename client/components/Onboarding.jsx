import React, { useState } from 'react';
import { addMembership, setMembership } from '../hooks/useMembership';
import Button from './Button';
import { addHousehold, joinHousehold } from '../hooks/useHousehold';

const Onboarding = ({ onComplete }) => {
  const [member_id, setMemberId] = useState(localStorage.getItem('member_id'));
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
      localStorage.setItem('member_name', input);
      setMemberId(localStorage.getItem('member_id'));
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
        setHouseholdCode(localStorage.getItem('household_id'));
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
        <div>
          <Button title="Sign Up" action={() => setMemberFormType('signup')} />
          <Button title="Find User" action={() => setMemberFormType('login')} />
        </div>
      );
    return (
      <div>
        <label>
          {memberFormType === 'signup' ? 'Choose a username' : 'Enter your username'}
        </label>
        <input
          className="w-full border"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        {error && <p className="text-red-600">{error}</p>}
        <Button title="Submit" action={handleMembership} />
        <button className="mt-2 text-sm text-gray-500 underline" onClick={() => { setMemberFormType(null); setError(null); setInput(''); }}>
          Back
        </button>
      </div>
    );
  }
  if (householdCode) {
    return (
      <div className="mt-8 text-center">
        <p className="text-lg font-bold">Household Created!</p>
        <p className="mt-2 text-sm text-gray-600">Share this code with others to join:</p>
        <div className="mt-4 flex items-center justify-center gap-2">
          <span className="rounded bg-gray-100 px-6 py-3 text-2xl font-mono font-bold tracking-widest">
            {householdCode}
          </span>
          <button
            className="rounded bg-blue-500 px-4 py-3 text-sm text-white hover:bg-blue-600"
            onClick={() => navigator.clipboard?.writeText(householdCode)}
          >
            Copy
          </button>
        </div>
        <div className="mt-6">
          <Button title="Continue to Fridge" action={onComplete} />
        </div>
      </div>
    );
  }

  if (member_id) {
    if (!houseFormType)
      return (
        <div>
          <Button
            title="Create a Household"
            action={() => setHouseFormType('create')}
          />
          <Button title="Join a Household" action={() => setHouseFormType('join')} />
        </div>
      );
    return (
      <div>
        <label>
          {houseFormType === 'create'
            ? 'Enter a name for your household'
            : 'Enter the unique House ID'}
        </label>
        <input
          className="w-full border"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        {error && <p className="text-red-600">{error}</p>}
        <Button title="Submit" action={handleHousehold} />
        <button className="mt-2 text-sm text-gray-500 underline" onClick={() => { setHouseFormType(null); setError(null); setInput(''); }}>
          Back
        </button>
      </div>
    );
  }
};

export default Onboarding;
