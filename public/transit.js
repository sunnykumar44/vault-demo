const transitStore = new Set();

function resetTransit() {
  transitStore.clear();
  clearTransitInputs();
  const tKeyEl = document.getElementById("transitKey");
  if (tKeyEl) tKeyEl.value = "";
  const tResultEl = document.getElementById("transitResult");
  if (tResultEl) tResultEl.innerText = "";
  updateTransitExplain("Select an action to see how Vault encrypts data in transit.");

  // Hide and stop video
  const vidBox = document.getElementById("transitVideoBox");
  const vid = document.getElementById("transitVideo");
  if (vidBox) vidBox.classList.add("hidden");
  if (vid) { vid.pause(); vid.currentTime = 0; }
}

function clearTransitInputs() {
  const ptEl = document.getElementById("transitPlaintext");
  const ctEl = document.getElementById("transitCiphertext");
  if (ptEl) ptEl.value = "";
  if (ctEl) ctEl.value = "";
}

function updateTransitExplain(text) {
  const explainEl = document.getElementById("transitExplainText");
  if (explainEl) explainEl.innerHTML = text;
}

function setTransitResult(message) {
  const result = document.getElementById("transitResult");
  if (result) {
    result.style.color = "#000";
    result.innerText = message;
  }
}

function transitCreateKey() {
  const keyName = document.getElementById("transitKey")?.value.trim();
  if (!keyName) {
    alert("Please provide an Encryption Key Name.");
    return;
  }
  transitStore.add(keyName);
  setTransitResult(`SUCCESS: Created encryption key '${keyName}'.`);
  updateTransitExplain(`<strong>CREATE KEY:</strong> Vault generated a new cryptographic key named '${keyName}'. This key stays securely inside Vault and is never exported.`);
}

function transitEncrypt() {
  const keyName = document.getElementById("transitKey")?.value.trim();
  const plaintext = document.getElementById("transitPlaintext")?.value.trim();
  
  if (!keyName || !plaintext) {
    alert("Key Name and Plaintext are required to encrypt.");
    return;
  }
  if (!transitStore.has(keyName)) {
    alert(`Key '${keyName}' does not exist. Create it first.`);
    return;
  }

  const encoded = btoa(plaintext);
  const ciphertext = `vault:v1:${encoded}`;
  
  document.getElementById("transitCiphertext").value = ciphertext;
  document.getElementById("transitPlaintext").value = ""; 
  
  setTransitResult(`ENCRYPT SUCCESS → Ciphertext generated using key '${keyName}'.`);
  updateTransitExplain(`<strong>ENCRYPT:</strong> You sent plaintext to Vault. Vault encrypted it using '${keyName}' and returned the ciphertext (<code>${ciphertext}</code>). Vault did <strong>not</strong> save your data.`);

  // Reveal and play video
  const vidBox = document.getElementById("transitVideoBox");
  const vid = document.getElementById("transitVideo");
  if (vidBox) vidBox.classList.remove("hidden");
  if (vid) vid.play();
}

function transitDecrypt() {
  const keyName = document.getElementById("transitKey")?.value.trim();
  const ciphertext = document.getElementById("transitCiphertext")?.value.trim();
  
  if (!keyName || !ciphertext) {
    alert("Key Name and Ciphertext are required to decrypt.");
    return;
  }
  if (!transitStore.has(keyName)) {
    alert(`Key '${keyName}' does not exist.`);
    return;
  }
  if (!ciphertext.startsWith("vault:v1:")) {
    alert("Invalid ciphertext format. Must start with 'vault:v1:'");
    return;
  }

  try {
    const encoded = ciphertext.replace("vault:v1:", "");
    const plaintext = atob(encoded);
    
    document.getElementById("transitPlaintext").value = plaintext;
    document.getElementById("transitCiphertext").value = ""; 
    
    setTransitResult(`DECRYPT SUCCESS → Plaintext recovered using key '${keyName}'.`);
    updateTransitExplain(`<strong>DECRYPT:</strong> You sent the ciphertext back to Vault. Vault verified the key, decrypted the data, and returned your original plaintext.`);
    
    // Reveal and play video
    const vidBox = document.getElementById("transitVideoBox");
    const vid = document.getElementById("transitVideo");
    if (vidBox) vidBox.classList.remove("hidden");
    if (vid) vid.play();
  } catch (e) {
    alert("Failed to decrypt. Ciphertext is corrupted.");
  }
}
