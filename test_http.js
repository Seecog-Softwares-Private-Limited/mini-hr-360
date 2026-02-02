// Test the actual API via HTTP
import http from 'http';

const options = {
  hostname: 'localhost',
  port: 3002,
  path: '/api/admin/payroll/structures/5',
  method: 'GET',
  headers: {
    'x-business-id': '26',
    'Cookie': 'connect.sid=test'  // This won't work, but let's see what error we get
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', data);
    try {
      const json = JSON.parse(data);
      console.log('\nParsed JSON:');
      console.log('monthlyCTC:', json?.data?.monthlyCTC);
      console.log('annualCTC:', json?.data?.annualCTC);
      console.log('assignedCount:', json?.data?.assignedCount);
    } catch (e) {
      console.log('Could not parse as JSON');
    }
  });
});

req.on('error', (e) => {
  console.error('Error:', e.message);
});

req.end();
