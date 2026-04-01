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
const functions = __importStar(require("firebase-functions/v2"));
const admin = __importStar(require("firebase-admin"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const axios_1 = __importDefault(require("axios"));
const crypto = __importStar(require("crypto"));
const googleapis_1 = require("googleapis");
admin.initializeApp();
const db = admin.firestore();
const app = (0, express_1.default)();
// Enable CORS for frontend during local dev, but for Firebase Hosting rewrites it's often the same origin.
app.use((0, cors_1.default)({ origin: true, credentials: true }));
app.use((0, cookie_parser_1.default)());
app.use(express_1.default.json());
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
    var _a, _b;
    const user = req.user;
    const { method, endpoint, params, baseUrl } = req.body;
    try {
        // Fetch Binance credentials securely from Firestore
        // Path matches what we will save from the frontend: user_secrets/{uid}
        const secretDoc = await db.collection('user_secrets').doc(user.uid).get();
        if (!secretDoc.exists) {
            return res.status(400).json({ error: 'Binance credentials not configured for this user.' });
        }
        const { binanceApiKey: apiKey, binanceApiSecret: apiSecret } = secretDoc.data();
        if (!apiKey || !apiSecret) {
            return res.status(400).json({ error: 'API Key and Secret are required' });
        }
        const cleanKey = apiKey.trim();
        const cleanSecret = apiSecret.trim();
        const finalBaseUrl = baseUrl || 'https://api.binance.com';
        const timestamp = Date.now();
        const fullParams = Object.assign(Object.assign({}, params), { timestamp, recvWindow: 60000 });
        const sortedParams = Object.keys(fullParams)
            .sort()
            .reduce((obj, key) => {
            obj[key] = fullParams[key];
            return obj;
        }, {});
        const queryString = new URLSearchParams(sortedParams).toString();
        const signature = crypto
            .createHmac('sha256', cleanSecret)
            .update(queryString)
            .digest('hex');
        const url = `${finalBaseUrl}${endpoint}?${queryString}&signature=${signature}`;
        const response = await (0, axios_1.default)({
            method: method || 'GET',
            url,
            headers: {
                'X-MBX-APIKEY': cleanKey
            }
        });
        res.json(response.data);
    }
    catch (error) {
        const binanceError = (_a = error.response) === null || _a === void 0 ? void 0 : _a.data;
        const status = ((_b = error.response) === null || _b === void 0 ? void 0 : _b.status) || 500;
        res.status(status).json(binanceError || { msg: error.message });
    }
});
// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', app: 'TaskOS Cloud Functions API' });
});
// --- GOOGLE OAUTH CONFIGURATION ---
const createOAuthClient = () => {
    // Use Firebase environment config or env variables. In v2 functions process.env handles .env files correctly.
    const clientID = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/auth/google/callback";
    if (!clientID || !clientSecret)
        return null;
    try {
        return new googleapis_1.google.auth.OAuth2(clientID, clientSecret, redirectUri);
    }
    catch (error) {
        console.error("[Auth] Error creating OAuth client:", error);
        return null;
    }
};
app.get("/api/auth/google", (req, res) => {
    const client = createOAuthClient();
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
        prompt: 'consent'
    });
    res.redirect(url);
});
app.get("/api/auth/google/url", (req, res) => {
    const client = createOAuthClient();
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
        prompt: 'consent'
    });
    res.json({ url });
});
app.get("/api/auth/google/callback", async (req, res) => {
    const { code } = req.query;
    const client = createOAuthClient();
    if (!client || !code) {
        return res.send(`<script>window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', provider: 'google' }, '*'); window.close();</script>`);
    }
    try {
        const { tokens } = await client.getToken(code);
        // Determine if production from environment
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
// Export the Express API wrapped in Cloud Functions HTTPS trigger
exports.api = functions.https.onRequest(app);
//# sourceMappingURL=index.js.map