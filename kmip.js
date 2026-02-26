// KMIP Secret Engine Demo Module

function resetKmip() {
  // Clear KMIP result display
  const r = document.getElementById("kmipResult"); if (r) r.textContent = "";
}

function kmipCreateKey() {
  const name = document.getElementById("kmipKeyName")?.value.trim() || "kmip-key-01";
  const kid = "kmip-" + Math.random().toString(36).slice(2, 10);
  const el = document.getElementById("kmipResult");
  if (el) el.textContent = `Created KMIP key\nName: ${name}\nKeyId: ${kid}\nStatus: Active`;
}