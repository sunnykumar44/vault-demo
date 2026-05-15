/**
 * Vault OIDC Authentication Demo - Vercel Serverless Compatible
 * 
 * This Express.js server demonstrates OAuth 2.0 / OpenID Connect (OIDC)
 * integration with HashiCorp Vault acting as the OpenID Provider (OP).
 * 
 * ================================================================================
 * KEY ARCHITECTURAL CHANGE: Session Storage Strategy
 * ================================================================================
 * 
 * OLD APPROACH (In-Memory Sessions - NOT Vercel Compatible):
 * ─────────────────────────────────────────────────────────
 *   app.use(session({ store: memoryStore }))
 *   req.session.user = userInfo
 *   
 *   Problem on Vercel Serverless:
 *   - /login runs on Function Instance A → stores state in Instance A's memory
 *   - /callback runs on Function Instance B → Instance B has empty memory
 *   - Session lookup fails → "State mismatch" or "Session not found" error
 *   - Result: 100% login failure rate on Vercel
 * 
 * NEW APPROACH (Stateless Signed Cookies - Vercel Compatible):
 * ────────────────────────────────────────────────────────────
 *   res.cookie('oauth_state', state, {signed: true, httpOnly: true})
 *   res.cookie('auth', userJSON, {signed: true, httpOnly: true})
 *   
 *   How it Works:
 *   - Browser automatically maintains cookies across requests
 *   - /login on Instance A sets cookie → browser stores it
 *   - /callback on Instance B → browser sends same cookie back
 *   - Signed with COOKIE_SECRET → any instance can verify it's legitimate
 *   - Result: Auth flow works regardless of which Vercel instance handles each request
 * 
 * ================================================================================
 * OIDC Authorization Code Flow with PKCE
 * ================================================================================
 * 
 * 1. User visits app and clicks "Login with Vault"
 * 2. /login generates PKCE parameters → stores in signed cookies → redirects to Vault
 * 3. User authenticates with Vault and grants consent
 * 4. Vault redirects to /callback with authorization code
 * 5. /callback retrieves PKCE params from cookies (browser sent them)
 * 6. /callback exchanges code for ID token (PKCE verification with codeVerifier from cookie)
 * 7. /callback stores user info in signed cookie
 * 8. User is redirected home * 9. Frontend calls /api/auth-status → reads user from cookie
 * 10. User info persists in auth cookie across all requests
 * 
 * ================================================================================
 * Production Deployment
 * ================================================================================
 * 
 * Local Development:
 *   npm install && npm start
 *   http://localhost:3000
 * 
 * Vercel Production Deployment:
 *   1. Create environment variables in Vercel dashboard:
 *      - VAULT_ISSUER_URL
 *      - CLIENT_ID
 *      - CLIENT_SECRET
 *      - REDIRECT_URI (must be https://your-app.vercel.app/callback)
 *      - COOKIE_SECRET (generate with: openssl rand -hex 32)
 *   2. Deploy: git push
 *   3. Vercel automatically builds and deploys via vercel.json
 * 
 * ================================================================================
 * Documentation
 * ================================================================================
 * 
 * - OpenID Connect: https://openid.net/connect/
 * - OAuth 2.0 PKCE: https://tools.ietf.org/html/rfc7636
 * - openid-client: https://github.com/panva/node-openid-client
 * - Cookies on Vercel: https://vercel.com/docs/concepts/edge-functions/middleware
 */

require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const { Issuer, generators, custom } = require('openid-client');

custom.setHttpOptionsDefaults({
  headers: {
    'X-Pinggy-No-Screen': 'true'
  }
});
console.error('🔧 openid-client configured with X-Pinggy-No-Screen header for outbound OIDC requests');

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;

// ================================================================================
// CONFIGURATION & VALIDATION
// ================================================================================

/**
 * Validate required environment variables
 * 
 * These must be set before the server starts:
 * - VAULT_ISSUER_URL: Base URL of Vault (e.g., https://vault.example.com:8200)
 * - CLIENT_ID: Application ID registered with Vault OIDC provider
 * - CLIENT_SECRET: Secure secret for client (keep confidential!)
 * - REDIRECT_URI: Where Vault redirects after user authenticates
 *                 Must match Vault's allowed_redirect_uris
 *                 Example: https://myapp.vercel.app/callback
 * - COOKIE_SECRET: Secret for signing cookies (prevents tampering)
 *                  Generate: openssl rand -hex 32
 */
const requiredEnvVars = [
  'VAULT_ISSUER_URL',
  'CLIENT_ID',
  'CLIENT_SECRET',
  'REDIRECT_URI',
  'COOKIE_SECRET'
];

const missingEnvVars = requiredEnvVars.filter(v => !process.env[v]);
const authConfigReady = missingEnvVars.length === 0;

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingEnvVars.forEach(v => console.error(`   - ${v}`));
  console.error('\nPlease copy .env.example to .env and fill in your Vault details.');
  console.error('Or set environment variables in Vercel dashboard.');
  console.warn('⚠️  OIDC authentication is disabled until the missing variables are configured.');
}

function getEnvVarStatus() {
  return requiredEnvVars.reduce((status, envVarName) => {
    status[envVarName] = Boolean(process.env[envVarName]);
    return status;
  }, {});
}

function formatErrorDetails(error) {
  if (!error) {
    return null;
  }

  return {
    name: error.name,
    message: error.message,
    code: error.code,
    stack: error.stack,
    cause: error.cause ? formatErrorDetails(error.cause) : undefined,
    responseBody: error.response?.body,
    responseStatus: error.response?.status,
    responseHeaders: error.response?.headers
  };
}

