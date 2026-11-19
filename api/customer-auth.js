import { createHash, createHmac, randomBytes, randomInt } from 'node:crypto';
import { database } from './database.js';
import { sendDltOtp } from './fast2sms.js';

const otpMinutes = 5;
const sessionSeconds = 7 * 24 * 60 * 60;
const sessionPattern = /^[a-f0-9]{64}$/;
const digestToken = token => createHash('sha256').update(token).digest('hex');

export async function customerAuth(action, request, readBody) {
  const key = process.env.FAST2SMS_API_KEY;
  const sender = process.env.FAST2SMS_DLT_SENDER_ID || 'SECAST';
  const message = process.env.FAST2SMS_DLT_MESSAGE_ID || '204252';
  const variables = process.env.FAST2SMS_DLT_VARIABLES;
  const secret = process.env.CUSTOMER_OTP_SECRET;
  if (!database || !secret || secret.length < 32) {
    return [503, { error: 'Mobile sign-in is currently unavailable.' }];
  }
  const sessions = database.collection('customer_sessions');
  const token = /^Bearer ([a-f0-9]{64})$/.exec(request.headers.authorization ?? '')?.[1];
  if (action === 'session' || action === 'logout') {
    if (!sessionPattern.test(token ?? '')) return [401, { error: 'Sign in to continue.' }];
    const _id = digestToken(token);
    if (action === 'logout') {
      await sessions.deleteOne({ _id });
      return [200, { signedOut: true }];
    }
    const session = await sessions.findOne({ _id, expiresAt: { $gt: new Date() } });
    return session
      ? [200, { customer: { id: createHmac('sha256', secret).update(`customer:${session.mobile}`).digest('hex'), mobile: session.mobile } }]
      : [401, { error: 'Sign in to continue.' }];
  }

  let body;
  try { body = await readBody(request); } catch {
    return [400, { error: 'Invalid sign-in request.' }];
  }
  const mobile = typeof body?.mobile === 'string' ? body.mobile.trim().replace(/^\+91\s*/, '') : '';
  if (!/^[6-9]\d{9}$/.test(mobile)) return [400, { error: 'Enter a valid Indian mobile number.' }];
  const challenges = database.collection('customer_otp');
  const now = new Date();
  const phoneKey = createHmac('sha256', secret).update(`phone:${mobile}`).digest('hex');
  const hashOtp = otp => createHmac('sha256', secret).update(`otp:${mobile}:${otp}`).digest('hex');

  if (action === 'request') {
    if (!key || !variables?.split('|').includes('{otp}')) {
      return [503, { error: 'Mobile sign-in is currently unavailable.' }];
    }
    const otp = String(randomInt(0, 1000000)).padStart(6, '0');
    const digest = hashOtp(otp);
    const expiresAt = new Date(now.getTime() + otpMinutes * 60000);
    try {
      await challenges.updateOne({
        _id: phoneKey, resendAt: { $lte: now },
      }, { $set: { digest, expiresAt, attempts: 0, resendAt: new Date(now.getTime() + 60000) } },
      { upsert: true });
    } catch (error) {
      if (error.code === 11000) return [429, { error: 'Wait one minute before requesting another code.' }];
      throw error;
    }

    const budget = database.collection('customer_otp_budget');
    const day = now.toISOString().slice(0, 10);
    const limit = Number(process.env.CUSTOMER_OTP_DAILY_LIMIT || 100);
    if (!Number.isSafeInteger(limit) || limit < 1) return [503, { error: 'Mobile sign-in is currently unavailable.' }];
    await budget.updateOne({ _id: day }, { $setOnInsert: { count: 0, expiresAt: new Date(now.getTime() + 2 * 86400000) } }, { upsert: true });
    const allowance = await budget.updateOne({ _id: day, count: { $lt: limit } }, { $inc: { count: 1 } });
    if (!allowance.modifiedCount) return [429, { error: 'SMS capacity has been reached. Try again later.' }];

    try {
      const sent = await sendDltOtp({ key, sender, message, variables, mobile, otp });
      if (!sent) return [502, { error: 'The code could not be sent. Try again in a minute.' }];
      return [200, { expiresIn: otpMinutes * 60, resendIn: 60 }];
    } catch {
      return [502, { error: 'The code could not be sent. Try again in a minute.' }];
    }
  }

  if (typeof body?.code !== 'string' || !/^\d{6}$/.test(body.code)) {
    return [400, { error: 'Enter the six-digit code.' }];
  }
  const challenge = await challenges.findOneAndUpdate({
    _id: phoneKey, expiresAt: { $gt: now }, attempts: { $lt: 5 },
  }, { $inc: { attempts: 1 } }, { returnDocument: 'after' });
  const invalid = [401, { error: 'The code is incorrect or expired. Request a new code if needed.' }];
  if (!challenge || challenge.digest !== hashOtp(body.code)) return invalid;
  const consumed = await challenges.updateOne({
    _id: phoneKey, digest: challenge.digest, expiresAt: { $gt: new Date() },
  }, { $set: { expiresAt: now }, $unset: { digest: '' } });
  if (!consumed.modifiedCount) return invalid;

  const sessionToken = randomBytes(32).toString('hex');
  await sessions.insertOne({
    _id: digestToken(sessionToken), mobile, expiresAt: new Date(now.getTime() + sessionSeconds * 1000),
  });
  return [200, { sessionToken, expiresIn: sessionSeconds }];
}
