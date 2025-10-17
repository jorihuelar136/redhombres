// Quick tests for email/password validators
const emails = ['test@example.com','bad@@example','otro@mail','usuario@dominio.co','   spaces@x.com  '];
const passwords = ['abc','abcdef','abc123','ABC123','passw0rd','xY1!aa'];
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function validatePassword(p){ if(!p || p.length<6) return false; return /[A-Za-z]/.test(p) && /\d/.test(p); }
console.log('Email results');
emails.forEach(e=> console.log(e.trim(), emailRegex.test(e.trim())));
console.log('Password results');
passwords.forEach(p=> console.log(p, validatePassword(p)));