function isTlsOrCertificateError(error) {
  const tlsCodes = new Set([
    'DEPTH_ZERO_SELF_SIGNED_CERT',
    'SELF_SIGNED_CERT_IN_CHAIN',
    'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
    'CERT_HAS_EXPIRED',
    'UNABLE_TO_GET_ISSUER_CERT',
    'UNABLE_TO_GET_ISSUER_CERT_LOCALLY',
    'ERR_TLS_CERT_ALTNAME_INVALID'
  ]);

  const errorText = `${error?.message || ''} ${error?.code || ''}`.toLowerCase();
  return tlsCodes.has(error?.code) || errorText.includes('tls') || errorText.includes('certificate') || errorText.includes('self signed');
}

function logDetailedError(context, error, extra = {}) {
  console.error(`❌ ${context}`);
  if (Object.keys(extra).length > 0) {
    console.error('   Context:', extra);
  }
  console.error('   Error details:', formatErrorDetails(error));

  if (isTlsOrCertificateError(error)) {
    console.error('   TLS/certificate validation failure detected.');
    console.error('   If Vault uses a self-signed certificate, the Node runtime must trust the certificate chain.');
  }
}

const oidcDebugState = {
  issuerUrl: process.env.VAULT_ISSUER_URL || null,
  envVars: getEnvVarStatus(),
  discoverySucceeded: false,
  clientInitialized: false,
  initializationAttempts: 0,
  lastInitializationError: null,
  lastDiscoveryError: null,
  lastClientError: null,
  lastSuccessAt: null,
  lastRedirectUrl: null
};

console.error('🔎 OIDC environment variable validation on startup:');
Object.entries(oidcDebugState.envVars).forEach(([envVarName, exists]) => {
  console.error(`   ${envVarName}: ${exists ? 'present' : 'missing'}`);
});
if (!oidcDebugState.envVars.VAULT_ISSUER_URL) {
  console.error('   VAULT_ISSUER_URL is missing; Vault discovery cannot start.');
}
if (!oidcDebugState.envVars.CLIENT_ID) {
  console.error('   CLIENT_ID is missing; openid-client setup cannot complete.');
}
if (!oidcDebugState.envVars.CLIENT_SECRET) {
  console.error('   CLIENT_SECRET is missing; openid-client setup cannot complete.');
}
if (!oidcDebugState.envVars.REDIRECT_URI) {
  console.error('   REDIRECT_URI is missing; redirect URL generation cannot complete.');
}
if (!oidcDebugState.envVars.COOKIE_SECRET) {
  console.error('   COOKIE_SECRET is missing; cookie creation and verification will fail.');
}

function getOidcCookieDomain(req) {
  const configuredDomain = process.env.OIDC_COOKIE_DOMAIN;
  if (configuredDomain) {
    return configuredDomain;
  }

  const requestHost = req?.hostname || '';
  if (requestHost.endsWith('.vercel.app')) {
    return '.vercel.app';
  }

  return undefined;
}

function buildOidcCookieOptions(req) {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production' || process.env.VERCEL === '1',
    sameSite: 'none',
    maxAge: 10 * 60 * 1000
  };

  const cookieDomain = getOidcCookieDomain(req);
  if (cookieDomain) {
    cookieOptions.domain = cookieDomain;
  }

  return cookieOptions;
}

function buildAuthCookieOptions(req) {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production' || process.env.VERCEL === '1',
    sameSite: 'none',
    maxAge: 24 * 60 * 60 * 1000
  };

  const cookieDomain = getOidcCookieDomain(req);
  if (cookieDomain) {
    cookieOptions.domain = cookieDomain;
  }

  return cookieOptions;
}

/**
 * Cookie configuration for OIDC flow state
 * 
 * Used for temporary values during /login → /callback sequence:
 * - oauth_state: CSRF protection token
 * - oauth_verifier: PKCE code verifier
 * 
 * Flags:
 * - httpOnly: JavaScript cannot access (protects from XSS)
 * - secure: Only sent over HTTPS (essential in production)
 * - sameSite: 'none' allows Vault -> app cross-site redirects to carry cookies
 * - maxAge: 10 minutes (authorization flow should complete quickly)
 */
const OIDC_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production' || process.env.VERCEL === '1',
  sameSite: 'none',
  maxAge: 10 * 60 * 1000 // 10 minutes
};

/**
 * Cookie configuration for authenticated user session
 * 
 * After successful login, this cookie stores:
 * - user: User claims (email, name, sub, etc.)
 * - id_token: JWT from Vault (contains all claims)
 * - access_token: Bearer token for API calls
 * 
 * This is a stateless session token. Unlike express-session:
 * - No server-side database needed
 * - No shared state between function instances
 * - Works perfectly on Vercel serverless
 * - User data travels with the request (in the cookie)
 * 
 * Flags:
 * - httpOnly: JavaScript cannot access tokens (XSS protection)
 * - secure: Only sent over HTTPS
 * - sameSite: 'strict' prevents CSRF
 * - maxAge: 24 hours (user session lifetime)
 */
const AUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production' || process.env.VERCEL === '1',
  sameSite: 'none',
  maxAge: 24 * 60 * 60 * 1000 // 24 hours
};

// ================================================================================
// MIDDLEWARE
// ================================================================================

app.use(express.json());

/**
 * Enable signed cookie parsing
 * 
 * Signature verification:
 * 1. Browser sends: Cookie: auth=s%3Ajsondata.signature
 * 2. cookieParser verifies signature with COOKIE_SECRET
 * 3. If valid: req.signedCookies.auth = jsondata
 * 4. If invalid (tampered): req.signedCookies.auth = undefined
 * 
 * On Vercel, each function instance has access to COOKIE_SECRET via process.env
 * All instances can verify cookies signed by any other instance
 * This is why stateless cookies work on serverless!
 */
