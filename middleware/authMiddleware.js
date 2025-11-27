const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;

// Middleware untuk memverifikasi token
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) {
        return res.status(401).json({error: 'Aksesditolak, token tidak ditemukan'});
    }

    jwt.verify(token, JWT_SECRET, (err, decodedPayload) => {
        if (err) {
            console.error("JWT Verify Error:", err.message);
            return res.status(403).json({error: 'Token tidak valid atau kadaluwarsa'});
        }
        req.user = decodedPayload.user;
        next();
    });
}

// Middleware untuk membatasi akses berdasarkan peran
function authorizeRole(requiredRole) {
    return (req, res, next) => {
        // req.user didapat dari authenticateToken di atas
        if (!req.user || req.user.role !== requiredRole) {
            return res.status(403).json({ 
                error: `Akses ditolak. Hanya peran '${requiredRole}' yang diizinkan.` 
            });
        }
        next();
    };
}

module.exports = {
    authenticateToken,
    authorizeRole,
};