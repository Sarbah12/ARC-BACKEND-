const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || '';

export function paystackConfigured() {
  return Boolean(PAYSTACK_SECRET_KEY);
}

export async function verifyPaystackReference(reference = '') {
  if (!PAYSTACK_SECRET_KEY || !reference) return false;
  try {
    const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
    });
    const data = await res.json().catch(() => ({}));
    return res.ok && data?.data?.status === 'success';
  } catch (error) {
    console.warn('[paystack] verify failed:', error.message || error);
    return false;
  }
}

export async function initializePaystackPayment({
  email,
  amount,
  currency = 'GHS',
  reference,
  callback_url,
  metadata = {},
}) {
  if (!PAYSTACK_SECRET_KEY) {
    return { error: 'Payment is not configured on the server.' };
  }

  try {
    const res = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount,
        currency,
        reference,
        callback_url,
        metadata,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.status || !data?.data?.authorization_url) {
      return { error: data?.message || 'Could not start Paystack checkout.' };
    }
    return {
      authorization_url: data.data.authorization_url,
      access_code: data.data.access_code,
      reference: data.data.reference,
    };
  } catch (error) {
    console.warn('[paystack] initialize failed:', error.message || error);
    return { error: 'Could not reach Paystack. Please try again.' };
  }
}
