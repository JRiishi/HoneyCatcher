/**
 * Fake Data Generator
 * Generates realistic-looking but FAKE personal/financial data for the AI
 * to feed scammers during live engagement, wasting their time safely.
 */

const FIRST_NAMES = [
  'Ramesh', 'Suresh', 'Priya', 'Anjali', 'Vikram', 'Sunita', 'Deepak', 'Kavita',
  'Rajesh', 'Meena', 'Arun', 'Lakshmi', 'Mohan', 'Geeta', 'Sanjay', 'Pooja',
  'Amit', 'Rekha', 'Vishal', 'Nita', 'Ashok', 'Usha', 'Manoj', 'Savita',
];

const LAST_NAMES = [
  'Sharma', 'Verma', 'Gupta', 'Singh', 'Kumar', 'Patel', 'Das', 'Rao',
  'Reddy', 'Joshi', 'Mehta', 'Shah', 'Nair', 'Iyer', 'Pillai', 'Bhat',
  'Chauhan', 'Yadav', 'Mishra', 'Tiwari', 'Pandey', 'Dubey', 'Saxena', 'Kapoor',
];

const BANK_NAMES = [
  'State Bank of India', 'Punjab National Bank', 'Bank of Baroda',
  'Canara Bank', 'Union Bank of India', 'Indian Bank', 'Bank of India',
  'Central Bank of India', 'UCO Bank', 'Indian Overseas Bank',
];

const BANK_IFSC_PREFIXES = [
  'SBIN', 'PUNB', 'BARB', 'CNRB', 'UBIN', 'IDIB', 'BKID', 'CBIN', 'UCBA', 'IOBA',
];

const CITIES = [
  'Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Hyderabad',
  'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow', 'Bhopal', 'Patna',
];

const STATES = [
  'Maharashtra', 'Delhi', 'Karnataka', 'Tamil Nadu', 'West Bengal',
  'Telangana', 'Gujarat', 'Rajasthan', 'Uttar Pradesh', 'Madhya Pradesh',
];

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function digits(n) {
  let s = '';
  for (let i = 0; i < n; i++) s += Math.floor(Math.random() * 10);
  return s;
}

/**
 * Generates a fake Aadhaar number (12 digits).
 * Starts with 2-9, remaining 11 random digits.
 * NOTE: This is intentionally INVALID and will not pass Verhoeff checksum.
 */
export function fakeAadhaar() {
  const first = rand(2, 9);
  return `${first}${digits(11)}`;
}

/**
 * Generates a fake PAN number (AAAAA0000A format).
 * NOTE: Intentionally invalid — will not match any real PAN.
 */
export function fakePAN() {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let pan = '';
  for (let i = 0; i < 5; i++) pan += letters[rand(0, 25)];
  pan += digits(4);
  pan += letters[rand(0, 25)];
  return pan;
}

/**
 * Generates a fake bank account number (11-16 digits).
 */
export function fakeBankAccount() {
  return digits(rand(11, 16));
}

/**
 * Generates a fake IFSC code.
 */
export function fakeIFSC() {
  const prefix = pick(BANK_IFSC_PREFIXES);
  return `${prefix}0${digits(6)}`;
}

/**
 * Generates a fake UPI ID.
 */
export function fakeUPI() {
  const firstName = pick(FIRST_NAMES).toLowerCase();
  const num = digits(rand(2, 4));
  const suffixes = ['@ybl', '@paytm', '@oksbi', '@okaxis', '@upi'];
  return `${firstName}${num}${pick(suffixes)}`;
}

/**
 * Generates a fake Indian phone number.
 */
export function fakePhone() {
  const prefixes = ['70', '72', '73', '74', '75', '76', '77', '78', '79', '80', '81', '82', '83', '84', '85', '86', '87', '88', '89', '90', '91', '92', '93', '94', '95', '96', '97', '98', '99'];
  return `+91 ${pick(prefixes)}${digits(8)}`;
}

/**
 * Generates a fake OTP (4-6 digits).
 */
export function fakeOTP(length = 6) {
  return digits(length);
}

/**
 * Generates a fake full name.
 */
export function fakeName() {
  return `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
}

/**
 * Generates a fake email address.
 */
export function fakeEmail() {
  const firstName = pick(FIRST_NAMES).toLowerCase();
  const lastName = pick(LAST_NAMES).toLowerCase();
  const num = digits(rand(1, 3));
  const domains = ['gmail.com', 'yahoo.co.in', 'rediffmail.com', 'hotmail.com', 'outlook.com'];
  return `${firstName}.${lastName}${num}@${pick(domains)}`;
}

/**
 * Generates a fake address.
 */
export function fakeAddress() {
  const houseNo = rand(1, 999);
  const streets = ['MG Road', 'Station Road', 'Gandhi Nagar', 'Nehru Colony', 'Subhash Marg', 'Civil Lines', 'Sadar Bazaar', 'Mall Road'];
  const city = pick(CITIES);
  const state = pick(STATES);
  const pin = `${rand(1, 9)}${digits(5)}`;
  return `${houseNo}, ${pick(streets)}, ${city}, ${state} - ${pin}`;
}

/**
 * Generates a fake date of birth (age 55-80 for elderly persona).
 */
export function fakeDOB() {
  const year = rand(1944, 1969);
  const month = rand(1, 12);
  const day = rand(1, 28);
  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
}

/**
 * Generates a complete fake identity profile.
 */
export function fakeIdentity() {
  const bankIdx = rand(0, BANK_NAMES.length - 1);
  return {
    name: fakeName(),
    phone: fakePhone(),
    email: fakeEmail(),
    address: fakeAddress(),
    dob: fakeDOB(),
    aadhaar: fakeAadhaar(),
    pan: fakePAN(),
    bankName: BANK_NAMES[bankIdx],
    bankAccount: fakeBankAccount(),
    ifsc: `${BANK_IFSC_PREFIXES[bankIdx]}0${digits(6)}`,
    upi: fakeUPI(),
  };
}

/**
 * Generates a fake "verification code" or "reference number" that looks official.
 */
export function fakeReferenceNumber() {
  const prefixes = ['RBI', 'NPCI', 'TXN', 'REF', 'CASE', 'INC'];
  return `${pick(prefixes)}/${new Date().getFullYear()}/${digits(8)}`;
}

/**
 * Generates a fake card number (16 digits, Luhn-invalid).
 */
export function fakeCardNumber() {
  const prefixes = ['4', '5', '6']; // Visa-like, MC-like, RuPay-like
  const prefix = pick(prefixes);
  return `${prefix}${digits(15)}`;
}

/**
 * Generates a fake CVV.
 */
export function fakeCVV() {
  return digits(3);
}

export default {
  fakeAadhaar,
  fakePAN,
  fakeBankAccount,
  fakeIFSC,
  fakeUPI,
  fakePhone,
  fakeOTP,
  fakeName,
  fakeEmail,
  fakeAddress,
  fakeDOB,
  fakeIdentity,
  fakeReferenceNumber,
  fakeCardNumber,
  fakeCVV,
};