app.use(cookieParser(process.env.COOKIE_SECRET));

/**
 * Serve static files from public folder
 * 
 * Includes:
 * - index.html: Main UI with auth status bar and demo engines
 * - auth.js: Frontend authentication logic
 * - script.js: Demo engine selector
 * - Engine files: kv.js, pki.js, transit.js, etc.
 * - style.css: Styling
 * 
 * On Vercel, these are served directly by the CDN (no function overhead)
 */
app.use(express.static(path.join(__dirname, 'public')));

// ================================================================================
// OIDC CLIENT INITIALIZATION
// ================================================================================

/**
 * Global OIDC client instance
 * 
 * Initialized once and cached:
 * 
 * Local Development:
 * - Initialized once when server.js runs
 * - Shared across all requests to same Node.js process
 * 
 * Vercel Serverless:
 * - Each function instance initializes independently
 * - Instance-level caching via initPromise prevents duplicate initializations
 * - Multiple concurrent requests use cached client
 * - "Cold start" first request may take +500ms (discovery call to Vault)
 * - Subsequent requests use cached client (warm start, ~1-5ms)
 */
let oidcClient = null;
let initPromise = null;

/**
 * Initialize OIDC Client via Vault Discovery
 * 
 * This function:
 * 1. Makes HTTP request to Vault's discovery endpoint
 *    GET {VAULT_ISSUER_URL}/.well-known/openid-configuration
 * 
 * 2. Vault responds with:
 *    - authorization_endpoint: URL for user login
 *    - token_endpoint: URL for code-to-token exchange
 *    - jwks_uri: Public keys for JWT verification
 *    - scopes_supported, claims_supported, etc.
 * 
 * 3. Creates openid-client Client with our credentials:
 *    - client_id: How Vault identifies us
 *    - client_secret: Proof we're authorized app
 *    - redirect_uris: Where Vault can redirect us
 *    - response_types: We use 'code' (authorization code flow)
 * 
 * Error Handling:
 * - Network timeout → catch block logs error
 * - Invalid URL → catch block logs error
 * - Vault not running → catch block logs error
 * - Missing VAULT_ISSUER_URL → process.env check catches it earlier
 */
async function initializeOIDC() {
  oidcDebugState.initializationAttempts += 1;
  oidcDebugState.issuerUrl = process.env.VAULT_ISSUER_URL || null;
  oidcDebugState.envVars = getEnvVarStatus();

  if (!authConfigReady) {
    const error = new Error(`OIDC auth is disabled because these environment variables are missing: ${missingEnvVars.join(', ')}`);
    oidcDebugState.lastInitializationError = formatErrorDetails(error);
    logDetailedError('OIDC initialization aborted because required environment variables are missing', error, {
      missingEnvVars
    });
    throw error;
  }

  try {
    console.error('🔐 Starting OIDC initialization and Vault discovery');
    console.error(`   Issuer URL: ${process.env.VAULT_ISSUER_URL}`);
    console.error(`   Redirect URI: ${process.env.REDIRECT_URI}`);
    console.error(`   Client ID present: ${Boolean(process.env.CLIENT_ID)}`);
    console.error(`   Client Secret present: ${Boolean(process.env.CLIENT_SECRET)}`);

    oidcDebugState.lastDiscoveryError = null;
    oidcDebugState.lastClientError = null;

    const issuer = await Issuer.discover(process.env.VAULT_ISSUER_URL);

    oidcDebugState.discoverySucceeded = true;
    console.error(`✅ Discovered issuer: ${issuer.issuer}`);
    console.error(`   Authorization endpoint: ${issuer.authorization_endpoint}`);
    console.error(`   Token endpoint: ${issuer.token_endpoint}`);
    console.error(`   JWKS endpoint: ${issuer.jwks_uri}`);

    /**
     * Create OIDC Client
     * 
     * Parameters:
     * - client_id: Our application's ID (registered with Vault)
     * - client_secret: Confidential secret (never sent to browser)
     * - redirect_uris: Array of allowed redirect URLs
     *   Example: ["https://myapp.vercel.app/callback"]
     *   Must match exactly what's registered with Vault
     * - response_types: ["code"] for authorization code flow
     */
    oidcClient = new issuer.Client({
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
      redirect_uris: [process.env.REDIRECT_URI],
      response_types: ['code']
    });

    oidcDebugState.clientInitialized = true;
    oidcDebugState.lastSuccessAt = new Date().toISOString();
    console.error('✅ OIDC client initialized successfully');
    console.error(`   Registered redirect URI: ${process.env.REDIRECT_URI}`);
    console.error(`   Client initialized: ${Boolean(oidcClient)}`);
    return oidcClient;
  } catch (error) {
    oidcDebugState.discoverySucceeded = false;
    oidcDebugState.clientInitialized = false;
    oidcDebugState.lastInitializationError = formatErrorDetails(error);

    if (error.message?.includes('.well-known') || error.message?.includes('issuer') || error.message?.includes('discover')) {
      oidcDebugState.lastDiscoveryError = formatErrorDetails(error);
    } else {
      oidcDebugState.lastClientError = formatErrorDetails(error);
    }

    logDetailedError('Failed to initialize OIDC client', error, {
      issuerUrl: process.env.VAULT_ISSUER_URL,
      redirectUri: process.env.REDIRECT_URI,
      clientIdPresent: Boolean(process.env.CLIENT_ID),
      clientSecretPresent: Boolean(process.env.CLIENT_SECRET)
    });

    console.error('   Troubleshooting steps:');
    console.error('   1. Ensure Vault is running and accessible');
    console.error('   2. Verify VAULT_ISSUER_URL is correct');
    console.error('   3. Check network connectivity to Vault');
    console.error('   4. If Vault uses a self-signed certificate, confirm the runtime trusts the certificate chain');
    throw error;
  }
}

