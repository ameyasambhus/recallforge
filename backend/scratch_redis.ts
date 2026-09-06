import http from 'http';

http.get('http://localhost:4000/api/card/cards', (res) => {
  console.log('HTTP Status Code:', res.statusCode);
  console.log('Headers:', res.headers);
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log('Response Body:', data);
  });
}).on('error', (err) => {
  console.error('HTTP Request Error:', err);
});
