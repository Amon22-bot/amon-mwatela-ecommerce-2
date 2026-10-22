const crypto = require('crypto');

const sessions = new Map();
const SESSION_LIFETIME_MS = 8 * 60 * 60 * 1000;

function issueAdminSession(password) {
    const configuredPassword = process.env.ADMIN_PASSWORD;
    if (!configuredPassword) {
        return { error: 'Admin sign-in is not configured. Add ADMIN_PASSWORD to server/.env.' };
    }
    if (typeof password !== 'string' || password.length > 256) {
        return { error: 'Enter the admin password.' };
    }

    const expected = crypto.createHash('sha256').update(configuredPassword).digest();
    const submitted = crypto.createHash('sha256').update(password).digest();
    if (!crypto.timingSafeEqual(expected, submitted)) {
        return { error: 'The admin password is incorrect.' };
    }

    const token = crypto.randomBytes(32).toString('hex');
    sessions.set(token, Date.now() + SESSION_LIFETIME_MS);
    return { token, expiresIn: SESSION_LIFETIME_MS };
}

function getSessionToken(req) {
    const header = req.get('authorization') || '';
    const match = header.match(/^Bearer\s+([a-f0-9]{64})$/i);
    return match ? match[1] : '';
}

function destroyAdminSession(req) {
    const token = getSessionToken(req);
    if (token) sessions.delete(token);
}

function requireAdmin(req, res, next) {
    const token = getSessionToken(req);
    const expiresAt = sessions.get(token);
    if (!expiresAt || expiresAt <= Date.now()) {
        if (token) sessions.delete(token);
        return res.status(401).json({ message: 'Admin sign-in expired. Please sign in again.' });
    }
    next();
}

module.exports = { issueAdminSession, requireAdmin, destroyAdminSession };
