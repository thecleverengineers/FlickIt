export async function sendDltOtp({ key, sender, message, variables, mobile, otp }) {
  const body = new URLSearchParams({
    sender_id: sender,
    message,
    route: 'dlt',
    numbers: mobile,
    variables_values: variables.replaceAll('{otp}', otp),
  });
  const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
    method: 'POST',
    headers: { authorization: key, 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    redirect: 'error',
    signal: AbortSignal.timeout(10000),
  });
  return response.ok && (await response.json()).return === true;
}
