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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.api = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const axios_1 = __importDefault(require("axios"));
const crypto = __importStar(require("crypto"));
// Initialize Firebase Admin once
admin.initializeApp();
const db = admin.firestore();
const app = (0, express_1.default)();
// Standard Express middlewares
app.use((0, cors_1.default)({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use((0, cookie_parser_1.default)());
app.use(express_1.default.json());
// --- Security Configurations ---
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'synapse_neural_vault_key_32chars'; // Exactly 32 chars
const IV_LENGTH = 16;
const ALLOWED_BINANCE_HOSTS = [
    'https://api.binance.com',
    'https://api.binance.us',
    'https://fapi.binance.com',
    'https://dapi.binance.com',
    'https://testnet.binance.vision'
];
function encrypt(text) {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.padEnd(32).slice(0, 32)), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}
function decrypt(text) {
    try {
        const textParts = text.split(':');
        if (textParts.length !== 2)
            return text; // Not encrypted or legacy
        const iv = Buffer.from(textParts.shift(), 'hex');
        const encryptedText = Buffer.from(textParts.join(':'), 'hex');
        const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.padEnd(32).slice(0, 32)), iv);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString();
    }
    catch (err) {
        console.error("[Encryption] Decryption failed, returning raw text", err);
        return text;
    }
}
// Auth Middleware: Verifies Firebase ID Token
const verifyToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }
    const token = authHeader.split('Bearer ')[1];
    try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        req.user = decodedToken;
        next();
    }
    catch (error) {
        console.error('Error verifying auth token', error);
        res.status(403).json({ error: 'Unauthorized: Invalid token' });
    }
};
// Binance API Proxy
app.post('/api/binance/proxy', verifyToken, async (req, res) => {
    var _a, _b, _c;
    const { method, endpoint, params, baseUrl, encryptedApiKey, encryptedApiSecret } = req.body;
    try {
        const isPublicEndpoint = endpoint.includes('/exchangeInfo') || endpoint.includes('/klines');
        let cleanKey = '';
        let cleanSecret = '';
        if (!isPublicEndpoint) {
            if (!encryptedApiKey || !encryptedApiSecret) {
                return res.status(400).json({ error: 'API Key and Secret are required for private endpoints.' });
            }
            cleanKey = decrypt(String(encryptedApiKey).trim());
            cleanSecret = decrypt(String(encryptedApiSecret).trim());
        }
        // SSRF Prevention: Validate host
        const finalBaseUrl = baseUrl || 'https://api.binance.com';
        if (!ALLOWED_BINANCE_HOSTS.includes(finalBaseUrl)) {
            return res.status(403).json({ error: `Host violation: ${finalBaseUrl} is not permitted.` });
        }
        const fullParams = Object.assign({}, params);
        if (!isPublicEndpoint) {
            fullParams.timestamp = Date.now();
            fullParams.recvWindow = 60000;
        }
        const sortedParams = Object.keys(fullParams)
            .sort()
            .reduce((obj, key) => {
            obj[key] = fullParams[key];
            return obj;
        }, {});
        const queryString = new URLSearchParams(sortedParams).toString();
        const urlSegments = [`${finalBaseUrl}${endpoint}`];
        if (Object.keys(fullParams).length > 0) {
            urlSegments.push(`?${queryString}`);
            if (!isPublicEndpoint) {
                const signature = crypto
                    .createHmac('sha256', cleanSecret)
                    .update(queryString)
                    .digest('hex');
                urlSegments.push(`&signature=${signature}`);
            }
        }
        const url = urlSegments.join('');
        const headers = {};
        if (cleanKey)
            headers['X-MBX-APIKEY'] = cleanKey;
        const response = await (0, axios_1.default)({
            method: method || 'GET',
            url,
            headers
        });
        res.json(response.data);
    }
    catch (error) {
        const binanceError = (_a = error.response) === null || _a === void 0 ? void 0 : _a.data;
        const status = ((_b = error.response) === null || _b === void 0 ? void 0 : _b.status) || 500;
        console.error('[Proxy Error]', {
            status,
            message: error.message,
            binanceMsg: binanceError === null || binanceError === void 0 ? void 0 : binanceError.msg,
            endpoint: (_c = req.body) === null || _c === void 0 ? void 0 : _c.endpoint
        });
        res.status(status).json(binanceError || {
            msg: error.message || 'Proxy request failed.',
            details: 'Check Firebase function logs for full trace'
        });
    }
});
// Endpoint used by API Check flow to validate raw credentials before saving.
app.post('/api/binance/validate', verifyToken, async (req, res) => {
    var _a, _b, _c;
    const { apiKey, apiSecret, baseUrl } = req.body || {};
    const cleanKey = String(apiKey || '').trim();
    const cleanSecret = String(apiSecret || '').trim();
    const finalBaseUrl = baseUrl || 'https://api.binance.com';
    if (!cleanKey || !cleanSecret) {
        return res.status(400).json({ ok: false, msg: 'API key and secret are required.' });
    }
    try {
        const timestamp = Date.now();
        const params = { timestamp, recvWindow: 60000 };
        const queryString = new URLSearchParams(Object.keys(params)
            .sort()
            .reduce((acc, key) => {
            acc[key] = String(params[key]);
            return acc;
        }, {})).toString();
        const signature = crypto
            .createHmac('sha256', cleanSecret)
            .update(queryString)
            .digest('hex');
        // SSRF Prevention: Validate host
        if (!ALLOWED_BINANCE_HOSTS.includes(finalBaseUrl)) {
            return res.status(403).json({ ok: false, msg: `Host violation: ${finalBaseUrl} is not permitted.` });
        }
        const url = `${finalBaseUrl}/api/v3/account?${queryString}&signature=${signature}`;
        await axios_1.default.get(url, {
            headers: {
                'X-MBX-APIKEY': cleanKey,
            },
        });
        return res.json({ ok: true, msg: 'Credentials are valid.' });
    }
    catch (error) {
        const binanceError = (_a = error.response) === null || _a === void 0 ? void 0 : _a.data;
        const status = ((_b = error.response) === null || _b === void 0 ? void 0 : _b.status) || 500;
        return res.status(status).json({
            ok: false,
            code: (_c = binanceError === null || binanceError === void 0 ? void 0 : binanceError.code) !== null && _c !== void 0 ? _c : null,
            msg: (binanceError === null || binanceError === void 0 ? void 0 : binanceError.msg) || error.message || 'Validation failed.',
        });
    }
});
// Endpoint to save and encrypt credentials
app.post('/api/binance/save-credentials', verifyToken, async (req, res) => {
    const user = req.user;
    const { apiKey, apiSecret } = req.body || {};
    if (!apiKey || !apiSecret) {
        return res.status(400).json({ error: 'API key and secret are required.' });
    }
    try {
        const encryptedKey = encrypt(String(apiKey).trim());
        const encryptedSecret = encrypt(String(apiSecret).trim());
        // DELEGATE WRITE TO CLIENT-SIDE SDK TO BYPASS CLOUD IAM RESTRICTIONS
        res.json({
            ok: true,
            msg: 'Credentials encrypted by external vault.',
            payload: {
                encryptedKey,
                encryptedSecret
            }
        });
    }
    catch (error) {
        console.error('[Save Error - Full Trace]', {
            uid: user.uid,
            error: error.message,
            stack: error.stack
        });
        res.status(500).json({
            error: 'Failed to encrypt and save credentials.',
            details: error.message
        });
    }
});
// Health check
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', app: 'Synapse Cloud Functions API', version: '2.0.1' });
});
// --- GOOGLE OAUTH CONFIGURATION (LAZY LOAD GOOGLEAPIS) ---
const createOAuthClient = async () => {
    // Lazy-load googleapis to reduce discovery timeout issues
    const { google } = await Promise.resolve().then(() => __importStar(require('googleapis')));
    const clientID = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/auth/google/callback";
    if (!clientID || !clientSecret)
        return null;
    try {
        return new google.auth.OAuth2(clientID, clientSecret, redirectUri);
    }
    catch (error) {
        console.error("[Auth] Error creating OAuth client:", error);
        return null;
    }
};
app.get("/api/auth/google", async (_req, res) => {
    const client = await createOAuthClient();
    if (!client) {
        return res.status(400).send("Google OAuth credentials missing. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.");
    }
    const url = client.generateAuthUrl({
        access_type: 'offline',
        scope: [
            'https://www.googleapis.com/auth/calendar.readonly',
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/userinfo.profile'
        ],
        prompt: 'consent',
        state: crypto.randomBytes(32).toString('hex')
    });
    res.redirect(url);
});
app.get("/api/auth/google/url", async (_req, res) => {
    const client = await createOAuthClient();
    if (!client) {
        return res.status(400).json({ error: "Google OAuth credentials missing" });
    }
    const url = client.generateAuthUrl({
        access_type: 'offline',
        scope: [
            'https://www.googleapis.com/auth/calendar.readonly',
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/userinfo.profile'
        ],
        prompt: 'consent',
        state: crypto.randomBytes(32).toString('hex')
    });
    res.json({ url });
});
app.get("/api/auth/google/callback", async (req, res) => {
    const { code } = req.query;
    const client = await createOAuthClient();
    if (!client || !code) {
        return res.send(`<script>window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', provider: 'google' }, '*'); window.close();</script>`);
    }
    try {
        const { tokens } = await client.getToken(code);
        const isProd = process.env.NODE_ENV === 'production' || process.env.GCP_PROJECT !== undefined;
        res.cookie('google_tokens', JSON.stringify(tokens), {
            httpOnly: true,
            secure: isProd,
            maxAge: 30 * 24 * 60 * 60 * 1000,
            sameSite: isProd ? 'none' : 'lax'
        });
        res.send(`
      <script>
        if (window.opener) {
          window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', provider: 'google' }, '*');
          window.close();
        } else {
          window.location.href = '/?tab=settings';
        }
      </script>
    `);
    }
    catch (error) {
        console.error("Google Auth Error:", error);
        res.send(`<script>window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', provider: 'google' }, '*'); window.close();</script>`);
    }
});
app.get("/api/auth/google/status", (req, res) => {
    const tokens = req.cookies.google_tokens;
    res.json({ connected: !!tokens });
});
// Export the Express API wrapped in Cloud Functions HTTPS trigger (v2)
exports.api = (0, https_1.onRequest)({
    region: 'europe-west1',
    cors: true,
    invoker: 'public',
    serviceAccount: 'project-166720b8-9694-4ef7-b97@appspot.gserviceaccount.com',
    maxInstances: 10,
    memory: '256MiB',
    timeoutSeconds: 60
}, app);
//# sourceMappingURL=index.js.map