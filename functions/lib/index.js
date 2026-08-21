"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.api = void 0;
const https_1 = require("firebase-functions/v2/https");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const auth_1 = require("./routes/auth");
const admin_1 = require("./routes/admin");
const app = (0, express_1.default)();
// Middleware
app.use((0, cors_1.default)({ origin: true, credentials: true }));
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
// Mount routes
app.use('/api/auth', auth_1.authRouter);
app.use('/api/admin', admin_1.adminRouter);
// You can mount other routes like jury here
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
exports.api = (0, https_1.onRequest)(app);
//# sourceMappingURL=index.js.map