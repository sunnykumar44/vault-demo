# QUICKSTART Guide - Vault Demo with OIDC Auth

Get up and running in 5 minutes!

## Prerequisites
- Node.js 14+ installed
- Vault server running (or dev mode)
- `vault` CLI configured

## Step 1: Set Up Vault OIDC

```bash
# Start Vault dev server (in separate terminal)
vault server -dev

# In another terminal, set Vault address
export VAULT_ADDR='http://localhost:8200'
export VAULT_TOKEN='s.xxxxxxx'  # From dev server output

# Enable OIDC auth method
vault auth enable oidc

# Configure OIDC
vault write auth/oidc/config \
  oidc_discovery_url="http://localhost:8200" \
  oidc_client_id="vault-demo-app" \
  oidc_client_secret="demo-client-secret-12345" \
  default_role="demo"

# Create a role
vault write auth/oidc/role/demo \
  user_claim="email" \
  allowed_redirect_uris="http://localhost:3000/callback" \
  token_ttl=1h
```

## Step 2: Install Dependencies

```bash
cd vault-demo
npm install
```

## Step 3: Configure Application

```bash
# Copy environment template
cp .env.example .env

# Edit .env (or use these defaults for local testing):
cat > .env << 'EOF'
VAULT_ISSUER_URL=http://localhost:8200
CLIENT_ID=vault-demo-app
CLIENT_SECRET=demo-client-secret-12345
REDIRECT_URI=http://localhost:3000/callback
COOKIE_SECRET=super-secret-cookie-key-min-32-chars
# SESSION_SECRET also works as a fallback, but COOKIE_SECRET is preferred.
PORT=3000
NODE_ENV=development
EOF
```

## Step 4: Start the Server

```bash
npm start
# or: npm run dev  (with auto-reload)
```

## Step 5: Open in Browser

Visit: **http://localhost:3000**

Click "Login with Vault" and authenticate!

## What's Available

### Secret Engine Demo
- No login required!
- Select engine → Generate token → Enter Vault
- Explore all 17+ secret engines

### OIDC Authentication
- Click "Login with Vault"
- See your user profile
- View ID token claims
- See raw JWT token

## File Layout

```
vault-demo/
├── server.js              # Express + OIDC backend
├── package.json           # Dependencies
├── .env                   # Config (create from .env.example)
├── .env.example           # Config template
├── README.md              # Full documentation
│
└── public/                # Frontend
    ├── index.html         # UI with auth elements
    ├── style.css          # Styles
    ├── auth.js            # Auth logic
    ├── script.js          # Demo logic
    └── *-engines.js       # Secret engine implementations
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Cannot GET /" | Start server with `npm start` |
| Port 3000 in use | Change PORT in .env |
| OIDC init fails | Check Vault is running at VAULT_ISSUER_URL |
| "State mismatch" | Clear cookies and try again |
| Token exchange fails | Verify .env values match Vault config |

## Next Steps

- Read [README.md](./README.md) for comprehensive documentation
- Review [server.js](./server.js) for detailed code comments
- Check [public/auth.js](./public/auth.js) for frontend logic
- Explore Vault [OIDC documentation](https://www.vaultproject.io/docs/auth/jwt/oidc_providers)

## Security Note

⚠️ This is a **demo application**. For production:
- Use HTTPS everywhere
- Rotate secrets regularly
- Use database session store
- Implement proper error handling
- Add rate limiting
- Implement token refresh
- Use environment secrets management

---

**Need help?** See [Troubleshooting in README](./README.md#-troubleshooting)
