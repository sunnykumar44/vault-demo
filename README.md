# Vault Secret Engine Demo + Vault OIDC Authentication

A comprehensive, educational web application demonstrating:
- **HashiCorp Vault Secret Engines** (KV, Transit, PKI, Database, AWS, GCP, etc.)
- **OpenID Connect (OIDC) Authentication** with Vault as the Identity Provider
- **OAuth 2.0 Authorization Code Flow** with PKCE
- **Secure Session Management**

## 🎯 Project Overview

This project extends an existing Vault secret engine demo by adding a lightweight Node.js + Express backend that enables **OIDC login with Vault**. The frontend remains fully functional while users can now authenticate using Vault's OIDC provider.

### What's New in v2.0

✅ **OIDC Authentication** - Login with Vault as the Identity Provider  
✅ **User Profile Display** - View authenticated user information  
✅ **ID Token Claims** - Inspect all OIDC claims after login  
✅ **JWT Display** - See the raw ID token for educational purposes  
✅ **Secure Sessions** - Persistent login state across browser sessions  
✅ **Educational Comments** - Detailed explanations of OIDC flow throughout code  

### No Breaking Changes

✅ All existing secret engine demos remain fully functional  
✅ Frontend structure unchanged (just added UI elements)  
✅ Original JavaScript files preserved in `public/` folder  
✅ Can use demo without logging in (optional authentication)  

## 📋 Prerequisites

