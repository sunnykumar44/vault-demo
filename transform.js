function resetTransform() {
  const inputEl = document.getElementById("transformInput");
  const alphabetEl = document.getElementById("transformAlphabet");
  const templateEl = document.getElementById("transformTemplate");
  const resultEl = document.getElementById("transformResult");
  const explainEl = document.getElementById("transformExplainText");

  if (inputEl) inputEl.value = "";
  if (alphabetEl) alphabetEl.value = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  if (templateEl) templateEl.value = "AAA-####-AA##";
  if (resultEl) {
    resultEl.textContent = "";
    resultEl.style.display = "none";
  }
  if (explainEl) explainEl.innerHTML = "Select an action to see how Vault transforms data.";

  // Hide and stop video
  const vidBox = document.getElementById("transformVideoBox");
  const vid = document.getElementById("transformVideo");
  if (vidBox) vidBox.classList.add("hidden");
  if (vid) { vid.pause(); vid.currentTime = 0; }
}

function setTransformResult(text) {
  const resultEl = document.getElementById("transformResult");
  if (!resultEl) return;
  resultEl.style.display = "block";
  resultEl.style.whiteSpace = "pre-wrap";
  resultEl.textContent = text;
}

function setTransformExplain(html) {
  const explainEl = document.getElementById("transformExplainText");
  if (explainEl) explainEl.innerHTML = html;
}

function transformFPE() {
  const input = document.getElementById("transformInput")?.value?.trim() || "";
  const alphabet = document.getElementById("transformAlphabet")?.value || "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

  if (!input) {
    alert("Please enter input data (e.g., ABC12345).");
    return;
  }

  let fpe = "";
  for (let char of input) {
    // Strictly check if the input character exists in the defined alphabet
    if (alphabet.includes(char)) {
        // Replace with a random character strictly from the alphabet
        const randomChar = alphabet.charAt(Math.floor(Math.random() * alphabet.length));
        fpe += randomChar;
    } else {
        // Leave unsupported characters (like dashes or spaces) alone
        fpe += char;
    }
  }

  setTransformResult(`Input:    ${input}\nAlphabet: ${alphabet}\nOutput:   ${fpe}\nMode:     Format-Preserving Encryption (FPE)`);
  setTransformExplain("<strong>FPE:</strong> FPE encrypts the input while preserving its length and restricting the output characters to the defined alphabet. The result looks different but maintains structural consistency.");

  // Reveal and play video
  const vidBox = document.getElementById("transformVideoBox");
  const vid = document.getElementById("transformVideo");
  if (vidBox) vidBox.classList.remove("hidden");
  if (vid) vid.play();
}

function transformTemplateMask() {
  const template = document.getElementById("transformTemplate")?.value?.trim() || "AAA-####-AA##";

  let masked = "";
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const digits = "0123456789";

  for (let char of template) {
    if (char === 'A') {
        masked += letters.charAt(Math.floor(Math.random() * letters.length));
    } else if (char === '#') {
        masked += digits.charAt(Math.floor(Math.random() * digits.length));
    } else {
        masked += char; // Preserve dashes, spaces, etc.
    }
  }

  setTransformResult(`Template: ${template}\nOutput:   ${masked}\nMode:     Template Masking`);
  setTransformExplain("<strong>TEMPLATE MASKING:</strong> Vault generated a masked value based strictly on your template. <code>A</code> became a random letter, <code>#</code> became a random number, and symbols were preserved.");

  // Reveal and play video
  const vidBox = document.getElementById("transformVideoBox");
  const vid = document.getElementById("transformVideo");
  if (vidBox) vidBox.classList.remove("hidden");
  if (vid) vid.play();
}