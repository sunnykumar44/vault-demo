// GCP Demo Module

function resetGcp() {
  // Clear GCP-specific fields and results
  document.getElementById("gcpSa").value = "demo-sa@project.iam.gserviceaccount.com";
  document.getElementById("gcpResult").textContent = "";
}

function gcpGenerateToken() {
  const sa = document.getElementById("gcpSa")?.value.trim() || "demo-sa@project.iam.gserviceaccount.com";
  const token = "ya29." + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  const el = document.getElementById("gcpResult");
  if (el) el.textContent = `ServiceAccount: ${sa}\nAccessToken: ${token}\nTTL: 3600s`;
}