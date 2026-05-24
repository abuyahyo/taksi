// JWT токенни текшириш ва ролни аниқлаш
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Токен мавжудлигини текшириш
const authMiddleware = (req, res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ xato: 'Токен топилмади' });
  }

  const token = header.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, rol }
    next();
  } catch (err) {
    return res.status(401).json({ xato: 'Токен нотўғри ёки муддати тугаган' });
  }
};

// Фақат маълум рол учун рухсат (масалан, фақат ҳайдовчи)
const roleMiddleware = (...ruxsatRollar) => {
  return (req, res, next) => {
    if (!ruxsatRollar.includes(req.user.rol)) {
      return res.status(403).json({ xato: 'Бу амалга рухсат йўқ' });
    }
    next();
  };
};

module.exports = { authMiddleware, roleMiddleware };
