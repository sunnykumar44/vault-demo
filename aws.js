function resetAws() {
  // Clear AWS-specific fields and results
  document.getElementById("awsRole").value = "readonly-role";
  const r = document.getElementById("awsResult"); if (r) r.textContent = "";
  
  // Hide and stop video
  const vidBox = document.getElementById("awsVideoBox");
  const vid = document.getElementById("awsVideo");
  if (vidBox) vidBox.classList.add("hidden");
  if (vid) { vid.pause(); vid.currentTime = 0; }
}

function awsGenerateCreds() {
  const role = document.getElementById("awsRole")?.value.trim() || "readonly-role";
  const access = "AKIA" + Math.random().toString(36).slice(2, 14).toUpperCase();
  const secret = Math.random().toString(36).repeat(2).slice(2, 34);
  const token = "IQoJb3JpZ2luX2Vj" + Math.random().toString(36).slice(2, 18);
  
  const out = `Key                Value
---                -----
access_key         ${access}
secret_key         ${secret}
security_token     ${token}
lease_duration     1h`;

  const el = document.getElementById("awsResult"); 
  if (el) el.textContent = out;

  const explainEl = document.getElementById("awsExplainText");
  if (explainEl) {
      explainEl.innerHTML = `<strong>AWS:</strong> Vault connected to AWS IAM and successfully generated dynamic, temporary credentials for the <code>${role}</code> role. Vault will automatically revoke these in 1 hour.`;
  }

  // Reveal and play video
  const vidBox = document.getElementById("awsVideoBox");
  const vid = document.getElementById("awsVideo");
  if (vidBox) vidBox.classList.remove("hidden");
  if (vid) vid.play();
}