let hasRootCa = false;

function resetPki() {
  hasRootCa = false;
  const cnEl = document.getElementById("pkiCn");
  if (cnEl) cnEl.value = "";
  const resultEl = document.getElementById("pkiResult");
  if (resultEl) resultEl.textContent = "";
  updatePkiExplain("Select an action to see how Vault manages PKI.");
}

function updatePkiExplain(text) {
  const explainEl = document.getElementById("pkiExplainText");
  if (explainEl) explainEl.innerHTML = text;
}

// unique renderer name to avoid collisions with other modules
function renderPkiOutput(message) {
  const result = document.getElementById("pkiResult");
  if (!result) return;
  result.style.display = "block";
  result.style.color = "#000";
  result.style.whiteSpace = "pre-wrap";
  result.textContent = message;
}

// keep backward compatibility if script.js calls setPkiResult
function setPkiResult(message) {
  renderPkiOutput(message);
}

function generateMockPEM(type, length) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let b64 = "";
  for (let i = 0; i < length; i++) b64 += chars.charAt(Math.floor(Math.random() * chars.length));
  b64 += "==";

  let pem = `-----BEGIN ${type}-----\n`;
  for (let i = 0; i < b64.length; i += 64) pem += b64.slice(i, i + 64) + "\n";
  pem += `-----END ${type}-----`;
  return pem;
}

function pkiGenerateRoot() {
  hasRootCa = true;
  const rootCert = generateMockPEM("CERTIFICATE", 420);

  renderPkiOutput(
`SUCCESS: Generated internal Root CA
Issuer: Vault Demo Root CA
TTL: 87600h (10 years)

${rootCert}`
  );

  updatePkiExplain("<strong>GENERATE ROOT CA:</strong> Vault generated a self-signed Root CA.");
}

function pkiIssueCert() {
  if (!hasRootCa) {
    alert("Please generate a Root CA first.");
    return;
  }

  const cn = document.getElementById("pkiCn")?.value.trim();
  if (!cn) {
    alert("Please provide a Common Name (CN).");
    return;
  }

  const serial = Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join(":");
  const cert = generateMockPEM("CERTIFICATE", 520);
  const key = generateMockPEM("RSA PRIVATE KEY", 720);

  renderPkiOutput(
`SUCCESS: Issued Certificate
CN: ${cn}
Serial: ${serial}
Expiration: 720h (30 days)

${cert}

${key}`
  );

  updatePkiExplain(`<strong>ISSUE CERTIFICATE:</strong> Vault generated a demo X.509 cert + private key for <code>${cn}</code>.`);
}
