let currentToken = null;
let currentPolicy = null;
let selectedEngine = null;
let selectedEngineLabel = null;
let enteredToken = null;

function forceEngineTextBlack() {
  const labelEl = document.getElementById("selectedEngineLabel");
  if (labelEl) labelEl.style.color = "#000";

  const cards = document.querySelectorAll(".engine-card");
  cards.forEach((card) => {
    card.style.color = "#000";
    card.style.fontWeight = "700";
  });
}

function resetDemo() {
  currentToken = null;
  currentPolicy = null;
  selectedEngine = null;
  selectedEngineLabel = null;
  enteredToken = null;

  // Call the reset functions from the categorized files
  if (typeof resetKv === 'function') resetKv();
  if (typeof resetTransit === 'function') resetTransit();
  if (typeof resetPki === 'function') resetPki();
  if (typeof resetDatabase === 'function') resetDatabase();
  if (typeof resetAws === "function") resetAws();
  if (typeof resetGcp === "function") resetGcp();
  if (typeof resetTransform === "function") resetTransform();
  if (typeof resetKmip === "function") resetKmip();
  if (typeof resetKubernetes === "function") resetKubernetes();

  // Reset UI
  document.getElementById("selectedEngineLabel").textContent = "None";
  document.getElementById("tokenBox").classList.add("hidden");
  document.getElementById("tokenDisplay").classList.add("hidden");
  
  hideAllWorkspaces();
  
  const tokenInput = document.getElementById("enteredTokenInput");
  if (tokenInput) tokenInput.value = "";
  
  alert("Demo reset successfully.");
}

// Helper to hide all workspaces
function hideAllWorkspaces() {
  const workspaces = [
    "kvWorkspace","transitWorkspace","pkiWorkspace","databaseWorkspace",
    "awsWorkspace","gcpWorkspace","transformWorkspace","kmipWorkspace",
    "kubernetesWorkspace"
  ];
  workspaces.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add("hidden");
  });
}

function selectEngine(engine) {
  selectedEngine = engine;
  selectedEngineLabel = engine.toUpperCase();

  const labelEl = document.getElementById("selectedEngineLabel");
  if (labelEl) {
    labelEl.textContent = selectedEngineLabel;
    labelEl.style.color = "#000";
    labelEl.style.fontWeight = "700";
  }

  const tokenBox = document.getElementById("tokenBox");
  if (tokenBox) tokenBox.classList.remove("hidden");

  const tokenDisplay = document.getElementById("tokenDisplay");
  if (tokenDisplay) tokenDisplay.classList.add("hidden");

  hideAllWorkspaces();
  forceEngineTextBlack();
}

function generateToken() {
  if (!selectedEngine) {
    alert("Please select a Secret Engine first.");
    return;
  }

  hideAllWorkspaces();
  enteredToken = null; 

  // Clear inputs using categorized functions
  if (typeof resetKv === 'function') resetKv();
  if (typeof resetTransit === 'function') resetTransit();
  if (typeof resetPki === 'function') resetPki();
  if (typeof resetDatabase === 'function') resetDatabase();
  if (typeof resetAws === "function") resetAws();
  if (typeof resetGcp === "function") resetGcp();
  if (typeof resetTransform === "function") resetTransform();
  if (typeof resetKmip === "function") resetKmip();

  const policy = document.getElementById("policySelect").value;
  currentPolicy = policy;
  currentToken = "token-" + Math.random().toString(36).substring(2, 10);

  const selectedTtl = document.getElementById("ttlSelect").value;

  document.getElementById("tokenValue").innerText = currentToken;
  document.getElementById("policyValue").innerText = `${currentPolicy} | Engine: ${selectedEngineLabel}`;
  
  const ttlEl = document.getElementById("tokenTtlValue");
  if (ttlEl) {
    ttlEl.innerText = `${selectedTtl} minutes`;
    ttlEl.style.color = "#000";
  }

  document.getElementById("policyValue").style.color = "#000";
  document.getElementById("tokenValue").style.color = "#000";
  document.getElementById("tokenDisplay").classList.remove("hidden");

  const tokenInput = document.getElementById("enteredTokenInput");
  if (tokenInput) tokenInput.value = "";
}

