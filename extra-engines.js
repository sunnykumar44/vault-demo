function resetExtra() {
    ["sshResult", "azureResult", "adResult", "totpResult", 
     "ldapResult", "rmqResult", "consulResult", "nomadResult"].forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.textContent = ""; el.style.display = "none"; }
    });

    // Hide TOTP video
    const vidBox = document.getElementById("totpVideoBox");
    const vid = document.getElementById("totpVideo");
    if (vidBox) vidBox.classList.add("hidden");
    if (vid) { vid.pause(); vid.currentTime = 0; }
}

function showExtraResult(id, text) {
    const el = document.getElementById(id);
    if (el) {
        el.style.display = "block";
        el.style.whiteSpace = "pre-wrap";
        el.textContent = text;
    }
}

// Helper to generate authentic-looking UUIDs (just like real Vault tokens/IDs)
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// 1. SSH Engine (Authentic Certificate Signing Simulation)
function sshSignKey() {
    const user = document.getElementById("sshUser")?.value || "ubuntu";
    
    // Simulate real SSH workflow output
    const output = `[Step 1] Client generates local SSH Keypair
  => ~/.ssh/id_rsa (Private Key - Kept Secret)
  => ~/.ssh/id_rsa.pub (Public Key)

[Step 2] Sending Public Key to Vault for Role: '${user}'...

[Step 3] SUCCESS: Vault signed the public key!
Signed Certificate:
ssh-rsa-cert-v01@openssh.com AAAAHHNzaC1yc2EtY2VydC12MDFAb3Bl...[truncated]... vault-cert-authority

Key Type: ssh-rsa-cert-v01@openssh.com
Valid Principals: ${user}
Valid For: 5m0s (auto-expires)`;

    showExtraResult("sshResult", output);
    document.getElementById("sshExplainText").innerHTML = `<strong>SSH:</strong> Vault does <strong>not</strong> manage your private key. You generate the key locally, Vault mathematically signs your <strong>Public Key</strong>, and you use the resulting certificate to log in.`;
}

// 2. Azure Engine
function azureGenCreds() {
    const role = document.getElementById("azureRole")?.value || "contributor";
    const client_id = generateUUID();
    const client_secret = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15) + "-Azure-SEC!";
    
    showExtraResult("azureResult", `SUCCESS: Generated Azure SP Credentials\nRole: ${role}\nTenant ID: ${generateUUID()}\nClient ID: ${client_id}\nClient Secret: ${client_secret}\nTTL: 1h`);
    document.getElementById("azureExplainText").innerHTML = `<strong>AZURE:</strong> Vault reached out to Azure Entra ID (Active Directory) via API and created a temporary Service Principal mapped to the <code>${role}</code> role.`;
}

// 3. Active Directory Engine
function adGenCreds() {
    const role = document.getElementById("adRole")?.value || "domain-admins";
    const username = `vault-ad-${Math.floor(Math.random() * 1000)}`;
    const password = "VlT#" + Math.random().toString(36).substring(2, 12).toUpperCase() + "!";
    
    showExtraResult("adResult", `SUCCESS: Generated AD Credentials\nRole: ${role}\nUsername: ${username}@corp.local\nPassword: ${password}\nTTL: 4h`);
    document.getElementById("adExplainText").innerHTML = `<strong>AD:</strong> Vault reached into Active Directory and dynamically reset/generated credentials for access.`;
}

// 4. TOTP Engine
function totpGenerate() {
    const name = document.getElementById("totpName")?.value || "my-app";
    const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit code
    
    showExtraResult("totpResult", `SUCCESS: Generated Authenticator Code\nKey Name: ${name}\nCode: ${code}\nValid For: 30s`);
    document.getElementById("totpExplainText").innerHTML = `<strong>TOTP:</strong> Vault acts securely as an authenticator app (like Google Authenticator), generating a strict Time-Based One-Time Password for programmatic multi-factor authentication.`;

    // Reveal and play video
    const vidBox = document.getElementById("totpVideoBox");
    const vid = document.getElementById("totpVideo");
    if (vidBox) vidBox.classList.remove("hidden");
    if (vid) vid.play();
}

// 5. LDAP Engine
function ldapGenCreds() {
    const username = `v-ldap-${Math.floor(Math.random() * 9999)}`;
    const password = Math.random().toString(36).slice(2) + "A1!";
    showExtraResult("ldapResult", `SUCCESS: Generated LDAP Credentials\nDN: cn=${username},ou=users,dc=corp,dc=local\nPassword: ${password}\nTTL: 1h`);
    document.getElementById("ldapExplainText").innerHTML = `<strong>LDAP:</strong> Vault generated a temporary LDAP user object dynamically.`;
}

// 6. RabbitMQ Engine
function rmqGenCreds() {
    const username = `v-rmq-${Math.floor(Math.random() * 9999)}`;
    const password = Math.random().toString(36).slice(2, 14);
    showExtraResult("rmqResult", `SUCCESS: Generated RabbitMQ User\nUsername: ${username}\nPassword: ${password}\nVHost Permissions: ".*" (read/write/configure)\nTTL: 30m`);
    document.getElementById("rmqExplainText").innerHTML = `<strong>RabbitMQ:</strong> Vault directly created a temporary user in the RabbitMQ broker with dynamically assigned message queue permissions.`;
}

// 7. Consul Engine
function consulGenToken() {
    const token = generateUUID();
    showExtraResult("consulResult", `SUCCESS: Generated Consul ACL Token\nToken ID: ${token}\nPolicies: ["developer-read"]\nTTL: 4h`);
    document.getElementById("consulExplainText").innerHTML = `<strong>Consul:</strong> Vault contacted the HashiCorp Consul cluster and generated a short-lived ACL token for service discovery operations.`;
}

// 8. Nomad Engine
function nomadGenToken() {
    const token = generateUUID();
    showExtraResult("nomadResult", `SUCCESS: Generated Nomad ACL Token\nSecret ID: ${token}\nPolicies: ["submit-job", "read-logs"]\nTTL: 2h`);
    document.getElementById("nomadExplainText").innerHTML = `<strong>Nomad:</strong> Vault contacted the HashiCorp Nomad cluster and minted a short-lived execution token to deploy workloads.`;
}
