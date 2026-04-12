/**
 * Role-based authorization middleware
 * Used after `protect` to enforce role restrictions on routes
 *
 * Usage:
 *   router.delete('/user/:id', protect, authorize('admin'), deleteUser)
 */
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Not authenticated',
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `Access denied. Required role: [${roles.join(', ')}]. Your role: ${req.user.role}`,
            });
        }

        next();
    };
};

/**
 * Ownership guard — ensures user can only modify their own resources
 * Compares req.user.id against a resource field (default: 'userId')
 *
 * Usage:
 *   router.put('/portfolio/:id', protect, ownerOnly('userId'), updatePortfolio)
 */
const ownerOnly = (ownerField = 'userId') => {
    return (req, res, next) => {
        // This is checked inside the controller where we have DB access;
        // this middleware attaches the check helper to req
        req.assertOwner = (resource) => {
            const resourceOwner = resource[ownerField]?.toString();
            const requestingUser = req.user._id?.toString();
            if (resourceOwner !== requestingUser && req.user.role !== 'admin') {
                return false;
            }
            return true;
        };
        next();
    };
};

module.exports = { authorize, ownerOnly };
