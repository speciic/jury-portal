"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAuditLog = createAuditLog;
const firebase_admin_1 = require("./firebase-admin");
async function createAuditLog(options) {
    var _a, _b, _c, _d;
    try {
        if (!firebase_admin_1.adminDb)
            return;
        await firebase_admin_1.adminDb.collection('auditLogs').add({
            userId: (_a = options.userId) !== null && _a !== void 0 ? _a : null,
            userRole: (_b = options.userRole) !== null && _b !== void 0 ? _b : null,
            action: options.action,
            entity: options.entity,
            entityId: (_c = options.entityId) !== null && _c !== void 0 ? _c : null,
            previousValue: options.previousValue
                ? JSON.stringify(options.previousValue)
                : null,
            newValue: options.newValue ? JSON.stringify(options.newValue) : null,
            reason: (_d = options.reason) !== null && _d !== void 0 ? _d : null,
            timestamp: new Date()
        });
    }
    catch (error) {
        console.error('Failed to create audit log:', error);
    }
}
//# sourceMappingURL=audit.js.map