- **Node.js** >= 14.0.0 ([Download](https://nodejs.org/))
- **Vault** server running with OIDC auth method enabled ([Vault Docs](https://www.vaultproject.io/docs/auth/jwt/oidc_providers))
- **npm** or **yarn** package manager

### Vault OIDC Setup

Before running this app, ensure Vault has OIDC auth method configured:

```bash
# Enable OIDC auth method
vault auth enable oidc

# Configure OIDC auth (from Vault server)
vault write auth/oidc/config \
  oidc_discovery_url="http://localhost:8200" \
  oidc_client_id="vault-demo-app" \
  oidc_client_secret="your-strong-secret" \
  default_role="demo"

# Create an OIDC role
vault write auth/oidc/role/demo \
  user_claim="email" \
  allowed_redirect_uris="http://localhost:3000/callback" \
  token_ttl=1h \
  token_max_ttl=24h
```

## 🚀 Getting Started

### 1. Clone/Extract Repository

```bash
cd vault-demo
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

```bash
# Copy example config
cp .env.example .env

# Edit .env with your settings
# Required:
#   - VAULT_ISSUER_URL: Your Vault address
#   - CLIENT_ID: OIDC client ID from Vault
#   - CLIENT_SECRET: OIDC client secret (keep secure!)
#   - REDIRECT_URI: http://localhost:3000/callback (must match Vault config)
#   - SESSION_SECRET: Random string for session signing
```

### 4. Start the Server

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

Server runs on `http://localhost:3000`

### 5. Open in Browser

Navigate to `http://localhost:3000` and click "Login with Vault"

## 📁 Project Structure

```
vault-demo/
├── server.js                 # Express backend with OIDC routes
├── package.json             # Node.js dependencies
├── .env.example             # Environment variable template
├── README.md                # This file
│
└── public/                  # Frontend (served as static files)
    ├── index.html           # Main UI with auth elements
    ├── style.css            # Styling (including auth UI)
    ├── script.js            # Secret engine demo logic
    ├── auth.js              # OIDC authentication logic
    │
    ├── kv.js                # KV Secret Engine
    ├── transit.js           # Transit Secret Engine
    ├── pki.js               # PKI Secret Engine
    ├── database.js          # Database Secret Engine
    ├── aws.js               # AWS Secret Engine
    ├── gcp.js               # GCP Secret Engine
    ├── transform.js         # Transform Secret Engine (Enterprise)
    ├── kmip.js              # KMIP Secret Engine (Enterprise)
    ├── kubernetes.js        # Kubernetes Secret Engine
    └── extra-engines.js     # SSH, Azure, AD, TOTP, LDAP, RabbitMQ, Consul, Nomad
```

## 🔐 OIDC Authentication Flow

### High-Level Overview

```
User → Click "Login with Vault"
       ↓
   Redirected to Vault authorization endpoint
       ↓
   User authenticates with Vault
       ↓
   Vault redirects back with authorization code
       ↓
   Backend exchanges code for ID token (server-to-server)
       ↓
   Backend stores user info in session
       ↓
   Frontend displays user profile
```

### Detailed Authorization Code Flow

1. **User Initiates Login**
   - User clicks "Login with Vault" button
   - Frontend calls `redirectToLogin()` which goes to `/login`

2. **Authorization Request** (`GET /login`)
   - Server generates PKCE code challenge and state token
   - Server stores them in session (secure server-side)
   - Server redirects user to Vault's authorization endpoint:
     ```
     https://vault.example.com:8200/oauth/authorize?
       client_id=vault-demo-app
       response_type=code
       redirect_uri=http://localhost:3000/callback
       scope=openid profile email
       state=<random-state>
       code_challenge=<pkce-challenge>
       code_challenge_method=S256
     ```

3. **User Authenticates at Vault**
   - Vault prompts for credentials
   - User logs in with Vault-configured auth method
   - Vault requests user consent ("Authorize this app?")
   - Vault redirects to callback with authorization code

4. **Authorization Code Callback** (`GET /callback`)
   - Vault redirects: `http://localhost:3000/callback?code=AUTH_CODE&state=STATE`
   - Server verifies state matches (prevents CSRF)
   - Server exchanges authorization code for tokens:
     ```
     POST https://vault.example.com:8200/v1/identity/oidc/token
     {
       "grant_type": "authorization_code",
       "code": "AUTH_CODE",
       "code_verifier": "<original-verifier>",
       "client_id": "vault-demo-app",
       "client_secret": "SECRET",
       "redirect_uri": "http://localhost:3000/callback"
     }
     ```

5. **Token Exchange Response**
   - Vault validates code and verifier match
   - Vault returns ID token + Access token:
     ```json
     {
       "id_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
       "access_token": "hvs.CAESLJ47WTYzN...",
       "token_type": "Bearer",
       "expires_in": 3600
     }
     ```

6. **Server Validates ID Token**
   - Server verifies JWT signature using Vault's public key
   - Server checks token hasn't expired
   - Server extracts user claims (email, name, sub, etc.)

7. **Session Created**
   - Server stores user info and tokens in session
   - Session is identified by secure httpOnly cookie
   - Cookie is sent to browser

8. **User Logged In**
   - Server redirects to home page
   - Frontend checks auth status and displays user profile
   - User information visible throughout session

## 🔑 Key Concepts Explained

### OpenID Connect (OIDC)

OIDC is a layer on top of OAuth 2.0 that adds:
- **ID Tokens**: JWTs containing user identity information
- **UserInfo Endpoint**: Query for user details
- **Standard Claims**: Normalized user info (email, name, sub, etc.)

Read more: [OpenID Connect Explained](https://openid.net/connect/)

### Authorization Code Flow

OAuth 2.0 flow designed for traditional web apps:
1. User clicks login
2. App redirects to authorization server
3. User authenticates and grants consent
4. Authorization server redirects with short-lived code
5. **App's backend** exchanges code for tokens (keeps client_secret safe)
6. User is logged in

Why this flow?
- Client secret never exposed to browser
- Authorization code is single-use and short-lived
- Suitable for server-rendered apps

### PKCE (Proof Key for Code Exchange)

Security extension for authorization code flow:
1. Client generates random `code_verifier`
2. Client hashes it to create `code_challenge`
3. Client sends `code_challenge` in authorization request
4. Client sends `code_verifier` when exchanging code for tokens
5. Server verifies they match (cryptographically)

Why PKCE?
- Prevents authorization code interception attacks
- Required for single-page apps and mobile apps
- Now recommended for all OAuth 2.0 applications

### JWT (JSON Web Token)

ID tokens and access tokens are JWTs. Structure:

```
Header.Payload.Signature

eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.
eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.
SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

- **Header**: Algorithm and token type
- **Payload**: Claims (user info, token metadata)
- **Signature**: Proves Vault signed this (not tampered with)

### ID Token Claims

Common claims in an ID token:

| Claim | Meaning |
|-------|---------|
| `iss` | Issuer - who issued this token (Vault URL) |
| `sub` | Subject - unique user identifier |
| `aud` | Audience - who this token is for (client_id) |
| `iat` | Issued At - when token was created (Unix timestamp) |
| `exp` | Expires - when token expires (Unix timestamp) |
| `email` | User's email address |
| `name` | User's full name |
| `picture` | URL to user's profile picture |

### Session Management

After successful login:
1. Server creates a session object in memory
2. Session contains user info and tokens
3. Session is identified by a `sessionid` cookie
4. Cookie is sent to browser (httpOnly, secure flags set)
5. Browser includes cookie in every request
6. Server retrieves session from memory using cookie
7. User stays logged in until session expires

On logout:
1. Server destroys session
2. Browser's cookie becomes invalid
3. Next request has no valid session
4. User must login again

## 📝 API Endpoints

### Authentication Endpoints

#### `GET /login`
Initiates OIDC authorization code flow. Redirects user to Vault.

**Response**: Redirect to Vault authorization endpoint

#### `GET /callback`
Vault redirects here after user authentication. Exchanges authorization code for ID token.

**Parameters**:
- `code`: Authorization code from Vault
- `state`: State parameter (verified for CSRF protection)

**Response**: Redirect to `/` (home page)

#### `GET /logout`
Destroys user session and logs them out.

**Response**: Redirect to `/`

### API Endpoints

#### `GET /api/auth-status`
Check if user is currently authenticated.

**Response**:
```json
{
  "authenticated": true,
  "user": {
    "email": "user@example.com",
    "name": "User Name",
    "sub": "user-unique-id",
    "iat": 1234567890,
    "exp": 1234571490,
    "iss": "https://vault.example.com:8200",
    "id_token": "eyJhbGc...",
    "access_token": "hvs.CA..."
  }
}
```

## 🛡️ Security Best Practices

This implementation includes:

✅ **HTTPS-ready** - Secure cookies only in production  
✅ **PKCE** - Authorization code interception protection  
✅ **State Verification** - CSRF attack prevention  
✅ **JWT Validation** - Signature verification, expiry checks  
✅ **httpOnly Cookies** - Prevents XSS access to session  
✅ **Secure Session** - Server-side session storage  
✅ **Client Secret Protection** - Never exposed to frontend  
✅ **Environment Variables** - Secrets not in source code  

### For Production

Additional recommendations:

- [ ] Use HTTPS everywhere (not just secure flag)
- [ ] Use a database session store (Redis, MongoDB, PostgreSQL)
- [ ] Implement HTTPS-only redirect
- [ ] Add CORS if frontend is on different domain
- [ ] Implement rate limiting on auth endpoints
- [ ] Add audit logging for authentication events
- [ ] Rotate client secrets regularly
- [ ] Use strong SESSION_SECRET (min 32 characters)
- [ ] Implement token refresh if using long-lived tokens
- [ ] Add logout notification to Vault (revoke tokens)

## 🔧 Development

### Run with Hot Reload

```bash
npm run dev
```

Uses `nodemon` to auto-restart when files change.

### Debugging

Enable debug logging:

```bash
DEBUG=* npm start
```

### Testing Locally

1. Start Vault dev server:
   ```bash
   vault server -dev
   ```

2. Configure Vault (see Prerequisites section)

3. Start this app:
   ```bash
   npm run dev
   ```

4. Navigate to http://localhost:3000

## 📚 Learning Resources

### OIDC & OAuth 2.0

- [OpenID Connect Explained (Video)](https://www.youtube.com/watch?v=t18YB3xDfXI)
- [OAuth 2.0 Authorization Code Flow](https://tools.ietf.org/html/rfc6749#section-1.3.1)
- [PKCE](https://tools.ietf.org/html/rfc7636)
- [JWT.io](https://jwt.io/) - Interactive JWT decoder

### Vault

- [Vault OIDC Auth Method](https://www.vaultproject.io/docs/auth/jwt/oidc_providers)
- [Vault Identity Tokens](https://www.vaultproject.io/docs/secret/identity/oidc-provider)
- [Vault API Documentation](https://www.vaultproject.io/api-docs)

### Libraries

- [openid-client](https://github.com/panva/node-openid-client) - OIDC client library
- [Express.js](https://expressjs.com/) - Web framework
- [express-session](https://github.com/expressjs/session) - Session middleware

## 🐛 Troubleshooting

### "OIDC client not initialized"

**Cause**: Server couldn't discover Vault's OIDC configuration  
**Solution**: 
- Verify Vault is running: `curl http://localhost:8200`
- Check VAULT_ISSUER_URL in .env is correct
- Check Vault logs for errors

### "State mismatch! Possible CSRF attack"

**Cause**: Session state doesn't match callback state  
**Solution**:
- Clear browser cookies and try again
- Ensure SESSION_SECRET is set and consistent
- Check server and browser clocks are synchronized

### "Invalid state parameter"

**Cause**: State token missing from session  
**Solution**:
- Ensure cookies are enabled in browser
- Try in private/incognito window
- Restart server

### "Authorization code expired"

**Cause**: Too much time between redirect and callback  
**Solution**:
- Try logging in again (codes are single-use)
- Ensure system clocks are synchronized
- Check Vault logs

### "Invalid client secret"

**Cause**: CLIENT_SECRET doesn't match Vault configuration  
**Solution**:
- Verify CLIENT_SECRET in .env matches Vault
- Make sure no extra whitespace in .env
- Check you're using the correct OIDC client secret (not auth token)

## 🤝 Contributing

This is an educational demo. Contributions welcome!

Areas for enhancement:
- Add token refresh logic
- Implement logout redirect to Vault's end_session_endpoint
- Add database session store
- Add more comprehensive error handling
- Add Docker support
- Add automated tests

## 📄 License

MIT License - See LICENSE file

## 📞 Support

For issues or questions:

1. Check [Troubleshooting](#-troubleshooting) section above
2. Review [Vault OIDC Documentation](https://www.vaultproject.io/docs/auth/jwt/oidc_providers)
3. Check [openid-client Issues](https://github.com/panva/node-openid-client/issues)
4. Review server console logs for detailed error messages

---

**Built with ❤️ for learning Vault security concepts**
