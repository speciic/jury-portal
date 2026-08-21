"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminAuth = exports.adminDb = void 0;
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const auth_1 = require("firebase-admin/auth");
if (!(0, app_1.getApps)().length) {
    (0, app_1.initializeApp)(); // Uses default credentials in Cloud Functions
}
exports.adminDb = (0, firestore_1.getFirestore)();
exports.adminAuth = (0, auth_1.getAuth)();
//# sourceMappingURL=firebase-admin.js.map