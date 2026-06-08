import React, { useState } from 'react';
import { addMembership, setMembership } from '../hooks/useMembership';
import Button from './ui/Button';
import { addHousehold, joinHousehold, getMemberHousehold } from '../hooks/useHousehold';
import Toast from './ui/Toast';
import Input from './ui/Input';
import Drawer from './ui/Drawer';
import Introduction from './Introduction';

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
        <div className="box-border flex flex-grow flex-col justify-center">
          <div className="mb-6">
            <span className="text-water-900">Welcome To</span>
            <h1 className="font-sansation text-water-800 mb-4 text-5xl font-bold">
              FridgePeace
            </h1>
            <h2>Shared pantry management</h2>
            <p>
              We're pretty cool. You can{' '}
              <Drawer
                trigger={(open) => (
                  <a
                    className="text-water-600 text-center underline hover:cursor-pointer"
                    onClick={open}
                  >
                    learn more here
                  </a>
                )}
              >
                {(close) => (
                  <Introduction
                    onClose={close}
                    onSuccess={() => {
                      close();
                    }}
                  />
                )}
              </Drawer>
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
      <div className="box-border flex flex-grow flex-col justify-center">
        <label className="text-water-700 text-xl font-medium">
          {memberFormType === 'signup' ? 'Choose a username' : 'Enter your username'}
        </label>
        <Input
          type="text"
          value={input}
          onChangeAction={(e) => setInput(e.target.value)}
        />

        <Button title="Submit" action={handleMembership} />

        {error && <Toast key={errorKey} level="error" message={error} />}
        <a
          className="text-water-600 text-sm underline hover:cursor-pointer"
          onClick={() => setMemberFormType(null)}
        >{`<< Go back`}</a>
      </div>
    );
  }
  if (member_id) {
    if (!houseFormType) {
      return (
        <div className="box-border flex flex-grow flex-col justify-center">
          <h2 className="text-water-700 text-xl font-medium">Welcome member!</h2>
          <p className="mb-6">Start your pantry!</p>
          <Button
            title="Create a Household"
            action={() => setHouseFormType('create')}
          />
          <Button title="Join a Household" action={() => setHouseFormType('join')} />
          <a
            className="text-water-600 text-sm underline hover:cursor-pointer"
            onClick={() => {
              localStorage.removeItem('member_id');
              setMemberId(null);
              setMemberFormType(null);
              setInput('');
            }}
          >{`<< Log in as a different user`}</a>
        </div>
      );
    } else {
      return (
        <div className="box-border flex flex-grow flex-col justify-center">
          <label>
            {houseFormType === 'create'
              ? 'Enter a name for your household'
              : 'Enter the unique House ID'}
          </label>
          <Input
            type="text"
            value={input}
            onChangeAction={(e) => setInput(e.target.value)}
          />

          <Button title="Submit" action={handleHousehold} />

          {error && <Toast key={errorKey} level="error" message={error} />}
          <a
            className="text-water-600 text-sm underline hover:cursor-pointer"
            onClick={() => setHouseFormType('')}
          >{`<< Go Back`}</a>
        </div>
      );
    }
  }
};

export default Onboarding;
