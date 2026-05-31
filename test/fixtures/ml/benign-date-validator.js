export function formatDate(d) {
  return d.toISOString().slice(0, 10);
}

export function validateEmail(email) {
  return /^[^@]+@[^@]+$/.test(email);
}
