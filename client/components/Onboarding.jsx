import React, { useState } from 'react';
import { addMembership, setMembership } from '../hooks/useMembership';
import Button from './Button';
import { addHousehold, joinHousehold, getMemberHousehold } from '../hooks/useHousehold';

const Onboarding = ({ onComplete }) => {
  const [member_id, setMemberId] = useState(localStorage.getItem('member_id'));
  const [memberFormType, setMemberFormType] = useState(null);
  const [houseFormType, setHouseFormType] = useState(null);
  const [input, setInput] = useState('');
  const [error, setError] = useState(null);
  const [errorKey, setErrorKey] = useState(0);

  const handleMembership = async () => {
    setInput('');
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
      setErrorKey((k) => k + 1);
    }
  };
  const handleHousehold = async () => {
    setInput('');
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
      setErrorKey((k) => k + 1);
    }
  };

  if (!member_id) {
    if (!memberFormType)
      return (
        <div>
          <span>Welcome To</span>
          <h1>FridgePeace</h1>
          <Button title="Sign Up" action={() => setMemberFormType('signup')} />
          <Button title="Log In" action={() => setMemberFormType('login')} />
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

        <Button title="Submit" action={handleMembership} />

        {error && <Toast key={errorKey} level="error" message={error} />}
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

          <Button title="Submit" action={handleHousehold} />

          {error && <Toast key={errorKey} level="error" message={error} />}
        </div>
      );
    }
  }
};

export default Onboarding;
