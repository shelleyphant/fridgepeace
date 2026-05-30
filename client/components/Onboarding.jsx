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

  const handleMembership = async () => {
    try {
      memberFormType === 'signup'
        ? await addMembership(input)
        : await setMembership(input);
      setMemberId(localStorage.getItem('member_id'));
      setInput('');
      setError(null);
    } catch (e) {
      setError(e.response?.data?.detail ?? e.message);
    }
  };
  const handleHousehold = async () => {
    try {
      houseFormType === 'create'
        ? await addHousehold(input)
        : await joinHousehold(input);
      onComplete();
    } catch (e) {
      setError(e.response?.data?.detail ?? e.message);
    }
  };

  if (!member_id) {
    if (!memberFormType)
      return (
        <div>
          <Button title="Sign Up" action={() => setMemberFormType('signup')} />
          <Button title="Log In" action={() => setMemberFormType('login')} />
        </div>
      );
    return (
      <div>
        <label>
          {memberFormType === 'signup'
            ? 'Choose a username'
            : 'Enter your username'}
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
        {error && <p>{error}</p>}
        <Button title="Submit" action={handleHousehold} />
      </div>
    );
  }
};

export default Onboarding;
