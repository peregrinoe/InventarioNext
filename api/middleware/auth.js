const jwt = require('jsonwebtoken');

/**
 * Verifica el JWT en el header Authorization.
 * Adjunta req.user = { id, username, nombre, role } si es válido.
 */
function requireAuth(req, res, next) {
    const auth = req.headers['authorization'];
    if (!auth || !auth.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'No autorizado: token requerido' });
    }

    const token = auth.slice(7);
    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        req.user = payload;
        next();
    } catch (err) {
        return res.status(401).json({ message: 'Token inválido o expirado' });
    }
}

/**
 * Solo permite el acceso a superadmin.
 * Debe usarse después de requireAuth.
 */
function requireAdmin(req, res, next) {
    if (req.user?.role !== 'superadmin') {
        return res.status(403).json({ message: 'Acceso restringido a administradores' });
    }
    next();
}

module.exports = { requireAuth, requireAdmin };