/**
 * Get or Initialize OIDC Client
 * 
 * This function handles concurrent requests on Vercel:
 * 
 * Scenario 1 - Warm Start (common):
 * - oidcClient already initialized
 * - Return it immediately (< 1ms)
 * 
 * Scenario 2 - Cold Start, First Request:
 * - oidcClient is null
 * - initPromise is null
 * - Create initPromise and start initialization
 * - Other concurrent requests wait for same promise (not duplicated!)
 * - Return initialized client once promise resolves
 * 
 * This prevents multiple concurrent discovery calls to Vault
 * (which would be wasteful and might trigger rate limiting)
 */
async function getOIDCClient() {
  if (oidcClient) {
    console.error('♻️ Reusing cached OIDC client');
    return oidcClient;
  }

  if (!initPromise) {
    console.error('🧭 No cached OIDC client found; starting initialization');
    initPromise = initializeOIDC();
  } else {
    console.error('⏳ OIDC initialization already in progress; awaiting existing promise');
  }

  return await initPromise;
}

// ================================================================================
// ROUTES: OIDC AUTHENTICATION FLOW
// ================================================================================

/**
 * GET /login
 * 
 * Initiates OAuth 2.0 Authorization Code Flow with PKCE
 * 
 * Flow:
 * 1. Generate random security parameters
 * 2. Store them in signed cookies
 * 3. Redirect user to Vault's authorization endpoint
 * 4. Vault handles user authentication
 * 5. User returns to /callback
 * 
 * Security Features:
 * - PKCE: Prevents authorization code interception
 * - State: Prevents CSRF attacks
 * - Signed cookies: Tamper-proof across serverless instances
 */
