import { findUserByEmail } from '../db/queries.js';

export async function login(req, res, next) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'email and password are required',
    });
  }

  try {
    const user = await findUserByEmail(email);

    if (!user || user.password_hash !== password) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Login successful (placeholder auth)',
      data: {
        id: user.id,
        laboratory_id: user.laboratory_id,
        email: user.email,
        role: user.role,
        token: 'mock-token-replace-with-jwt-later',
      },
    });
  } catch (error) {
    return next(error);
  }
}
