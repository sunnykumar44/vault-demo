// KMIP Secret Engine Demo Module

function resetKmip() {
  // Clear KMIP result display
  const r = document.getElementById("kmipResult"); if (r) r.textContent = "";
}

function kmipCreateKey() {
  const name = document.getElementById("kmipKeyName")?.value.trim() || "kmip-key-01";
  const kid = "kmip-" + Math.random().toString(36).slice(2, 10) + "-vault";
  
  const out = `Key                  Value
---                  -----
id                   ${kid}
name                 ${name}
state                Active
cryptographic_usage  [Encrypt, Decrypt]`;

  const el = document.getElementById("kmipResult");
  if (el) el.textContent = out;

  const explainEl = document.getElementById("kmipExplainText");
  if (explainEl) {
      explainEl.innerHTML = `<strong>KMIP:</strong> Vault generated a managed cryptographic key internally and exposed it via the KMIP protocol. External clients (like VMware) can now use this ID to encrypt their data!`;
  }
}