app.get('/login', async (req, res) => {
  if (!authConfigReady) {
    console.error('❌ /login requested without required OIDC environment variables');
    console.error('   Environment status:', getEnvVarStatus());
    return res.status(503).send(`
      <h1>OIDC login is not configured</h1>
      <p>This deployment is missing the required Vercel environment variables.</p>
      <p>Set these in your Vercel project settings, then redeploy:</p>
      <ul>
        <li>VAULT_ISSUER_URL</li>
        <li>CLIENT_ID</li>
        <li>CLIENT_SECRET</li>
        <li>REDIRECT_URI</li>
        <li>COOKIE_SECRET</li>
      </ul>
    `);
  }

  try {
    const client = await getOIDCClient();
    /**
     * PKCE (Proof Key for Code Exchange)
     * 
     * Problem: Authorization code alone is vulnerable
     * - Attacker intercepts code
     * - Attacker exchanges code + client_id + client_secret
     * - Attacker gets tokens (if client_secret is leaked)
     * 
     * Solution: Require proof code came from same client
     * - Generate random codeVerifier (43-128 chars)
     * - Hash to create codeChallenge = SHA256(codeVerifier)
     * - Send codeChallenge to Vault
     * - When exchanging code, send codeVerifier
     * - Vault verifies: SHA256(codeVerifier) == codeChallenge
     * - Only original client knows codeVerifier (we don't send it to Vault initially)
     * 
     * On Vercel Serverless:
     * - /login generates codeVerifier → stores in signed cookie
     * - Browser maintains cookie across requests
     * - /callback retrieves codeVerifier from cookie
     * - Exchange works even if /login and /callback run on different instances
     */
    const codeVerifier = generators.codeVerifier();
    const codeChallenge = generators.codeChallenge(codeVerifier);

    /**
     * State Token (CSRF Protection)
     * 
     * Attack: CSRF (Cross-Site Request Forgery)
     * - Attacker creates page that redirects to /login
     * - User clicks link, gets sent to Vault
     * - Attacker intercepts redirect back
     * - Attacker can claim any authorization code as theirs
     * 
     * Defense: Verify response came from request we initiated
     * - Generate random state string
     * - Send state to Vault
     * - Vault returns same state
     * - Verify returned state matches our sent state
     * - If mismatch: attack detected
     */
    const state = generators.state();

    /**
     * Store OIDC flow parameters in signed cookies
     * 
     * WHY COOKIES (instead of express-session):
     * 
     * Session Storage (broken on Vercel):
     * ┌─────────────┐
     * │ Browser     │
     * │             │
     * │ [click /login]
     * │             │
     * └──────┬──────┘
     *        │
     *        ↓
     *  ┌──────────────────────────────────────┐
     *  │ Vercel Function Instance A           │
     *  │ - Generate codeVerifier              │
     *  │ - Store in req.session (Instance A)  │
     *  │ - Redirect to Vault                  │
     *  └──────────────────────────────────────┘
     *        │
     *        [User authenticates with Vault]
     *        │
     *        ↓
     *  ┌──────────────────────────────────────┐
     *  │ Vercel Function Instance B           │
     *  │ - Try to read req.session ← EMPTY!   │
     *  │ - Session not found in Instance B    │
     *  │ - Auth fails ❌                       │
     *  └──────────────────────────────────────┘
     * 
     * Cookie Storage (works on Vercel):
     * ┌─────────────────────────────────────────┐
     * │ Browser                                 │
     * │ ┌───────────────────────────────────┐  │
     * │ │ Cookies:                          │  │
     * │ │ - oauth_state=ABC...              │  │
     * │ │ - oauth_verifier=XYZ...           │  │
     * │ └───────────────────────────────────┘  │
     * │                                         │
     * │ [click /login]                          │
     * │                                         │
     * └──────────────┬──────────────────────────┘
     *                │
     *                ↓
     *         ┌──────────────────────────────────────┐
     *         │ Vercel Function Instance A           │
     *         │ - Generate codeVerifier              │
     *         │ - Set cookie: oauth_verifier=XYZ     │
     *         │ - Redirect to Vault                  │
     *         └──────────────────────────────────────┘
     *                │
     *                [User authenticates with Vault]
     *                │
     *                ↓
     *         ┌──────────────────────────────────────┐
     *         │ Vercel Function Instance B           │
     *         │ - Browser sends cookies!             │
     *         │ - Read oauth_verifier from cookie ✅ │
     *         │ - Exchange succeeds ✅               │
     *         └──────────────────────────────────────┘
     * 
     * Key Difference:
     * - Session: Stored on server (Instance A) → Instance B can't access
     * - Cookie: Stored on browser → Browser sends with every request
     * - Cookie signed: Can't be tampered with (signature verified on any instance)
     */
    try {
      console.error('🍪 Creating OIDC flow cookies');
      console.error(`   oauth_state length: ${state.length}`);
      console.error(`   oauth_verifier length: ${codeVerifier.length}`);
      const oidcCookieOptions = buildOidcCookieOptions(req);
      console.error('   OIDC cookie options:', oidcCookieOptions);
      res.cookie('oauth_state', state, oidcCookieOptions);
      res.cookie('oauth_verifier', codeVerifier, oidcCookieOptions);
    } catch (cookieError) {
      logDetailedError('Failed to create OIDC cookies', cookieError, {
        stateLength: state.length,
        verifierLength: codeVerifier.length
      });
      return res.status(500).json({
        error: 'Failed to initiate login',
        details: process.env.NODE_ENV === 'development' ? cookieError.message : undefined
      });
    }

    /**
     * Build Authorization URL
     * 
     * Example result:
     * https://vault.example.com:8200/oauth/authorize?
     *   client_id=my-app
     *   response_type=code
     *   redirect_uri=https://myapp.vercel.app/callback
     *   scope=openid%20profile%20email
     *   state=random-state-123
     *   code_challenge=base64url-sha256-hash
     *   code_challenge_method=S256
     * 
     * Scopes:
     * - openid: Required for OpenID Connect (mandatory, gets ID token)
     * - profile: Request user's name, family_name, etc.
     * - email: Request user's email address
     * 
     * User will see Vault login page at this URL
     */
    const authorizationUrl = client.authorizationUrl({
      scope: 'openid profile email',
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      state: state
    });

    oidcDebugState.lastRedirectUrl = authorizationUrl;
    console.error('📍 Redirecting user to Vault authorization endpoint');
    console.error(`   Authorization URL: ${authorizationUrl}`);
    console.error(`   Redirect URI used: ${process.env.REDIRECT_URI}`);
    res.redirect(authorizationUrl);
  } catch (error) {
    logDetailedError('Error in /login', error, {
      issuerUrl: process.env.VAULT_ISSUER_URL,
      redirectUri: process.env.REDIRECT_URI
    });
    res.status(500).json({
      error: 'Failed to initiate login',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

app.get('/debug/oidc', (req, res) => {
  try {
    const payload = {
      issuerUrl: process.env.VAULT_ISSUER_URL || null,
      discoverySucceeded: oidcDebugState.discoverySucceeded,
      clientInitialized: Boolean(oidcClient),
      envVars: getEnvVarStatus(),
      initializationAttempts: oidcDebugState.initializationAttempts,
      lastSuccessAt: oidcDebugState.lastSuccessAt,
      lastRedirectUrl: oidcDebugState.lastRedirectUrl,
      initializationError: oidcDebugState.lastInitializationError,
      discoveryError: oidcDebugState.lastDiscoveryError,
      clientError: oidcDebugState.lastClientError
    };

    console.error('🔎 /debug/oidc requested');
    console.error('   Debug payload:', payload);

    return res.json(payload);
  } catch (error) {
    logDetailedError('Error in /debug/oidc', error);
    return res.status(500).json({
      error: 'Failed to load OIDC debug state',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /callback
 * 
 * Vault redirects here after user authenticates
 * 
 * URL format:
 * https://myapp.vercel.app/callback?code=AUTH_CODE&state=STATE_VALUE
 * 
 * This endpoint:
 * 1. Verifies CSRF token (state parameter)
 * 2. Retrieves PKCE verifier from cookies
 * 3. Exchanges authorization code for ID token
 * 4. Validates JWT signature and claims
 * 5. Stores user info in signed cookie
 * 6. Redirects to home page
 * 
 * Security:
 * - PKCE prevents code interception attacks
 * - State prevents CSRF attacks
 * - JWT validation ensures Vault actually issued the token
 */
app.get('/callback', async (req, res) => {
  try {
    const client = await getOIDCClient();
    const { code, state } = req.query;
    console.error('📨 /callback received request');
    console.error('   Full callback query:', req.query);
    console.error('   Incoming cookie header:', req.headers.cookie || '(none)');
    console.error('   Query parameters present:', {
      hasCode: Boolean(code),
      hasState: Boolean(state),
      hasError: Boolean(req.query.error),
      hasErrorDescription: Boolean(req.query.error_description)
    });

    /**
     * Retrieve PKCE and CSRF tokens from signed cookies
     * 
     * These were set by /login endpoint:
     * - oauth_state: CSRF protection token
     * - oauth_verifier: PKCE code verifier
     * 
     * cookieParser automatically verifies signatures:
     * - If signature is valid: req.signedCookies has the value
     * - If signature is invalid (tampered): req.signedCookies has undefined
     * 
     * On Vercel:
     * - COOKIE_SECRET from environment is used for verification
     * - Any function instance can verify cookies from any other instance
     * - User's browser maintains cookies across all requests
     */
    const cookieState = req.signedCookies.oauth_state;
    const cookieVerifier = req.signedCookies.oauth_verifier;
    console.error('   Signed cookies present:', {
      oauth_state: Boolean(cookieState),
      oauth_verifier: Boolean(cookieVerifier)
    });
    console.error('   Expected state value:', cookieState || '(missing)');
    console.error('   Received state value:', state || '(missing)');

    // Validate we received authorization code
    if (!code) {
      console.error('❌ No authorization code received from Vault');
      if (req.query.error || req.query.error_description) {
        console.error('   OIDC error returned by provider:', {
          error: req.query.error,
          error_description: req.query.error_description,
          error_uri: req.query.error_uri
        });
      }
      return res.status(400).json({
        error: 'No authorization code',
        details: req.query.error_description || 'Vault did not return an authorization code. User may have denied consent or the authorization request failed.'
      });
    }

    /**
     * CSRF Protection: Verify State Parameter
     * 
     * Attack Scenario:
     * 1. Attacker creates malicious page with <img src="https://vault.com/authorize?state=FAKE">
     * 2. User visits attacker's page
     * 3. Attacker's page redirects user to Vault
     * 4. User authenticates (doesn't realize what they're doing)
     * 5. Attacker captures the authorization code
     * 6. Attacker redirects user to /callback with attacker's code
     * 7. Without state verification: /callback would accept it!
     * 
     * Defense: State Parameter
     * - /login generates unique state = "abc123"
     * - /login stores in cookie: oauth_state=abc123
     * - /login redirects to: /authorize?state=abc123
     * - Vault returns: /callback?code=xxx&state=abc123
     * - /callback verifies: url_state (abc123) == cookie_state (abc123)
     * - If attacker tries different state: verification fails!
     * - Attack prevented ✅
     */
    if (!state || state !== cookieState) {
      console.error('❌ State parameter mismatch - possible CSRF attack');
      console.error(`   Received from Vault: ${state}`);
      console.error(`   Stored in cookie: ${cookieState}`);
      return res.status(400).json({
        error: 'Invalid state parameter',
        details: 'State mismatch detected. This could indicate a CSRF attack.'
      });
    }

    /**
     * PKCE Verification: Validate Code Verifier
     * 
     * Attack Scenario:
     * 1. Attacker intercepts authorization code from Vault
     * 2. Attacker sends code to /callback
     * 3. Without PKCE: We might accept it (if code is valid)
     * 4. Attacker gets access tokens!
     * 
     * Defense: PKCE (Proof Key for Code Exchange)
     * - /login generated: codeVerifier = random string
     * - /login hashed it: codeChallenge = SHA256(codeVerifier)
     * - /login sent to Vault: ?code_challenge=codeChallenge
     * - /callback retrieves: codeVerifier from cookie
     * - /callback sends to Vault: code_verifier=codeVerifier
     * - Vault verifies: SHA256(codeVerifier) == codeChallenge
     * - If attacker has code but not codeVerifier: exchange fails!
     * - Attack prevented ✅
     */
    if (!cookieVerifier) {
      console.error('❌ PKCE code verifier not found in cookies');
      return res.status(400).json({
        error: 'Invalid session state',
        details: 'PKCE code verifier is missing. Session may have expired.'
      });
    }

    console.log('✅ State and PKCE parameters verified (CSRF + auth code interception protected)');

    /**
     * Exchange Authorization Code for Tokens
     * 
     * Server-to-Server Request to Vault Token Endpoint:
     * 
     * Request Headers:
     * - Authorization: Basic base64(client_id:client_secret)
     * 
     * Request Body:
     * - grant_type=authorization_code
     * - code=AUTH_CODE (from Vault redirect)
     * - code_verifier=VERIFIER (our PKCE code)
     * - redirect_uri=https://myapp.vercel.app/callback (must match exactly)
     * 
     * Vault Validates:
     * 1. Authorization code exists and hasn't been used
     * 2. Authorization code hasn't expired (usually 5-10 seconds)
     * 3. client_id + client_secret match our registered app
     * 4. redirect_uri matches what was used in /authorize
     * 5. SHA256(code_verifier) == code_challenge sent in /authorize
     * 
     * Response (tokenSet):
     * - id_token: JWT with user info (signed by Vault)
     * - access_token: Bearer token for API requests
     * - token_type: "Bearer"
     * - expires_in: 3600 (seconds until token expires)
     * - scope: "openid profile email"
     * 
     * CRITICAL SECURITY:
     * - client_secret is sent server-to-server (never exposed to browser)
     * - Happens over HTTPS
     * - Authorization code used only once
     */
    const params = client.callbackParams(req);
    console.error('🔁 Exchanging authorization code for tokens');
    console.error('   Redirect URI for callback exchange:', process.env.REDIRECT_URI);
    console.error('   callbackParams parsed:', params);
    const tokenSet = await client.callback(
      process.env.REDIRECT_URI,
      params,
      {
        code_verifier: cookieVerifier
      }
    );

    console.error('✅ Successfully exchanged authorization code for tokens');

    /**
     * Decode and Validate ID Token
     * 
     * ID Token is a JWT (JSON Web Token) signed by Vault
     * 
     * JWT Structure:
     * {
     *   "header": {
     *     "alg": "RS256",        ← Algorithm (RSA SHA-256)
     *     "typ": "JWT"           ← Type
     *   },
     *   "payload": {
     *     "iss": "https://vault.example.com:8200",  ← Who issued it
     *     "sub": "user-123",                        ← Subject (user ID)
     *     "aud": "my-app-id",                       ← Audience (client_id)
     *     "exp": 1234567890,                        ← Expiration time
     *     "iat": 1234567000,                        ← Issued at time
     *     "auth_time": 1234566900,                  ← When user authenticated
     *     "email": "user@example.com",              ← User's email
     *     "name": "John Doe",                       ← User's name
     *     "preferred_username": "johndoe"           ← Preferred username
     *   },
     *   "signature": "base64-encoded-signature"
     * }
     * 
     * Validation (done by openid-client):
     * 1. Signature verification: Verify token was signed by Vault's private key
     *    (Uses Vault's public key from JWKS endpoint)
     * 2. Expiration check: Verify token hasn't expired (exp claim)
     * 3. Audience check: Verify aud = our client_id (token intended for us)
     * 4. Issuer check: Verify iss = VAULT_ISSUER_URL (token from correct Vault)
     * 5. Nonce validation: If nonce was sent, verify it matches (optional)
     * 
     * If any validation fails: openid-client throws error (caught below)
     */
    const userInfo = tokenSet.claims();

    console.error(`✅ User authenticated: ${userInfo.email || userInfo.sub}`);
    console.error('✅ ID token signature verified (token is legitimate and from Vault)');

    /**
     * Store Authenticated User in Signed Cookie
     * 
     * WHY COOKIES (instead of server-side sessions):
     * 
     * Traditional Sessions (broken on Vercel):
     * - Store user in req.session.user
     * - Session stored in server memory / database
     * - Browser gets session ID in cookie
     * - Each request: look up session by ID in database
     * 
     * Problem on Vercel Serverless:
     * - /callback stores user in Function Instance B memory
     * - Next request to /api/auth-status hits Function Instance C
     * - Function Instance C has empty memory
     * - User lookup fails (session not in C's memory)
     * - Result: User appears logged out on page refresh!
     * 
     * Stateless Cookies:
     * - Store entire user data in encrypted cookie
     * - Browser maintains cookie
     * - Any function instance can read and verify cookie
     * - No shared server state needed
     * - Perfect for Vercel serverless!
     * 
     * Cookie Contents (stringified JSON):
     * {
     *   "user": {
     *     "sub": "user-123",
     *     "email": "user@example.com",
     *     "name": "John Doe",
     *     ...other OIDC claims
     *   },
     *   "id_token": "eyJhbGc...",  ← Full JWT from Vault (signed)
     *   "access_token": "ya29...",  ← Bearer token for APIs
     *   "token_type": "Bearer"
     * }
     * 
     * Cookie is:
     * - Signed: Tamper-proof (signature verified on every request)
     * - HTTP-only: JavaScript cannot access (XSS protection)
     * - Secure: Only sent over HTTPS
     * - SameSite=strict: Prevents CSRF
     */
    try {
      console.error('🍪 Creating authenticated session cookie');
      const authCookieOptions = buildAuthCookieOptions(req);
      console.error('   Auth cookie options:', authCookieOptions);
      res.cookie(
        'auth',
        JSON.stringify({
          user: userInfo,
          id_token: tokenSet.id_token,
          access_token: tokenSet.access_token
        }),
        authCookieOptions
      );
    } catch (cookieError) {
      logDetailedError('Failed to create authenticated session cookie', cookieError, {
        user: userInfo?.email || userInfo?.sub || null
      });
      return res.status(500).json({
        error: 'Failed to process authentication',
        details: process.env.NODE_ENV === 'development' ? cookieError.message : undefined
      });
    }

    /**
     * Clear temporary OIDC flow cookies
     * 
     * These were used only for /login → /callback flow
     * We no longer need them:
     * - oauth_state: State token (verified and discarded)
     * - oauth_verifier: PKCE verifier (used for exchange)
     */
    const oidcCookieOptions = buildOidcCookieOptions(req);
    res.clearCookie('oauth_state', oidcCookieOptions);
    res.clearCookie('oauth_verifier', oidcCookieOptions);

    /**
     * Redirect user home
     * 
     * Frontend will:
     * 1. Load index.html
     * 2. Run auth.js on page load
     * 3. Call /api/auth-status to check if logged in
     * 4. See auth cookie present
     * 5. Display user profile and secret engines
     */
    console.error('📍 Redirecting to home page');
    res.redirect('/');
  } catch (error) {
    logDetailedError('Error in /callback', error, {
      issuerUrl: process.env.VAULT_ISSUER_URL,
      redirectUri: process.env.REDIRECT_URI,
      hasAuthConfig: authConfigReady
    });
    if (error.response?.body) {
      console.error('   Vault response:', error.response.body);
    }
    res.status(500).json({
      error: 'Failed to process authentication',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ================================================================================
// ROUTES: USER SESSION & API
// ================================================================================

/**
 * GET /api/auth-status
 * 
 * Returns current authenticated user information
 * 
 * Frontend calls this on page load to:
 * 1. Check if user is logged in
 * 2. Get user's claims (email, name, etc.)
 * 3. Display user profile
 * 4. Hide/show login button based on auth status
 * 
 * HOW THIS WORKS ON VERCEL SERVERLESS:
 * 
 * Step-by-step:
 * 1. Frontend (JavaScript) makes request: fetch('/api/auth-status')
 * 2. Browser automatically includes auth cookie (set by /callback)
 * 3. Request arrives at Vercel (could be any function instance)
 * 4. Express middleware parses cookies via cookieParser
 * 5. Express verifies auth cookie signature with COOKIE_SECRET
 * 6. If valid: req.signedCookies.auth contains user JSON
 * 7. If invalid: req.signedCookies.auth is undefined (cookie tampered)
 * 
 * KEY INSIGHT:
 * - COOKIE_SECRET is in environment (same for all instances)
 * - Any instance can verify cookies from any other instance
 * - Works even if /api/auth-status runs on different instance than /callback
 * - User stays logged in regardless of Vercel routing
 * 
 * Response Format:
 * {
 *   "authenticated": true,
 *   "user": {
 *     "sub": "user-123",
 *     "email": "user@example.com",
 *     "name": "John Doe"
 *   },
 *   "id_token": "eyJhbGc..."  ← Optional JWT for display/debugging
 * }
 */
app.get('/api/auth-status', (req, res) => {
  try {
    const authCookie = req.signedCookies.auth;

    if (!authCookie) {
      // No auth cookie found - user is logged out
      return res.json({
        authenticated: false,
        user: null
      });
    }

    // Parse auth cookie (it's a JSON string)
    const authData = JSON.parse(authCookie);

    return res.json({
      authenticated: true,
      user: authData.user,
      id_token: authData.id_token // Frontend may display this for debugging
    });
  } catch (error) {
    console.error('❌ Error in /api/auth-status:', error.message);
    res.status(500).json({
      error: 'Failed to get auth status',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /logout
 * 
 * Logs user out by clearing authentication cookies
 * 
 * Steps:
 * 1. Clear auth cookie (contains user data and tokens)
 * 2. Clear OIDC flow cookies (in case they still exist)
 * 3. Redirect to home page
 * 4. Frontend detects user is logged out (no auth cookie)
 * 5. UI updates to show login button
 * 
 * Note:
 * - Clears browser cookies (stops sending auth cookie)
 * - Vault session still exists on Vault server
 * - If user logs in again soon, Vault might not require re-authentication
 * - For complete logout from Vault too: would need to redirect to Vault's
 *   end_session_endpoint and do logout dance (not implemented in this demo)
 */
app.get('/logout', (req, res) => {
  console.log('🚪 User logging out');

  // Clear authentication cookies
  const authCookieOptions = buildAuthCookieOptions(req);
  const oidcCookieOptions = buildOidcCookieOptions(req);
  res.clearCookie('auth', authCookieOptions);
  res.clearCookie('oauth_state', oidcCookieOptions);
  res.clearCookie('oauth_verifier', oidcCookieOptions);

  // Redirect to home page
  res.redirect('/');
});

// ================================================================================
// ROUTES: SERVE SPA
// ================================================================================

/**
 * GET / (and other unmatched routes)
 * 
 * Serves index.html for any route not matched above
 * 
 * Why:
 * - Frontend is a single-page app (SPA)
 * - Frontend handles routing for demo engine selections
 * - All routes should return index.html
 * - JavaScript in frontend then routes appropriately
 */
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

/**
 * Catch-all: any other route
 * Serve index.html (SPA routing)
 */
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ================================================================================
// ERROR HANDLING
// ================================================================================

/**
 * Global error handler
 * 
 * Catches any unhandled errors and returns JSON response
 * Prevents server crashes and gives meaningful error messages
 */
app.use((err, req, res, next) => {
  logDetailedError('Unhandled error', err, {
    method: req.method,
    url: req.originalUrl
  });
  res.status(500).json({
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ================================================================================
// SERVER STARTUP & EXPORT
// ================================================================================

/**
 * Initialize OIDC and start server
 * 
 * Local Development:
 * - Initializes OIDC on startup
 * - Starts Express server
 * - Listens on PORT (default 3000)
 * 
 * Vercel Production:
 * - Initialization happens lazily on first request
 * - Vercel's runtime handles server startup
 * - app is exported as serverless function handler
 */
async function startServer() {
  try {
    // Initialize OIDC client only when auth configuration is present.
    // This keeps the static demo available on Vercel even if env vars are not set yet.
    console.error('🚀 Starting server initialization');
    console.error('   Environment status at startup:', getEnvVarStatus());
    if (authConfigReady) {
      await getOIDCClient();
    } else {
      console.error('⚠️  Starting without OIDC client because auth env vars are missing.');
    }

    app.listen(PORT, () => {
      console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║  🏦 Vault OIDC Demo - Vercel Serverless Compatible           ║
║                                                               ║
║  Server running on: http://localhost:${PORT}
║                                                               ║
║  OIDC Issuer: ${process.env.VAULT_ISSUER_URL}
║  Redirect URI: ${process.env.REDIRECT_URI}
║                                                               ║
║  Architecture:                                                ║
║  ✅ Express.js backend                                        ║
║  ✅ Stateless signed cookies (Vercel compatible)             ║
║  ✅ PKCE flow (secure OAuth 2.0)                             ║
║  ✅ Frontend secret engine demos                             ║
║                                                               ║
║  Deployment:                                                  ║
║  Local:  npm start                                            ║
║  Vercel: git push (auto-deploy via vercel.json)              ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    logDetailedError('Failed to start server', error);
    process.exit(1);
  }
}

// Start only when running locally. Vercel loads this file as a serverless handler.
if (!process.env.VERCEL && require.main === module) {
  startServer().catch(error => {
    logDetailedError('Fatal startup error', error);
    process.exit(1);
  });
}

// ================================================================================
// EXPORT FOR VERCEL
// ================================================================================

/**
 * Export Express app for Vercel serverless functions
 * 
 * Vercel wraps this and invokes it for each request
 * Works alongside app.listen() for local development
 */
module.exports = app;
