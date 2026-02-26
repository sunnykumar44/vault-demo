function resetAws() {
  // Clear AWS-specific fields and results
  document.getElementById("awsRole").value = "readonly-role";
  const r = document.getElementById("awsResult"); if (r) r.textContent = "";
}

function awsGenerateCreds() {
  const role = document.getElementById("awsRole")?.value.trim() || "readonly-role";
  const access = "AKIA" + Math.random().toString(36).slice(2, 14).toUpperCase();
  const secret = Math.random().toString(36).repeat(2).slice(2, 34);
  const token = "IQoJb3JpZ2luX2Vj" + Math.random().toString(36).slice(2, 18);
  const out = `Role: ${role}\nAccessKeyId: ${access}\nSecretAccessKey: ${secret}\nSessionToken: ${token}\nTTL: 1h`;
  const el = document.getElementById("awsResult"); if (el) el.textContent = out;
}