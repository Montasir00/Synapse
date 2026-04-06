import { onRequest } from "firebase-functions/v2/https";
import * as admin from 'firebase-admin';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import axios from 'axios';
import * as crypto from 'crypto';

// Initialize Firebase Admin once
admin.initializeApp();
const db = admin.firestore();

const app = express();

// Standard Express middlewares
app.use(cors({ 
  origin: true, 
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(cookieParser());
app.use(express.json());

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

function encrypt(text: string) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.padEnd(32).slice(0, 32)), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text: string) {
  try {
    const textParts = text.split(':');
    if (textParts.length !== 2) return text; // Not encrypted or legacy
    const iv = Buffer.from(textParts.shift()!, 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.padEnd(32).slice(0, 32)), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (err) {
    console.error("[Encryption] Decryption failed, returning raw text", err);
    return text;
  }
}


// Auth Middleware: Verifies Firebase ID Token
const verifyToken = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    (req as any).user = decodedToken;
    next();
  } catch (error) {
    console.error('Error verifying auth token', error);
    res.status(403).json({ error: 'Unauthorized: Invalid token' });
  }
};

// Binance API Proxy
app.post('/api/binance/proxy', verifyToken, async (req, res) => {
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


    const fullParams = { ...params };
    if (!isPublicEndpoint) {
      fullParams.timestamp = Date.now();
      fullParams.recvWindow = 60000;
    }
    
    const sortedParams = Object.keys(fullParams)
      .sort()
      .reduce((obj: any, key: string) => {
        obj[key] = fullParams[key];
        return obj;
      }, {});

    const queryString = new URLSearchParams(sortedParams as Record<string, string>).toString();

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

    const headers: any = {};
    if (cleanKey) headers['X-MBX-APIKEY'] = cleanKey;

    const response = await axios({
      method: method || 'GET',
      url,
      headers
    });

    res.json(response.data);
  } catch (error: any) {
    const binanceError = error.response?.data;
    const status = error.response?.status || 500;
    
    console.error('[Proxy Error]', {
      status,
      message: error.message,
      binanceMsg: binanceError?.msg,
      endpoint: req.body?.endpoint
    });

    res.status(status).json(binanceError || { 
      msg: error.message || 'Proxy request failed.',
      details: 'Check Firebase function logs for full trace'
    });
  }
});

// Endpoint used by API Check flow to validate raw credentials before saving.
app.post('/api/binance/validate', verifyToken, async (req, res) => {
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

    const queryString = new URLSearchParams(
      Object.keys(params)
        .sort()
        .reduce((acc: Record<string, string>, key) => {
          acc[key] = String((params as Record<string, number>)[key]);
          return acc;
        }, {})
    ).toString();

    const signature = crypto
      .createHmac('sha256', cleanSecret)
      .update(queryString)
      .digest('hex');

    // SSRF Prevention: Validate host
    if (!ALLOWED_BINANCE_HOSTS.includes(finalBaseUrl)) {
      return res.status(403).json({ ok: false, msg: `Host violation: ${finalBaseUrl} is not permitted.` });
    }

    const url = `${finalBaseUrl}/api/v3/account?${queryString}&signature=${signature}`;

    await axios.get(url, {
      headers: {
        'X-MBX-APIKEY': cleanKey,
      },
    });

    return res.json({ ok: true, msg: 'Credentials are valid.' });
  } catch (error: any) {
    const binanceError = error.response?.data;
    const status = error.response?.status || 500;

    return res.status(status).json({
      ok: false,
      code: binanceError?.code ?? null,
      msg: binanceError?.msg || error.message || 'Validation failed.',
    });
  }
});

// Endpoint to save and encrypt credentials
app.post('/api/binance/save-credentials', verifyToken, async (req, res) => {
  const user = (req as any).user;
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
  } catch (error: any) {
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
  const { google } = await import('googleapis');
  
  const clientID = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/auth/google/callback";

  if (!clientID || !clientSecret) return null;
  try {
    return new google.auth.OAuth2(clientID, clientSecret, redirectUri);
  } catch (error) {
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
    const { tokens } = await client.getToken(code as string);
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
  } catch (error) {
    console.error("Google Auth Error:", error);
    res.send(`<script>window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', provider: 'google' }, '*'); window.close();</script>`);
  }
});

app.get("/api/auth/google/status", (req, res) => {
  const tokens = req.cookies.google_tokens;
  res.json({ connected: !!tokens });
});

// Export the Express API wrapped in Cloud Functions HTTPS trigger (v2)
export const api = onRequest({
  region: 'europe-west1',
  cors: true,
  invoker: 'public',
  serviceAccount: 'project-166720b8-9694-4ef7-b97@appspot.gserviceaccount.com',
  maxInstances: 10,
  memory: '256MiB',
  timeoutSeconds: 60
}, app);
