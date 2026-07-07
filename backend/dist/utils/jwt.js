"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateTokens = generateTokens;
exports.verifyAccessToken = verifyAccessToken;
exports.verifyRefreshToken = verifyRefreshToken;
const jwt = __importStar(require("jsonwebtoken"));
const crypto = __importStar(require("crypto"));
function generateTokens(userId, email) {
    const accessSecret = process.env.JWT_ACCESS_SECRET || 'fallback_access_secret_change_me_in_prod';
    const refreshSecret = process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret_change_me_in_prod';
    const accessToken = jwt.sign({ userId, email, jti: crypto.randomUUID() }, accessSecret, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ userId, email, jti: crypto.randomUUID() }, refreshSecret, { expiresIn: '7d' });
    return { accessToken, refreshToken };
}
function verifyAccessToken(token) {
    const accessSecret = process.env.JWT_ACCESS_SECRET || 'fallback_access_secret_change_me_in_prod';
    return jwt.verify(token, accessSecret);
}
function verifyRefreshToken(token) {
    const refreshSecret = process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret_change_me_in_prod';
    return jwt.verify(token, refreshSecret);
}
//# sourceMappingURL=jwt.js.map