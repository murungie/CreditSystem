import axios from 'axios';

const MPESA_BASE_URL =
  process.env.MPESA_ENV === 'production'
    ? 'https://api.safaricom.co.ke'
    : 'https://sandbox.safaricom.co.ke';

interface STKResponse {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
}

function formatPhoneNumber(phone: string): string {
  let cleaned = String(phone).replace(/\s|-/g, '');

  if (cleaned.startsWith('+254')) {
    cleaned = cleaned.substring(1);
  }

  if (cleaned.startsWith('0')) {
    cleaned = `254${cleaned.substring(1)}`;
  }

  return cleaned;
}

export const getMpesaAccessToken = async (): Promise<string> => {
  const consumerKey = process.env.MPESA_CONSUMER_KEY;
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET;

  if (!consumerKey || !consumerSecret) {
    throw new Error(
      'M-Pesa consumer key or consumer secret is missing.'
    );
  }

  const credentials = Buffer.from(
    `${consumerKey}:${consumerSecret}`
  ).toString('base64');

  console.log('M-Pesa OAuth URL:', MPESA_BASE_URL);
  console.log('Consumer key loaded:', !!consumerKey);
  console.log('Consumer secret loaded:', !!consumerSecret);

  const response = await axios.get(
    `${MPESA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
    {
      headers: {
        Authorization: `Basic ${credentials}`,
        Accept: 'application/json',
      },
    }
  );

  console.log(
    'M-Pesa OAuth response:',
    response.data
  );

  return response.data.access_token;
};

export const initiateSTKPush = async ({
  phone,
  amount,
  accountReference,
  transactionDesc,
}: {
  phone: string;
  amount: number;
  accountReference: string;
  transactionDesc: string;
}): Promise<STKResponse> => {

  const token = await getMpesaAccessToken();

  if (!token) {
    throw new Error('M-Pesa access token was not returned.');
  }

  const shortcode = process.env.MPESA_SHORTCODE;
  const passkey = process.env.MPESA_PASSKEY;
  const callbackUrl = process.env.MPESA_CALLBACK_URL;

  if (!shortcode) {
    throw new Error('MPESA_SHORTCODE is missing.');
  }

  if (!passkey) {
    throw new Error('MPESA_PASSKEY is missing.');
  }

  if (!callbackUrl) {
    throw new Error('MPESA_CALLBACK_URL is missing.');
  }

  const timestamp = new Date()
    .toISOString()
    .replace(/[-:TZ.]/g, '')
    .slice(0, 14);

  const password = Buffer.from(
    `${shortcode}${passkey}${timestamp}`
  ).toString('base64');

  const formattedPhone = formatPhoneNumber(phone);

  console.log('--------------------------------');
  console.log('M-Pesa STK Push');
  console.log('Phone:', formattedPhone);
  console.log('Amount:', amount);
  console.log('Shortcode:', shortcode);
  console.log('Timestamp:', timestamp);
  console.log('Callback:', callbackUrl);
  console.log('Token received:', !!token);
  console.log('--------------------------------');

  try {

    const response = await axios.post(
      `${MPESA_BASE_URL}/mpesa/stkpush/v1/processrequest`,
      {
        BusinessShortCode: shortcode,
        Password: password,
        Timestamp: timestamp,

        TransactionType:
          'CustomerPayBillOnline',

        Amount: Math.round(amount),

        PartyA: formattedPhone,

        PartyB: shortcode,

        PhoneNumber: formattedPhone,

        CallBackURL: callbackUrl,

        AccountReference:
          accountReference,

        TransactionDesc:
          transactionDesc,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      }
    );

    console.log(
      'M-Pesa STK response:',
      response.data
    );

    return response.data;

  } catch (error: any) {

    console.error(
      'M-Pesa STK request failed'
    );

    console.error(
      'Status:',
      error.response?.status
    );

    console.error(
      'Response:',
      error.response?.data
    );

    throw error;
  }
};