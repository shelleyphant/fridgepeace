import React, { useState } from 'react';
import { addMembership, setMembership } from '../hooks/useMembership';
import Button from './UI/Button';
import { addHousehold, joinHousehold, getMemberHousehold } from '../hooks/useHousehold';

const Onboarding = ({ onComplete }) => {
  const [member_id, setMemberId] = useState(localStorage.getItem('member_id'));
  const [memberFormType, setMemberFormType] = useState(null);
  const [houseFormType, setHouseFormType] = useState(null);
  const [input, setInput] = useState('');
  const [error, setError] = useState(null);

  const handleMembership = async () => {
    try {
      memberFormType === 'signup'
        ? await addMembership(input)
        : await setMembership(input);
      const memberId = localStorage.getItem('member_id');
      setMemberId(memberId);
      setInput('');
      setError(null);
      if (memberFormType === 'login') {
        const hasHousehold = await getMemberHousehold(memberId);
        if (hasHousehold) onComplete();
      }
    } catch (e) {
      const detail = e.response?.data?.detail;
      setError(
        Array.isArray(detail)
          ? detail.map((d) => d.msg).join(', ')
          : (detail ?? e.message),
      );
    }
  };
  const handleHousehold = async () => {
    try {
      houseFormType === 'create'
        ? await addHousehold(member_id, input)
        : await joinHousehold(member_id, input);
      onComplete();
    } catch (e) {
      const detail = e.response?.data?.detail;
      setError(
        Array.isArray(detail)
          ? detail.map((d) => d.msg).join(', ')
          : (detail ?? e.message),
      );
    }
  };

  if (!member_id) {
    if (!memberFormType)
      return (
        <div className="box-border flex flex-grow flex-col justify-center">
          <div className="mb-6">
            <span className="text-water-900">Welcome To</span>
            <h1 className="font-sansation text-water-800 mb-4 text-5xl font-bold">
              FridgePeace
            </h1>

            <h2>Shared pantry management</h2>
            <p>
              We're pretty cool. You can{' '}
              <a className="text-water-600 text-center underline hover:cursor-pointer">
                learn more here
              </a>
            </p>
          </div>
          <h2 className="text-water-700 text-xl font-medium">Let's get started!</h2>
          <Button title="Log In" action={() => setMemberFormType('login')} />
          <a
            className="text-water-600 text-center text-sm underline hover:cursor-pointer"
            onClick={() => setMemberFormType('signup')}
          >
            Or sign up
          </a>
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
        {error && <p>{error}</p>}
        <Button title="Submit" action={handleMembership} />
      </div>
    );
  }
  if (member_id) {
    if (!houseFormType) {
      return (
        <div>
          <Button
            title="Create a Household"
            action={() => setHouseFormType('create')}
          />
          <Button title="Join a Household" action={() => setHouseFormType('join')} />
        </div>
      );
    } else {
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
          {error && <p>{error}</p>}
          <Button title="Submit" action={handleHousehold} />
        </div>
      );
    }
  }
};

export default Onboarding;
