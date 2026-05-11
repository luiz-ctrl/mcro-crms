import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'af7ab2a0e0109dfc11f46a77fd576d89ce0ef1c4003c8b207fb4d75beeaf52da22784eff0d84b1ab59a9d87d3c59475ed2c26a4252b6d6e2052efc0cc1adaa81';

export function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: '8h' });
}

export function verifyToken(token) {
  return jwt.verify(token, SECRET);
}

export function authMiddleware(req) {
  const auth = req.headers['authorization'] || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) throw new Error('Unauthorized');
  return verifyToken(token);
}

export function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}
