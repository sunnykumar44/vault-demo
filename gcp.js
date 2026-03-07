// GCP Demo Module

function resetGcp() {
  // Clear GCP-specific fields and results
  document.getElementById("gcpSa").value = "demo-sa@project.iam.gserviceaccount.com";
  const r = document.getElementById("gcpResult"); if (r) r.textContent = "";
}

function gcpGenerateToken() {
  const sa = document.getElementById("gcpSa")?.value.trim() || "demo-sa@project.iam.gserviceaccount.com";
  const token = "ya29." + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  
  const out = `Key                     Value
---                     -----
token_abcdef_ttl        3599
lease_duration          1h
token                   ${token}
service_account_email   ${sa}`;

  const el = document.getElementById("gcpResult");
  if (el) el.textContent = out;

  const explainEl = document.getElementById("gcpExplainText");
  if (explainEl) {
      explainEl.innerHTML = `<strong>GCP:</strong> Vault communicated with Google Cloud IAM to mint a temporary OAuth2 access token for the requested service account.`;
  }
}