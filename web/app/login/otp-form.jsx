'use client';

import { useEffect, useState } from 'react';

const challengeKey = 'flickit.otp-challenge';
const mobilePattern = /^[6-9][0-9]{9}$/;
const codeLength = 6;

export default function Login({ accountHref, verification = false }) {
  const query = accountHref.slice('/account'.length);
  const loginHref = `/login${query}`;
  const [mobile, setMobile] = useState('');
  const [code, setCode] = useState('');
  const [ready, setReady] = useState(false);
  const [retryAt, setRetryAt] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!verification) return;
    try {
      const saved = JSON.parse(sessionStorage.getItem(challengeKey) || 'null');
      if (mobilePattern.test(saved?.mobile) && Number.isFinite(saved.retryAt)) {
        setMobile(saved.mobile);
        setRetryAt(saved.retryAt);
        setSeconds(Math.max(0, Math.ceil((saved.retryAt - Date.now()) / 1000)));
      }
    } catch {}
    setReady(true);
  }, [verification]);

  useEffect(() => {
    if (!retryAt) return;
    function tick() { setSeconds(Math.max(0, Math.ceil((retryAt - Date.now()) / 1000))); }
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [retryAt]);

  const codeComplete = code.length === codeLength;

  useEffect(() => {
    if (!verification || !ready || !mobilePattern.test(mobile) || !retryAt || busy ||
        codeComplete || !('OTPCredential' in window) || !navigator.credentials) return;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000);
    navigator.credentials.get({ otp: { transport: ['sms'] }, signal: controller.signal })
      .then(credential => {
        if (!controller.signal.aborted && /^[0-9]{6}$/.test(credential?.code)) {
          setCode(current => current.length === codeLength ? current : credential.code);
        }
      })
      .catch(() => {});
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [verification, ready, mobile, retryAt, busy, codeComplete]);

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
        try { sessionStorage.removeItem(challengeKey); } catch {}
        window.location.replace(accountHref);
        return;
      }
      const nextRetry = Date.now() + data.resendIn * 1000;
      sessionStorage.setItem(challengeKey, JSON.stringify({ mobile, retryAt: nextRetry }));
      if (!verification) {
        window.location.assign(`/login/verify${query}`);
        return;
      }
      setCode('');
      setSeconds(data.resendIn);
      setRetryAt(nextRetry);
      setMessage('Code sent. It expires in five minutes.');
    } catch (error) {
      setMessage(error.message || 'Mobile sign-in is temporarily unavailable.');
    } finally {
      setBusy(false);
    }
  }

  const validMobile = mobilePattern.test(mobile);
  if (verification && !ready) return <p role="status">Loading verification…</p>;
  if (verification && !validMobile) return <p><a href={loginHref}>Enter your mobile number to request a code.</a></p>;

  return <form className={`otp-form login-form${verification ? ' otp-verification-form' : ''}`} onSubmit={event => {
    event.preventDefault();
    if (!busy) void submit(verification ? 'verify' : 'request');
  }}>
    {verification ? <>
      <p>We sent a verification code to<br /><strong>+91 {mobile}</strong></p>
      <label className="otp-entry">
        <input autoFocus aria-label="Six-digit verification code" value={code}
          onChange={event => setCode(event.target.value.replace(/[^0-9]/g, '').slice(0, codeLength))}
          inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" required disabled={busy} />
        <span className="otp-cells" aria-hidden="true">{Array.from({ length: codeLength }, (_, i) =>
          <span key={i} data-active={i === code.length || undefined}>{code[i] || ''}</span>)}</span>
      </label>
      <button className="otp-resend" type="button" disabled={busy || seconds > 0} onClick={() => void submit('request')}>
        {seconds > 0 ? `Resend OTP in ${seconds}s` : 'Resend OTP'}
      </button>
    </> : <div className="login-phone">
      <span className="login-flag" aria-hidden="true">🇮🇳</span>
      <label><span aria-hidden="true">+91</span><input aria-label="Indian mobile number" placeholder="Enter mobile number"
        value={mobile} type="tel" inputMode="numeric" autoComplete="tel-national" pattern="[6-9][0-9]{9}" maxLength={10}
        onChange={event => setMobile(event.target.value.replace(/[^0-9]/g, ''))} required disabled={busy} /></label>
    </div>}
    <button type="submit" className="account-continue" disabled={busy || (verification ? code.length !== codeLength : !validMobile)}>
      {busy ? 'Please wait…' : verification ? 'Verify and sign in' : 'Continue'}
    </button>
    {message && <p role="status">{message}</p>}
  </form>;
}
