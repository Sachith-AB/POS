import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { PIN_LENGTH } from '@pos/shared';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { bootstrapRequested, bootstrapStatusRequested, loginRequested } from '../features/auth/authSlice';
import { Input } from '../components/Input';
import { PinInput } from '../components/PinInput';

export function LoginPage() {
  const dispatch = useAppDispatch();
  const { employee, status, error, needsSetup } = useAppSelector((s) => s.auth);
  const [pin, setPin] = useState('');
  const [name, setName] = useState('');

  useEffect(() => {
    dispatch(bootstrapStatusRequested());
  }, [dispatch]);

  useEffect(() => {
    if (status === 'error') {
      const t = setTimeout(() => setPin(''), 600);
      return () => clearTimeout(t);
    }
  }, [status]);

  if (employee) return <Navigate to="/pos" replace />;

  function submit(currentPin: string) {
    if (currentPin.length !== PIN_LENGTH || status === 'authenticating') return;
    if (needsSetup) {
      dispatch(bootstrapRequested({ name: name.trim(), pin: currentPin }));
    } else {
      dispatch(loginRequested({ pin: currentPin }));
    }
  }

  if (needsSetup === null) return null;

  return (
    <div className="flex flex-col items-center pt-[15vh]">
      {needsSetup ? (
        <>
          <h2 className="text-xl font-semibold">Set up your shop</h2>
          <p className="mt-1 text-muted">Create the owner account — this only happens once.</p>
          <Input
            autoFocus
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-4 w-64 text-center"
          />
          <p className="mt-3 text-muted">Choose a {PIN_LENGTH}-digit PIN</p>
        </>
      ) : (
        <h2 className="text-xl font-semibold">Enter your PIN</h2>
      )}

      <div className="mt-4">
        <PinInput
          length={PIN_LENGTH}
          value={pin}
          onChange={setPin}
          onComplete={submit}
          disabled={needsSetup ? !name.trim() : false}
          autoFocus={!needsSetup}
        />
      </div>
      <p className="mt-3 min-h-[1.25em] text-danger">{error ?? ' '}</p>
    </div>
  );
}
