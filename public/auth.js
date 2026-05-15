/**
 * Frontend Authentication Module for Vault OIDC Demo
 * 
 * This module handles:
 * - Redirecting users to Vault for OIDC login
 * - Displaying user information after authentication
 * - Managing logout
 * - Rendering JWT claims
 * 
 * OIDC Flow Explanation:
 * 1. User clicks "Login with Vault" button
 * 2. User is redirected to Vault's authorization endpoint
 * 3. Vault prompts user to authenticate and consent
 * 4. User is redirected back to /callback with an authorization code
 * 5. Backend exchanges code for ID token + Access token
 * 6. Frontend displays user claims from the ID token
 */

/**
 * Redirects user to the backend login endpoint
 * which in turn redirects to Vault's authorization endpoint
 */
function redirectToLogin() {
  // Redirect to backend login route which handles the OIDC flow
  window.location.href = '/login';
}

/**
 * Redirects user to logout endpoint
 */
function redirectToLogout() {
  window.location.href = '/logout';
}

/**
 * Initializes authentication on page load
 * Checks if user is already logged in and displays profile if so
 */
function initAuth() {
  // Fetch current authentication status from backend
  fetch('/api/auth-status', {
    credentials: 'include' // Include session cookies
  })
    .then(response => response.json())
    .then(data => {
      if (data.authenticated && data.user) {
        displayUserProfile(data.user);
      }
    })
    .catch(error => console.log('Auth status check:', error));
}

/**
 * Displays user profile information after successful OIDC login
 * Extracts and renders ID token claims
 * 
 * @param {Object} user - User object containing OIDC ID token claims
 */
function displayUserProfile(user) {
  // Update auth status bar
  const authStatusBar = document.getElementById('authStatusBar');
  if (authStatusBar) {
    authStatusBar.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
  }

  const authStatus = document.getElementById('authStatus');
  if (authStatus) {
    authStatus.textContent = '✓ Logged in with Vault';
    authStatus.style.color = '#ffffff';
  }

  const loginBtn = document.getElementById('loginBtn');
  if (loginBtn) {
    loginBtn.style.display = 'none';
  }

  const userInfoContainer = document.getElementById('userInfoContainer');
  if (userInfoContainer) {
    userInfoContainer.classList.remove('hidden');
    const userEmail = document.getElementById('userEmail');
    if (userEmail && user.email) {
      userEmail.textContent = user.email;
    }
  }

  // Display user claims box
  const userClaimsBox = document.getElementById('userClaimsBox');
  if (userClaimsBox) {
    userClaimsBox.classList.remove('hidden');
  }

  // Populate claims
  populateClaims(user);

  // Display JWT token
  if (user.id_token) {
    displayJwt(user.id_token);
  }
}

/**
 * Populates the claims grid with user information from OIDC ID token
 * 
 * OIDC ID Token Claims:
 * - email: The user's email address
 * - name: The user's full name (if provided by IdP)
 * - sub (Subject): A unique identifier for the user, never reused
 * - iat (Issued At): Unix timestamp when token was issued
 * - exp (Expires At): Unix timestamp when token expires
 * - iss (Issuer): Who issued this token (Vault's URL)
 * 
 * @param {Object} user - User object with OIDC claims
 */
function populateClaims(user) {
  // Email claim
  const emailEl = document.getElementById('claimEmail');
  if (emailEl) {
    emailEl.textContent = user.email || '(not provided)';
  }

  // Name claim
  const nameEl = document.getElementById('claimName');
  if (nameEl) {
    emailEl.textContent = user.name || '(not provided)';
  }

  // Subject claim (unique user identifier)
  const subEl = document.getElementById('claimSub');
  if (subEl) {
    subEl.textContent = user.sub || '(not provided)';
  }

  // Issued At claim (convert Unix timestamp to readable date)
  const iatEl = document.getElementById('claimIat');
  if (iatEl && user.iat) {
    const iatDate = new Date(user.iat * 1000);
    iatEl.textContent = iatDate.toLocaleString();
  }

  // Expires At claim (convert Unix timestamp to readable date)
  const expEl = document.getElementById('claimExp');
  if (expEl && user.exp) {
    const expDate = new Date(user.exp * 1000);
    expEl.textContent = expDate.toLocaleString();
  }

  // Issuer claim (who signed this token - should be Vault's URL)
  const issEl = document.getElementById('claimIss');
  if (issEl) {
    issEl.textContent = user.iss || '(not provided)';
  }
}

/**
 * Displays the raw JWT token for educational purposes
 * Shows the complete ID token returned by Vault
 * 
 * JWT Structure:
 * A JWT consists of three parts separated by dots (.):
 * 1. Header: Algorithm and token type (encoded as Base64Url)
 * 2. Payload: Claims about the user (encoded as Base64Url)
 * 3. Signature: Digital signature verifying the token wasn't tampered with
 * 
 * Format: HEADER.PAYLOAD.SIGNATURE
 * 
 * @param {string} token - The raw JWT token
 */
function displayJwt(token) {
  const jwtDisplay = document.getElementById('jwtDisplay');
  if (jwtDisplay) {
    jwtDisplay.textContent = token;
    jwtDisplay.style.wordBreak = 'break-word';
  }
}

/**
 * Parses a JWT token and returns its claims
 * This is a client-side demonstration only
 * In production, DO NOT trust claims on the client without server-side verification
 * 
 * @param {string} token - JWT token to decode
 * @returns {Object} Decoded JWT payload
 */
function decodeJWT(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format');
    }

    // Add padding if needed (Base64Url omits padding)
    const payload = parts[1];
    const padded = payload + '=='.substring(0, (4 - payload.length % 4) % 4);
    
    // Decode Base64Url to JSON
    const decoded = JSON.parse(atob(padded));
    return decoded;
  } catch (error) {
    console.error('Failed to decode JWT:', error);
    return null;
  }
}

/**
 * Resets authentication state when user logs out
 * Hides user info and shows login button again
 */
function resetAuthUI() {
  // Reset auth status bar
  const authStatusBar = document.getElementById('authStatusBar');
  if (authStatusBar) {
    authStatusBar.style.background = 'linear-gradient(135deg, #1f2937 0%, #111827 100%)';
  }

  const authStatus = document.getElementById('authStatus');
  if (authStatus) {
    authStatus.textContent = 'Not logged in';
    authStatus.style.color = '#e5e7eb';
  }

  const loginBtn = document.getElementById('loginBtn');
  if (loginBtn) {
    loginBtn.style.display = 'inline-block';
  }

  const userInfoContainer = document.getElementById('userInfoContainer');
  if (userInfoContainer) {
    userInfoContainer.classList.add('hidden');
  }

  const userClaimsBox = document.getElementById('userClaimsBox');
  if (userClaimsBox) {
    userClaimsBox.classList.add('hidden');
  }
}

// Initialize authentication status when page loads
document.addEventListener('DOMContentLoaded', initAuth);
