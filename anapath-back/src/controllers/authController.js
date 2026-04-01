import { findUserByEmail } from '../db/queries.js';

export async function login(req, res, next) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Adresse e-mail et mot de passe obligatoires.",
    });
  }

  try {
    const user = await findUserByEmail(email);

    if (!user || user.password_hash !== password) {
      return res.status(401).json({
        success: false,
        message: 'Identifiants invalides.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Connexion réussie.',
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
