function resetDatabase() {
  const roleEl = document.getElementById("dbRole");
  if (roleEl) roleEl.value = "readonly-role";
  const resultEl = document.getElementById("dbResult");
  if (resultEl) resultEl.innerText = "";
  updateDbExplain("Select an action to see how Vault generates dynamic DB credentials.");

  // Hide and stop video
  const vidBox = document.getElementById("dbVideoBox");
  const vid = document.getElementById("dbVideo");
  if (vidBox) vidBox.classList.add("hidden");
  if (vid) { vid.pause(); vid.currentTime = 0; }
}

function updateDbExplain(text) {
  const explainEl = document.getElementById("dbExplainText");
  if (explainEl) explainEl.innerHTML = text;
}

function setDbResult(message) {
  const result = document.getElementById("dbResult");
  if (result) {
    result.style.color = "#000";
    result.style.whiteSpace = "pre-wrap";
    result.innerText = message;
  }
}

function dbGenerateCreds() {
  const role = document.getElementById("dbRole")?.value.trim();
  if (!role) {
    alert("Please provide a Database Role.");
    return;
  }

  // Simulate dynamic username and password
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const username = `v-${role}-${randomSuffix}`;
  const password = Array.from({length: 16}, () => String.fromCharCode(Math.floor(Math.random() * 62) + 48)).join('');

  setDbResult(`SUCCESS: Generated Dynamic Credentials\nRole: ${role}\nUsername: ${username}\nPassword: ${password}\nTTL: 1h (Vault will auto-revoke this user in 1 hour)`);
  
  updateDbExplain(`<strong>GENERATE CREDS:</strong> Vault connected to the database and executed a SQL statement to create a brand new user (<code>${username}</code>). Vault tracks this user and will automatically drop the user from the database when the TTL expires.`);

  // Reveal and play video
  const vidBox = document.getElementById("dbVideoBox");
  const vid = document.getElementById("dbVideo");
  if (vidBox) vidBox.classList.remove("hidden");
  if (vid) vid.play();
}
// Helper to reuse the result box styling
function setPkiResult(message) {
    const result = document.getElementById("dbResult");
    if (result) {
      result.style.color = "#000";
      result.innerText = message;
    }
  }
