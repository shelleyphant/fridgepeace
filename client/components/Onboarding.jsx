import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useMembership } from '../hooks/useMembership';
import Button from './Button';

const Onboarding = () => {
  const member_id = localStorage.getItem('member_id');
  const [formType, setFormType] = useState(null);
  const [input, setInput] = useState('');
  const [error, setError] = useState(null);
  const { addMembership, setMembership } = useMembership();

  const handleSend = async () => {
    const result =
      formType === 'signup' ? await addMembership(input) : await setMembership(input);
    if (result !== true) setError(result);
  };

  if (!member_id) {
    if (!formType)
      return (
        <div>
          <Button title="Sign Up" action={() => setFormType('signup')} />
          <Button title="Log In" action={() => setFormType('login')} />
        </div>
      );
    return (
      <div>
        <label>
          {formType === 'signup' ? 'Choose a display name' : 'Enter your member ID'}
        </label>
        <input
          className="w-full border"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        {error && <p>{error}</p>}
        <Button title="Submit" action={handleSend} />
      </div>
    );
  }
  if (member_id) {
  }
};

export default Onboarding;
