import { createHash } from 'crypto';

function hashPassword(password) {
  const hashed = createHash('sha1').update(password).digest('hex');
  return hashed;
}

function unHashPassword(hashedPassword) {
  return hashedPassword;
}

export { hashPassword, unHashPassword };
