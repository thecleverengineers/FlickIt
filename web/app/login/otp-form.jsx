'use client';

import { useEffect, useState } from 'react';

export default function Login({ accountHref }) {
  const [mobile, setMobile] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [retryAt, setRetryAt] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!retryAt) return;
    function tick() { setSeconds(Math.max(0, Math.ceil((retryAt - Date.now()) / 1000))); }
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [retryAt]);

  async function submit(action) {
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch(`/api/auth/${action}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile, code }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (action === 'verify') {
        window.location.replace(accountHref);
        return;
      }
      setSent(true);
      setCode('');
      setSeconds(data.resendIn);
      setRetryAt(Date.now() + data.resendIn * 1000);
      setMessage('Code sent. It expires in five minutes.');
    } catch (error) {
      setMessage(error.message || 'Mobile sign-in is temporarily unavailable.');
    } finally {
      setBusy(false);
    }
  }

  const validMobile = /^[6-9][0-9]{9}$/.test(mobile);

  return <form className="otp-form login-form"  onSubmit={event => {
    event.preventDefault();
    if (!busy) void submit(sent ? 'verify' : 'request');
  }}>
    {sent ? <>
      <p>Code sent to +91 {mobile}</p>
      <label>One-time code <input value={code} onChange={event => setCode(event.target.value)}
        inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required /></label>
    </> : <div className="login-phone">
      <span className="login-flag" aria-hidden="true">🇮🇳</span>
      <label><span aria-hidden="true">+91</span><input aria-label="Indian mobile number" placeholder="Enter mobile number" value={mobile} type="tel" inputMode="numeric"
      autoComplete="tel-national" pattern="[6-9][0-9]{9}" maxLength={10}
      onChange={event => setMobile(event.target.value.replace(/[^0-9]/g, ''))} required /></label>
    </div>}
    <button type="submit" className="account-continue" disabled={busy || (sent ? !/^[0-9]{6}$/.test(code) : !validMobile)}>
      {busy ? 'Please wait…' : sent ? 'Verify and sign in' : 'Continue'}
    </button>
    {sent && <div className="row">
      <button type="button" disabled={busy} onClick={() => { setSent(false); setCode(''); setMessage(''); }}>Change number</button>
      <button type="button" disabled={busy || seconds > 0} onClick={() => void submit('request')}>
        {seconds > 0 ? `Resend in ${seconds}s` : 'Resend code'}
      </button>
    </div>}
    {message && <p role="status">{message}</p>}
  </form>;
}
