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
  if (typeof resetExtra === 'function') resetExtra(); // Added for the new files

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
    "kvWorkspace", "transitWorkspace", "pkiWorkspace", "databaseWorkspace",
    "awsWorkspace", "gcpWorkspace", "transformWorkspace", "kmipWorkspace",
    "kubernetesWorkspace", "sshWorkspace", "azureWorkspace", "adWorkspace", "totpWorkspace",
    "ldapWorkspace", "rabbitmqWorkspace", "consulWorkspace", "nomadWorkspace"
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

  // NEW: Educational Intros for every engine
  const engineIntros = {
    kv: { id: "kvExplainText", text: "<strong>What it does:</strong> Stores static secrets (key-value) in a secure, versioned file system.<br><br><strong>Use Case:</strong> Replacing hardcoded passwords or API keys in source code." },
    transit: { id: "transitExplainText", text: "<strong>What it does:</strong> Vault acts as Cryptography-as-a-Service, encrypting data without keeping it.<br><br><strong>Use Case:</strong> Encrypting user PII/Credit Cards before saving them to a database." },
    pki: { id: "pkiExplainText", text: "<strong>What it does:</strong> Acts as a Certificate Authority to generate dynamic X.509 certs on the fly.<br><br><strong>Use Case:</strong> Establishing Zero Trust mutual TLS (mTLS) between microservices." },
    database: { id: "dbExplainText", text: "<strong>What it does:</strong> Generates temporary, time-limited database credentials.<br><br><strong>Use Case:</strong> Giving an app or developer read-only DB access that auto-expires in 1 hour." },
    transform: { id: "transformExplainText", text: "<strong>What it does:</strong> Performs Format-Preserving Encryption (FPE) and Masking.<br><br><strong>Use Case:</strong> Obfuscating credit card numbers in logs while keeping the system format valid." },
    aws: { id: "awsExplainText", text: "<strong>What it does:</strong> Dynamically generates short-lived AWS IAM credentials.<br><br><strong>Use Case:</strong> CI/CD pipelines requesting AWS access only for the duration of a build." },
    gcp: { id: "gcpExplainText", text: "<strong>What it does:</strong> Creates GCP OAuth2 access tokens or Service Account keys.<br><br><strong>Use Case:</strong> Automated scripts deploying infrastructure into Google Cloud." },
    azure: { id: "azureExplainText", text: "<strong>What it does:</strong> Generates Azure AD Service Principal credentials.<br><br><strong>Use Case:</strong> Temporary programmatic access to Azure Resource Manager." },
    ssh: { id: "sshExplainText", text: "<strong>What it does:</strong> Issues signed SSH certificates for secure authentication.<br><br><strong>Use Case:</strong> Passwordless login to Linux servers without managing static SSH keys." },
    ad: { id: "adExplainText", text: "<strong>What it does:</strong> Manages Microsoft Active Directory passwords dynamically.<br><br><strong>Use Case:</strong> Auto-rotating AD service account passwords regularly." },
    ldap: { id: "ldapExplainText", text: "<strong>What it does:</strong> Generates dynamic LDAP credentials.<br><br><strong>Use Case:</strong> Temporary LDAP access for legacy system integrations." },
    totp: { id: "totpExplainText", text: "<strong>What it does:</strong> Generates Time-Based One-Time Passwords.<br><br><strong>Use Case:</strong> Vault acts as an authenticator app (like Google Auth) for programmatic 2FA." },
    rabbitmq: { id: "rmqExplainText", text: "<strong>What it does:</strong> Generates dynamic RabbitMQ users with specific vhost permissions.<br><br><strong>Use Case:</strong> Microservices needing isolated, temporary message queue access." },
    consul: { id: "consulExplainText", text: "<strong>What it does:</strong> Generates short-lived Consul ACL tokens.<br><br><strong>Use Case:</strong> Automated secure microservice registration in HashiCorp Consul." },
    nomad: { id: "nomadExplainText", text: "<strong>What it does:</strong> Generates temporary Nomad ACL tokens.<br><br><strong>Use Case:</strong> CI/CD pipelines deploying jobs securely to a HashiCorp Nomad cluster." },
    kubernetes: { id: "k8sExplainText", text: "<strong>What it does:</strong> Issues temporary Kubernetes Service Account tokens.<br><br><strong>Use Case:</strong> Cross-cluster authentication and ephemeral pod-to-pod access." },
    kmip: { id: "kmipExplainText", text: "<strong>What it does:</strong> Vault acts as a KMIP server to manage external encryption keys.<br><br><strong>Use Case:</strong> VMware vSphere or NetApp storage volume encryption." }
  };

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
    if (currentPolicy !== "k8s-admin" && currentPolicy !== "kv-admin") return alert("Permission denied.");
    document.getElementById("kubernetesWorkspace").classList.remove("hidden");
    
  } else if (selectedEngine === "ssh") {
    if (currentPolicy !== "ssh-admin" && currentPolicy !== "kv-admin") return alert("Permission denied.");
    document.getElementById("sshWorkspace").classList.remove("hidden");

  } else if (selectedEngine === "azure") {
    if (currentPolicy !== "azure-admin" && currentPolicy !== "kv-admin") return alert("Permission denied.");
    document.getElementById("azureWorkspace").classList.remove("hidden");

  } else if (selectedEngine === "ad") {
    if (currentPolicy !== "ad-admin" && currentPolicy !== "kv-admin") return alert("Permission denied.");
    document.getElementById("adWorkspace").classList.remove("hidden");

  } else if (selectedEngine === "totp") {
    if (currentPolicy !== "totp-admin" && currentPolicy !== "kv-admin") return alert("Permission denied.");
    document.getElementById("totpWorkspace").classList.remove("hidden");

  } else if (selectedEngine === "ldap") {
    if (currentPolicy !== "ldap-admin" && currentPolicy !== "kv-admin") return alert("Permission denied.");
    document.getElementById("ldapWorkspace").classList.remove("hidden");

  } else if (selectedEngine === "rabbitmq") {
    if (currentPolicy !== "rabbitmq-admin" && currentPolicy !== "kv-admin") return alert("Permission denied.");
    document.getElementById("rabbitmqWorkspace").classList.remove("hidden");

  } else if (selectedEngine === "consul") {
    if (currentPolicy !== "consul-admin" && currentPolicy !== "kv-admin") return alert("Permission denied.");
    document.getElementById("consulWorkspace").classList.remove("hidden");

  } else if (selectedEngine === "nomad") {
    if (currentPolicy !== "nomad-admin" && currentPolicy !== "kv-admin") return alert("Permission denied.");
    document.getElementById("nomadWorkspace").classList.remove("hidden");

  } else if (selectedEngine === "gcp-kms") {
    alert("GCP KMS utilizes the same workflow as the Transit interface behind the scenes. This specific view will be available in V2.");
    return;
  } else {
    alert(`The ${selectedEngineLabel} engine workflow is currently a placeholder.`);
  }

  // NEW: Inject the educational text into the sidebar after the workspace opens
  const intro = engineIntros[selectedEngine];
  if (intro) {
      const explainEl = document.getElementById(intro.id);
      if (explainEl) {
          explainEl.innerHTML = intro.text;
      }
  }
}

window.addEventListener("DOMContentLoaded", forceEngineTextBlack);