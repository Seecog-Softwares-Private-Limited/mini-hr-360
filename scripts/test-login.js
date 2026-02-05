import fetch from 'node-fetch';

async function test(email, password) {
  try {
    const res = await fetch('http://localhost:3002/api/v1/users/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch (e) { data = text; }
    console.log('\nTest login for', email);
    console.log('Status:', res.status);
    console.log('Response:', data);
  } catch (err) {
    console.error('Request failed', err);
  }
}

(async () => {
  await test('hr@demo.com', 'HrPass123!');
  await test('finance@demo.com', 'FinPass123!');
})();
