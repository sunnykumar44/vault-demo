function resetKubernetes() {
  const roleEl = document.getElementById("k8sRole");
  const nsEl = document.getElementById("k8sNamespace");
  const resultEl = document.getElementById("k8sResult");
  const explainEl = document.getElementById("k8sExplainText");

  if (roleEl) roleEl.value = "demo-role";
  if (nsEl) nsEl.value = "default";
  if (resultEl) resultEl.textContent = "";
  if (explainEl) explainEl.textContent = "Generate dynamic Kubernetes credentials mapped to a Vault role.";
}

function k8sGenerateToken() {
  const role = document.getElementById("k8sRole")?.value.trim() || "demo-role";
  const ns = document.getElementById("k8sNamespace")?.value.trim() || "default";

  const jwt = [
    "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9",
    btoa(JSON.stringify({ sub: `system:serviceaccount:${ns}:${role}`, aud: "kubernetes", exp: Math.floor(Date.now()/1000)+3600 })).replace(/=/g, ""),
    Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
  ].join(".");

  const resultEl = document.getElementById("k8sResult");
  if (resultEl) {
    resultEl.textContent = `Role: ${role}\nNamespace: ${ns}\nServiceAccountToken: ${jwt}\nTTL: 1h`;
  }

  const explainEl = document.getElementById("k8sExplainText");
  if (explainEl) {
    explainEl.innerHTML = "<strong>Kubernetes:</strong> Vault issued a short-lived token bound to the selected role/namespace.";
  }
}