function enterVault() {
  if (!currentToken || !currentPolicy || !selectedEngine) {
    alert("Please select engine and generate token first.");
    return;
  }

  const tokenInput = document.getElementById("enteredTokenInput");
  const typedToken = tokenInput ? tokenInput.value.trim() : "";

  if (!typedToken) {
    alert("Please paste the token in the input box first.");
    return;
  }
  
  if (typedToken.toLowerCase() !== currentToken.toLowerCase()) {
    alert("Invalid token. Please paste the exact generated token.");
    return;
  }

  enteredToken = typedToken; 
  hideAllWorkspaces();

  if (selectedEngine === "kv") {
    if (currentPolicy !== "kv-read" && currentPolicy !== "kv-admin") {
      alert("Permission denied: policy does not allow KV access.");
      return;
    }
    document.getElementById("kvWorkspace").classList.remove("hidden");
    if (typeof setKvResult === 'function') setKvResult(`Entered KV with token ${currentToken} and policy ${currentPolicy}.`);
  
  } else if (selectedEngine === "transit") {
    if (currentPolicy !== "transit-encrypt" && currentPolicy !== "kv-admin") {
      alert("Permission denied: policy does not allow Transit access.");
      return;
    }
    document.getElementById("transitWorkspace").classList.remove("hidden");
    if (typeof setTransitResult === 'function') setTransitResult(`Entered TRANSIT with token ${currentToken} and policy ${currentPolicy}.`);
  
  } else if (selectedEngine === "pki") {
    if (currentPolicy !== "pki-admin" && currentPolicy !== "kv-admin") {
      alert("Permission denied: policy does not allow PKI access.");
      return;
    }
    document.getElementById("pkiWorkspace").classList.remove("hidden");
    if (typeof setPkiResult === 'function') setPkiResult(`Entered PKI with token ${currentToken} and policy ${currentPolicy}.`);
  
  } else if (selectedEngine === "database") {
    if (currentPolicy !== "db-admin" && currentPolicy !== "kv-admin") {
      alert("Permission denied: policy does not allow Database access.");
      return;
    }
    document.getElementById("databaseWorkspace").classList.remove("hidden");
    if (typeof setDbResult === 'function') setDbResult(`Entered DATABASE with token ${currentToken} and policy ${currentPolicy}.`);
  
  } else if (selectedEngine === "aws") {
    if (currentPolicy !== "aws-admin" && currentPolicy !== "kv-admin") return alert("Permission denied for AWS.");
    document.getElementById("awsWorkspace").classList.remove("hidden");
    return;
  } else if (selectedEngine === "gcp") {
    if (currentPolicy !== "gcp-admin" && currentPolicy !== "kv-admin") return alert("Permission denied for GCP.");
    document.getElementById("gcpWorkspace").classList.remove("hidden");
    return;
  } else if (selectedEngine === "transform") {
    if (currentPolicy !== "transform-admin" && currentPolicy !== "kv-admin") return alert("Permission denied for Transform.");
    document.getElementById("transformWorkspace").classList.remove("hidden");
    return;
  } else if (selectedEngine === "kmip") {
    if (currentPolicy !== "kmip-admin" && currentPolicy !== "kv-admin") return alert("Permission denied for KMIP.");
    document.getElementById("kmipWorkspace").classList.remove("hidden");
    return;
  } else if (selectedEngine === "kubernetes") {
    if (currentPolicy !== "k8s-admin" && currentPolicy !== "kv-admin") {
      alert("Permission denied for Kubernetes.");
      return;
    }
    document.getElementById("kubernetesWorkspace").classList.remove("hidden");
    return;
  } else {
    alert(`The ${selectedEngineLabel} engine will be added in the next phase.`);
  }
}

window.addEventListener("DOMContentLoaded", forceEngineTextBlack);