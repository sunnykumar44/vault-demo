const kvStore = {};

function resetKv() {
  for (let key in kvStore) delete kvStore[key];
  clearKvInputs();
  const pathEl = document.getElementById("kvPath");
  if (pathEl) pathEl.value = "";
  const resultEl = document.getElementById("kvResult");
  if (resultEl) resultEl.innerText = "";
  updateExplain("Select an action to see how Vault processes it under the hood.");

  // NEW: Hide and stop video
  const vidBox = document.getElementById("kvVideoBox");
  const vid = document.getElementById("kvVideo");
  if (vidBox) vidBox.classList.add("hidden");
  if (vid) { vid.pause(); vid.currentTime = 0; }
}

function canUseKv(writeNeeded = false) {
  if (!currentToken) {
    alert("Generate token first.");
    return false;
  }
  if (!enteredToken || enteredToken.toLowerCase() !== currentToken.toLowerCase()) {
    alert("Token validation required. Enter correct token first.");
    return false;
  }
  if (selectedEngine !== "kv") {
    alert("Please select KV engine.");
    return false;
  }
  if (writeNeeded && currentPolicy !== "kv-admin") {
    alert("Permission denied: Put/Patch/Delete need kv-admin. Use KV Admin policy.");
    return false;
  }
  if (!writeNeeded && currentPolicy !== "kv-read" && currentPolicy !== "kv-admin") {
    alert("Permission denied for KV.");
    return false;
  }
  return true;
}

function getKvInputs() {
  const path = document.getElementById("kvPath")?.value.trim();
  const key = document.getElementById("kvKey")?.value.trim();
  const value = document.getElementById("kvValue")?.value ?? "";
  return { path, key, value };
}

function clearKvInputs() {
  const keyEl = document.getElementById("kvKey");
  const valEl = document.getElementById("kvValue");
  if (keyEl) keyEl.value = "";
  if (valEl) valEl.value = "";
}

function updateExplain(text) {
  const explainEl = document.getElementById("kvExplainText");
  if (explainEl) explainEl.innerHTML = text;
}

function setKvResult(message) {
  const result = document.getElementById("kvResult");
  if (result) {
    result.style.color = "#000";
    result.innerText = message;
  }
}

function playKvVideo() {
  const vidBox = document.getElementById("kvVideoBox");
  const vid = document.getElementById("kvVideo");
  if (vidBox) vidBox.classList.remove("hidden");
  if (vid) vid.play();
}

function kvPut() {
  if (!canUseKv(true)) return;
  const { path, key, value } = getKvInputs();
  if (!path || !key) {
    alert("Path and Key are required for Put.");
    return;
  }

  if (!kvStore[path]) kvStore[path] = { versions: [], currentVersion: 0 };

  const latestData = kvStore[path].currentVersion > 0
      ? { ...kvStore[path].versions[kvStore[path].currentVersion - 1].data }
      : {};

  latestData[key] = value;

  const version = kvStore[path].currentVersion + 1;
  kvStore[path].versions.push({ version, data: latestData, deleted: false, destroyed: false });
  kvStore[path].currentVersion = version;

  setKvResult(`PUT success → secret/data/${path} | version=${version} | data=${JSON.stringify(latestData)}`);
  clearKvInputs();
  updateExplain(`<strong>PUT:</strong> Created a new version (v${version}) of the secret. If previous data existed, it was carried over and updated with the new key/value.`);
  playKvVideo();
}

function kvPatch() {
  if (!canUseKv(true)) return;
  const { path, key, value } = getKvInputs();
  if (!path || !key) {
    alert("Path and Key are required for Patch.");
    return;
  }
  if (!kvStore[path] || kvStore[path].currentVersion === 0) {
    alert("No existing secret. Use Put first.");
    return;
  }

  const latest = kvStore[path].versions[kvStore[path].currentVersion - 1];
  if (latest.destroyed) {
    alert("Latest version is destroyed. Use Put to create new data.");
    return;
  }

  const patched = { ...latest.data, [key]: value };
  const version = kvStore[path].currentVersion + 1;
  kvStore[path].versions.push({ version, data: patched, deleted: false, destroyed: false });
  kvStore[path].currentVersion = version;

  setKvResult(`PATCH success → secret/data/${path} | version=${version} | data=${JSON.stringify(patched)}`);
  clearKvInputs();
  updateExplain(`<strong>PATCH:</strong> Updated specific keys in the secret and generated a new version (v${version}) without overwriting unmentioned keys.`);
  playKvVideo();
}

function kvRead() {
  if (!canUseKv(false)) return; 
  const { path } = getKvInputs();
  if (!path) {
    alert("Path is required for Read.");
    return;
  }
  if (!kvStore[path] || kvStore[path].currentVersion === 0) {
    setKvResult(`404: No secret found at secret/data/${path}`);
    return;
  }

  const latest = kvStore[path].versions[kvStore[path].currentVersion - 1];
  if (latest.destroyed) {
    setKvResult(`Read failed: Version ${latest.version} is permanently destroyed.`);
    return;
  }
  if (latest.deleted) {
    setKvResult(`Read failed: Version ${latest.version} is soft-deleted (can be undeleted).`);
    return;
  }

  setKvResult(`READ success → secret/data/${path} | version=${latest.version} | data=${JSON.stringify(latest.data)}`);
  updateExplain(`<strong>READ:</strong> Fetched the latest active version (v${latest.version}) of the secret. Vault checks your policy to ensure you have 'read' access to this path.`);
  playKvVideo();
}

function kvSoftDelete() {
  if (!canUseKv(true)) return; 
  const { path } = getKvInputs();
  if (!path || !kvStore[path] || kvStore[path].currentVersion === 0) {
    alert("Valid Path with existing secret required.");
    return;
  }
  const latest = kvStore[path].versions[kvStore[path].currentVersion - 1];
  latest.deleted = true;
  setKvResult(`SOFT DELETE success → secret/data/${path} | version=${latest.version} marked as deleted.`);
  updateExplain(`<strong>SOFT DELETE:</strong> Marked version ${latest.version} as deleted. The data is hidden from normal reads but still exists and can be recovered using Undelete.`);
  playKvVideo();
}

function kvUndelete() {
  if (!canUseKv(true)) return;
  const { path } = getKvInputs();
  if (!path || !kvStore[path] || kvStore[path].currentVersion === 0) {
    alert("Valid Path with existing secret required.");
    return;
  }
  const latest = kvStore[path].versions[kvStore[path].currentVersion - 1];
  if (latest.destroyed) {
    alert("Cannot undelete a destroyed version.");
    return;
  }
  latest.deleted = false;
  setKvResult(`UNDELETE success → secret/data/${path} | version=${latest.version} restored.`);
  updateExplain(`<strong>UNDELETE:</strong> Restored the soft-deleted version ${latest.version}. It is now accessible again for read operations.`);
  playKvVideo();
}

function kvDestroy() {
  if (!canUseKv(true)) return;
  const { path } = getKvInputs();
  if (!path || !kvStore[path] || kvStore[path].currentVersion === 0) {
    alert("Valid Path with existing secret required.");
    return;
  }
  const latest = kvStore[path].versions[kvStore[path].currentVersion - 1];
  latest.destroyed = true;
  latest.data = {}; 
  setKvResult(`DESTROY success → secret/data/${path} | version=${latest.version} permanently removed.`);
  updateExplain(`<strong>DESTROY:</strong> Permanently wiped the data for version ${latest.version}. This action is irreversible and the data cannot be recovered.`);
  playKvVideo();
}
