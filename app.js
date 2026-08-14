/**
 * Front-end Application logic for Holder Career & Communication Portal.
 * Manages 3D Three.js Assistant, Auth UI, Speech Recognition, 5 Mind Games,
 * Vowel Quest, Project Search, and Biomedical media processing.
 */

// Global state variables
let currentUser = null;
let currentTab = "english";
let notifCount = 0;
let userApiKey = "";

// 3D Assistant variables
let scene, camera, renderer, assistantMesh, assistantParticles;
let assistantAnimationId;
let voiceAmplitude = 1.0; // scale for particle movement matching voice activity

// Speech recognition variables
let recognition;
let isListening = false;
let speechSessionTurns = 0;
let speechCorrectionsGiven = 0;

// Mind Games state variables
let activeSubGame = "memory";
let gameScore = 0;
let gameHighScore = 0;
let gameInterval = null;
let gameTimeout = null;
let gameStatus = "idle"; // 'idle', 'showing', 'playing', 'over'

// Memory Matrix & Simon Sequence data
let memorySequence = [];
let userSequence = [];
let gameGridSize = 4; // 4x4 default
let currentLevel = 1;

// Vowel Quest state
let vowelLevel = 1;
const vowelLevels = [
  { level: 1, word: "Apple", focus: "Short 'A' [æ]", rule: "Use 'An' before words starting with vowel sounds (A, E, I, O, U). Example: 'An apple a day keeps the doctor away.'" },
  { level: 2, word: "Elephant", focus: "Short 'E' [e]", rule: "Ensure 'E' sounds crisp, not elongated. Example: 'An elephant is a majestic creature.'" },
  { level: 3, word: "Igloo", focus: "Short 'I' [ɪ]", rule: "Focus on the short 'ih' sound. Example: 'In the arctic, an igloo keeps warmth inside.'" },
  { level: 4, word: "Octopus", focus: "Short 'O' [ɒ]", rule: "The 'O' starts open. Example: 'An octopus has eight flexible arms.'" },
  { level: 5, word: "Umbrella", focus: "Short 'U' [ʌ]", rule: "A short 'uh' vowel. Example: 'Always carry an umbrella during monsoon seasons.'" }
];

// Biomedical Scanner variables
let uploadedFile = null;
let scanData = null;
let showBioMask = true;
let bioCanvasLoop = null;
const bioCanvas = document.getElementById('bioAnalysisCanvas');
const bioCtx = bioCanvas ? bioCanvas.getContext('2d') : null;
const hiddenVideo = document.getElementById('hiddenVideoPlayer');

// ==================== ONLOAD INITIALIZATION ====================

document.addEventListener("DOMContentLoaded", async () => {
  console.log("Initializing Holder App...");
  
  // Apply saved theme
  const savedTheme = localStorage.getItem("theme") || "dark";
  if (savedTheme === "light") {
    document.body.classList.add("light-theme");
    updateThemeUI(true);
  } else {
    updateThemeUI(false);
  }

  // Check auth session
  await checkAuthSession();
  
  // Start canvas animations
  initBackgroundCanvas();
  init3dAssistant();
  
  // Load default Jobs Feed & notifications
  await refreshJobsFeed();
  await refreshNotifications();

  // Populate suggested chips
  updateChips();

  // Initialize Speech recognition
  initSpeechRecognition();

  // Setup tab routing
  setupTabRouting();

  // Init Vowel quest UI
  loadVowelLevel();

  // Draw initial game grid
  drawGameGrid();
});

// Auth removed - site is open to all visitors
async function checkAuthSession() {
  // No authentication required
  currentUser = null;
}


// Auth UI removed - no login/signup
function updateAuthUI(isLoggedIn) {
  // No-op: authentication has been removed
}


// Tab navigation routing
function setupTabRouting() {
  const hash = window.location.hash.replace("#", "");
  if (hash) {
    const tabBtn = document.getElementById(`tab-${hash}-btn`);
    if (tabBtn) {
      switchTab(hash, tabBtn);
    }
  }
}

// ==================== AUTHENTICATION FLOWS ====================

function switchAuthMode(mode) {
  const signupForm = document.getElementById("auth-signup-form");
  const loginForm = document.getElementById("auth-login-form");
  const tabSignup = document.getElementById("auth-tab-signup");
  const tabLogin = document.getElementById("auth-tab-login");

  if (mode === "signup") {
    signupForm.classList.remove("hidden");
    loginForm.classList.add("hidden");
    tabSignup.classList.add("active");
    tabLogin.classList.remove("active");
  } else {
    signupForm.classList.add("hidden");
    loginForm.classList.remove("hidden");
    tabSignup.classList.remove("active");
    tabLogin.classList.add("active");
  }
}

let pendingVerifyEmail = "";

async function handleAuthSignup(e) {
  e.preventDefault();
  const name = document.getElementById("signup-name").value;
  const email = document.getElementById("signup-email").value;
  const mobile = document.getElementById("signup-mobile").value;
  const password = document.getElementById("signup-password").value;

  try {
    const res = await Backend.Auth.register(name, email, mobile, password);
    if (res.requiresVerification) {
      triggerVerifyModal(res.email, res.verificationCode);
    } else {
      currentUser = res.user;
      updateAuthUI(true);
      await refreshNotifications();
      alert("Registration Successful!");
    }
  } catch (err) {
    if (err.requiresVerification) {
      triggerVerifyModal(err.email || email, err.verificationCode);
    } else {
      alert(err.message || "Failed to register account.");
    }
  }
}

async function handleAuthLogin(e) {
  e.preventDefault();
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;

  try {
    const res = await Backend.Auth.login(email, password);
    currentUser = res.user;
    updateAuthUI(true);
    await refreshNotifications();
    alert("End-to-End Encrypted Login Successful!");
  } catch (err) {
    if (err.requiresVerification) {
      triggerVerifyModal(err.email || email, err.verificationCode);
    } else {
      alert(err.message || "Invalid credentials.");
    }
  }
}

function triggerVerifyModal(email, code) {
  pendingVerifyEmail = email;
  document.getElementById("auth-modal").classList.add("hidden");
  
  const verifyModal = document.getElementById("verify-modal");
  document.getElementById("verifyEmailTarget").textContent = email;
  document.getElementById("verify-code-input").value = code || "";
  
  const hintBox = document.getElementById("verifyCodeDisplayHint");
  const hintCode = document.getElementById("hintOtpCode");
  if (code) {
    hintCode.textContent = code;
    hintBox.style.display = "block";
  } else {
    hintBox.style.display = "none";
  }

  verifyModal.classList.remove("hidden");
}

async function handleVerifyEmailSubmit(e) {
  e.preventDefault();
  const code = document.getElementById("verify-code-input").value.trim();
  if (!code || code.length !== 6) {
    alert("Please enter the 6-digit verification code.");
    return;
  }

  try {
    const res = await Backend.Auth.verifyEmail(pendingVerifyEmail, code);
    currentUser = res.user;
    updateAuthUI(true);
    await refreshNotifications();
    document.getElementById("verify-modal").classList.add("hidden");
    alert("Email verified successfully! Welcome to Holder Portal.");
  } catch (err) {
    alert(err.message || "Invalid verification code.");
  }
}

async function handleResendCode() {
  if (!pendingVerifyEmail) return;
  try {
    const res = await Backend.Auth.resendCode(pendingVerifyEmail);
    document.getElementById("hintOtpCode").textContent = res.verificationCode;
    document.getElementById("verify-code-input").value = res.verificationCode;
    document.getElementById("verifyCodeDisplayHint").style.display = "block";
    alert(`New verification code sent: ${res.verificationCode}`);
  } catch (err) {
    alert("Failed to resend code: " + err.message);
  }
}

// Auth removed
function authLogout() {}
async function deactivateAccount() {}


// ==================== DYNAMIC ANIMATED BACKGROUND ====================

function initBackgroundCanvas() {
  const canvas = document.getElementById("bg-animated-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  window.addEventListener("resize", () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  // Soft glowing ambient blobs
  const blobs = [
    { x: width * 0.2, y: height * 0.3, radius: 250, vx: 0.5, vy: 0.3, color: "rgba(59, 130, 246, 0.04)" },
    { x: width * 0.8, y: height * 0.7, radius: 300, vx: -0.4, vy: -0.2, color: "rgba(168, 85, 247, 0.04)" },
    { x: width * 0.5, y: height * 0.5, radius: 200, vx: 0.3, vy: -0.4, color: "rgba(13, 148, 136, 0.03)" }
  ];

  function animate() {
    ctx.clearRect(0, 0, width, height);

    blobs.forEach(b => {
      b.x += b.vx;
      b.y += b.vy;

      // Wall bounce
      if (b.x - b.radius < 0 || b.x + b.radius > width) b.vx *= -1;
      if (b.y - b.radius < 0 || b.y + b.radius > height) b.vy *= -1;

      // Draw radial gradient blob
      const grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.radius);
      grad.addColorStop(0, b.color);
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fill();
    });

    requestAnimationFrame(animate);
  }

  animate();
}

// ==================== THREE.JS 3D AI ASSISTANT ====================

function init3dAssistant() {
  const container = document.getElementById("aiCanvasContainer");
  if (!container) return;

  const w = container.clientWidth || 240;
  const h = container.clientHeight || 240;

  // Scene
  scene = new THREE.Scene();

  // Camera
  camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
  camera.position.z = 8;

  // Renderer
  renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setSize(w, h);
  renderer.setPixelRatio(window.devicePixelRatio);
  container.innerHTML = ""; // Clear loader if any
  container.appendChild(renderer.domElement);

  // Particles Globe representing AI assistant
  const particleCount = 600;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const originalPositions = [];

  for (let i = 0; i < particleCount; i++) {
    // Generate spherical point cloud coordinates
    const u = Math.random();
    const v = Math.random();
    const theta = u * 2.0 * Math.PI;
    const phi = Math.acos(2.0 * v - 1.0);
    const r = 2.0 + Math.random() * 0.15; // thin shell

    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.sin(phi) * Math.sin(theta);
    const z = r * Math.cos(phi);

    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;

    originalPositions.push({ x, y, z, phi, theta, speed: 1 + Math.random() * 2 });
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  // Custom particle shader material or styled PointsMaterial
  const pColor = getComputedStyle(document.documentElement).getPropertyValue('--brand-primary').trim() || "#3b82f6";
  const material = new THREE.PointsMaterial({
    color: new THREE.Color(pColor),
    size: 0.12,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending
  });

  assistantParticles = new THREE.Points(geometry, material);
  scene.add(assistantParticles);

  // Wireframe core
  const coreGeometry = new THREE.IcosahedronGeometry(1.6, 2);
  const coreMaterial = new THREE.MeshBasicMaterial({
    color: new THREE.Color(pColor),
    wireframe: true,
    transparent: true,
    opacity: 0.22
  });
  assistantMesh = new THREE.Mesh(coreGeometry, coreMaterial);
  scene.add(assistantMesh);

  // Add ambient light
  const light = new THREE.AmbientLight(0xffffff, 0.8);
  scene.add(light);

  let time = 0;
  function animate() {
    assistantAnimationId = requestAnimationFrame(animate);
    time += 0.015;

    // Rotate geometries
    assistantParticles.rotation.y = time * 0.15;
    assistantParticles.rotation.x = time * 0.08;
    assistantMesh.rotation.y = -time * 0.2;

    // Modulate points positions based on voice amplitude (sinusoidal pulse waves)
    const positionsAttr = assistantParticles.geometry.attributes.position;
    const array = positionsAttr.array;

    for (let i = 0; i < particleCount; i++) {
      const p = originalPositions[i];
      // Wave deformation
      const wave = Math.sin(time * p.speed + p.phi * 5) * 0.15 * voiceAmplitude;
      const scale = 1.0 + wave;

      array[i * 3] = p.x * scale;
      array[i * 3 + 1] = p.y * scale;
      array[i * 3 + 2] = p.z * scale;
    }
    positionsAttr.needsUpdate = true;

    // Pulse core
    const corePulse = 1.0 + Math.sin(time * 6) * 0.05 * voiceAmplitude;
    assistantMesh.scale.set(corePulse, corePulse, corePulse);

    renderer.render(scene, camera);
  }

  animate();

  // Handle container resize
  const resizeObserver = new ResizeObserver(entries => {
    for (let entry of entries) {
      const width = entry.contentRect.width || 240;
      const height = entry.contentRect.height || 240;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    }
  });
  resizeObserver.observe(container);
}

// Update the 3D visualizer color scheme on theme swap
function update3dColors() {
  if (!assistantMesh || !assistantParticles) return;
  const pColor = getComputedStyle(document.documentElement).getPropertyValue('--brand-primary').trim() || "#3b82f6";
  assistantParticles.material.color.set(new THREE.Color(pColor));
  assistantMesh.material.color.set(new THREE.Color(pColor));
}

// ==================== NAVIGATION AND THEME SWITCHING ====================

function switchTab(tabId, btnElement) {
  currentTab = tabId;
  window.location.hash = tabId;

  // Toggle active tab buttons
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.classList.remove("active");
    btn.setAttribute("aria-selected", "false");
  });
  btnElement.classList.add("active");
  btnElement.setAttribute("aria-selected", "true");

  // Toggle active contents
  document.querySelectorAll(".tab-content").forEach(content => {
    content.classList.remove("active");
  });
  document.getElementById(tabId).classList.add("active");

  // Custom tab activities
  if (tabId === "games") {
    drawGameGrid();
  } else if (tabId === "dashboard") {
    renderUserDashboard();
  }
}

// Render Protected User Dashboard
async function renderUserDashboard() {
  const loggedOutView = document.getElementById("dashboardLoggedOutView");
  const loggedInView = document.getElementById("dashboardLoggedInView");
  if (!loggedOutView || !loggedInView) return;

  if (!currentUser || !Backend.token) {
    loggedOutView.style.display = "block";
    loggedInView.style.display = "none";
    return;
  }

  loggedOutView.style.display = "none";
  loggedInView.style.display = "block";

  try {
    const dashData = await Backend.Dashboard.getProtectedDashboard();
    const u = dashData.user;
    const sec = dashData.security;

    document.getElementById("dashEmail").textContent = u.email;
    document.getElementById("dashName").textContent = u.name || "--";
    document.getElementById("dashMobile").textContent = u.mobile || "Not Provided";
    document.getElementById("dashCreated").textContent = new Date(u.created_at || Date.now()).toLocaleString();

    document.getElementById("dashE2ee").textContent = sec.e2ee;
    document.getElementById("dashHash").textContent = sec.hashing;
    document.getElementById("dashToken").textContent = sec.session;
    document.getElementById("dashPubKeyStatus").textContent = u.public_key ? "Verified & Registered" : "Generating...";
    
    document.getElementById("dashPubKeyDisplay").textContent = u.public_key || "Generating RSA-2048 public key...";
  } catch (err) {
    console.error("Failed to load protected dashboard:", err);
    loggedOutView.style.display = "block";
    loggedInView.style.display = "none";
  }
}

function toggleTheme() {
  const body = document.body;
  const isLight = body.classList.toggle("light-theme");
  localStorage.setItem("theme", isLight ? "light" : "dark");
  updateThemeUI(isLight);
  update3dColors();
}

function updateThemeUI(isLight) {
  const themeIcon = document.getElementById("themeIcon");
  const themeLabel = document.getElementById("themeLabel");
  if (isLight) {
    themeIcon.textContent = "🌙";
    themeLabel.textContent = "Dark";
  } else {
    themeIcon.textContent = "☀️";
    themeLabel.textContent = "Light";
  }
}

// ==================== NOTIFICATIONS PANEL ====================

function toggleNotifPanel() {
  const panel = document.getElementById("notifPanel");
  panel.classList.toggle("active");
}

async function refreshNotifications() {
  const notifList = document.getElementById("notifList");
  const notifBadge = document.getElementById("notifBadge");
  if (!notifList) return;

  try {
    const data = await Backend.Notifications.fetchNotifications();
    const notifs = data.notifications || [];
    
    // Count unread (where is_read = 0)
    const unread = notifs.filter(n => n.is_read === 0).length;
    notifCount = unread;

    if (unread > 0) {
      notifBadge.textContent = unread;
      notifBadge.style.display = "flex";
    } else {
      notifBadge.style.display = "none";
    }

    if (notifs.length === 0) {
      notifList.innerHTML = `<div style="text-align:center; padding:12px; font-size:0.8rem; color:var(--text-muted);">No career alerts today.</div>`;
      return;
    }

    notifList.innerHTML = notifs.map(n => `
      <div class="notif-item" style="border-left-color: ${n.is_read ? 'var(--border-primary)' : 'var(--brand-primary)'}">
        <strong>${n.title}</strong>
        <p>${n.message}</p>
        <span style="font-size:0.7rem; color:var(--text-muted); display:block; margin-top:4px;">
          ${new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    `).join("");

  } catch (err) {
    console.error("Failed to load notifications:", err);
  }
}

async function clearNotifications() {
  try {
    await Backend.Notifications.clearNotifications();
    notifCount = 0;
    document.getElementById("notifBadge").style.display = "none";
    await refreshNotifications();
  } catch (err) {
    console.error(err);
  }
}

// ==================== INTERVIEW HUB & VOICE AGENT (TAB 1) ====================

function saveApiKeyInMemory() {
  const input = document.getElementById("apiKeyInput");
  userApiKey = input.value.trim();
  if (userApiKey) {
    document.getElementById("apiKeyNote").style.color = "var(--status-success)";
    document.getElementById("apiKeyNote").textContent = "API key configured for direct Gemini calls.";
  }
}

function handleCommModeChange() {
  const mode = document.getElementById("aiCommModeSelect").value;
  const statusEl = document.getElementById("aiVoiceStatus");
  statusEl.textContent = `Partner: Ready (${mode.charAt(0).toUpperCase() + mode.slice(1)} Mode)`;
  speakText(`Mode updated. Practice starting now in ${mode} mode.`);
}

function handleAiModeChange() {
  const engine = document.getElementById("aiModeSelect").value;
  const keyInput = document.getElementById("apiKeyInput");
  const keyNote = document.getElementById("apiKeyNote");
  
  if (engine === "live") {
    keyInput.style.display = "inline-block";
    keyNote.style.display = "block";
  } else {
    keyInput.style.display = "none";
    keyNote.style.display = "none";
  }
}

// Speech Recognition Initialization
function initSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    console.warn("Browser does not support Web Speech Recognition.");
    return;
  }

  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.lang = 'en-US';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    isListening = true;
    voiceAmplitude = 1.8; // trigger rapid pulsing in 3D sphere
    document.getElementById("micBtn").classList.add("active");
    document.getElementById("micBtnText").textContent = "Listening...";
    document.getElementById("aiVoiceStatus").textContent = "Partner: Listening to you...";
  };

  recognition.onresult = (event) => {
    const speechResult = event.results[0][0].transcript;
    document.getElementById("userInputText").value = speechResult;
  };

  recognition.onspeechend = () => {
    recognition.stop();
  };

  recognition.onerror = (event) => {
    console.error("Speech Recognition Error: ", event.error);
    stopListeningUI();
  };

  recognition.onend = () => {
    stopListeningUI();
    // Auto submit if text populated
    const val = document.getElementById("userInputText").value.trim();
    if (val) {
      sendTextMessage();
    }
  };
}

function toggleSpeechRecognition() {
  if (!recognition) {
    alert("Speech recognition is not supported in this browser. Please type your message.");
    return;
  }
  if (isListening) {
    recognition.stop();
  } else {
    document.getElementById("userInputText").value = "";
    recognition.start();
  }
}

function stopListeningUI() {
  isListening = false;
  voiceAmplitude = 1.0;
  const micBtn = document.getElementById("micBtn");
  if (micBtn) {
    micBtn.classList.remove("active");
    document.getElementById("micBtnText").textContent = "Start Mic";
  }
  const mode = document.getElementById("aiCommModeSelect").value;
  document.getElementById("aiVoiceStatus").textContent = `Partner: Ready (${mode} Mode)`;
}

// Text to Speech
function speakText(text) {
  if (!window.speechSynthesis) return;
  
  // Strip any markdown or brackets for vocal clarity
  const speakClean = text.replace(/[*_`#]/g, '').replace(/\[.*?\]/g, '');

  window.speechSynthesis.cancel(); // Stop current speech
  const utterance = new SpeechSynthesisUtterance(speakClean);
  utterance.lang = 'en-US';
  
  // Set voice characteristics depending on mode
  const mode = document.getElementById("aiCommModeSelect").value;
  if (mode === "friendly") {
    utterance.rate = 1.05;
    utterance.pitch = 1.1;
  } else if (mode === "strictly") {
    utterance.rate = 0.95;
    utterance.pitch = 0.9;
  } else {
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
  }

  utterance.onstart = () => {
    voiceAmplitude = 2.5; // active 3D movement during vocal playback
  };
  utterance.onend = () => {
    voiceAmplitude = 1.0;
  };

  window.speechSynthesis.speak(utterance);
}

// Text Chat processing
async function sendTextMessage() {
  const inputEl = document.getElementById("userInputText");
  const chatBox = document.getElementById("chatBox");
  const message = inputEl.value.trim();
  if (!message) return;

  // Append user bubble
  appendChatBubble("user", message);
  inputEl.value = "";

  // Increment turns
  speechSessionTurns++;
  document.getElementById("statTurns").textContent = speechSessionTurns;

  const mode = document.getElementById("aiCommModeSelect").value;
  const engine = document.getElementById("aiModeSelect").value;

  // Response phase
  appendChatBubble("ai", "Thinking...", "temp-loading");
  
  try {
    let aiResponse = "";
    let grammarCorrection = "";

    if (engine === "live" && userApiKey) {
      // Direct call to Google Gemini Flash API
      aiResponse = await queryGeminiDirect(message);
    } else {
      // Local Practice responses
      const responseObj = generateLocalPartnerResponse(message, mode);
      aiResponse = responseObj.reply;
      grammarCorrection = responseObj.correction;
    }

    // Remove loading bubble
    const loader = document.querySelector(".temp-loading");
    if (loader) loader.remove();

    // Render responses
    appendChatBubble("ai", aiResponse);
    speakText(aiResponse);

    if (grammarCorrection) {
      speechCorrectionsGiven++;
      document.getElementById("statFixes").textContent = speechCorrectionsGiven;
      appendChatBubble("correction", `💡 Grammar Tip: ${grammarCorrection}`);
      
      // Reduce fluency score dynamically if errors found
      const score = Math.max(50, 100 - (speechCorrectionsGiven * 10));
      document.getElementById("statFluency").textContent = `${score}%`;
    }

  } catch (err) {
    const loader = document.querySelector(".temp-loading");
    if (loader) loader.remove();
    appendChatBubble("ai", "Sorry, I had trouble communicating with the server. Please check your network.");
  }
}

// Helper to append bubble
function appendChatBubble(sender, text, cssClass = "") {
  const chatBox = document.getElementById("chatBox");
  const bubble = document.createElement("div");
  bubble.className = `chat-bubble ${sender} ${cssClass}`;
  bubble.textContent = text;
  chatBox.appendChild(bubble);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// Query Gemini API directly
async function queryGeminiDirect(userMsg) {
  const mode = document.getElementById("aiCommModeSelect").value;
  const systemPrompt = `You are a helpful English Communication and Interview practice partner. 
    Current communication mode: ${mode}.
    Friendly mode: Be encouraging, conversational, warm, and ask helpful follow up questions.
    Strictly mode: Be extremely formal, analyze their input, point out grammatical issues, and ask rigid professional interview questions.
    Teaching mode: Gently point out any grammar errors, explain why it was wrong, suggest advanced vocabulary replacements, and keep the dialog educational.
    Keep your responses concise, under 3 sentences, and ask a single conversational or interview question.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${userApiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\nCandidate says: "${userMsg}"` }] }]
    })
  });
  
  if (!response.ok) throw new Error("Gemini call failed.");
  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

// Seed local conversations
function generateLocalPartnerResponse(msg, mode) {
  const lower = msg.toLowerCase();
  let reply = "";
  let correction = "";

  // Simple local grammar checking
  if (lower.includes("i is") || lower.includes("i has") || lower.includes("he don't") || lower.includes("they does")) {
    if (lower.includes("i is")) correction = "Use 'I am' instead of 'I is'.";
    if (lower.includes("i has")) correction = "Use 'I have' for first-person ownership.";
    if (lower.includes("he don't")) correction = "Use 'He doesn't' (third-person singular).";
    if (lower.includes("they does")) correction = "Use 'They do' for plural subjects.";
  }

  // Conversation mapping
  if (lower.includes("hello") || lower.includes("hi")) {
    reply = "Hello there! I'm ready to help you practice. What topic would you like to focus on for our mock interview today?";
  } else if (lower.includes("tell me about yourself") || lower.includes("introduce myself") || lower.includes("introduce yourself")) {
    reply = "Excellent. Start by summarizing your present role or studies, highlight one key project achievement, and explain why you're interested in growth.";
  } else if (lower.includes("strength") || lower.includes("weakness")) {
    reply = "Good focus. Remember to back up your strengths with a real-life project example, and frame your weakness as a skill you are actively improving.";
  } else if (lower.includes("star method") || lower.includes("behavioral")) {
    reply = "The STAR method structures your answers: Situation, Task, Action, and Result. Let's try it: Tell me about a time you resolved a conflict in a team.";
  } else if (lower.includes("project") || lower.includes("built")) {
    reply = "That sounds intriguing. What was the main technical challenge you faced while building it, and how did you resolve it?";
  } else {
    // Default mode responses
    if (mode === "friendly") {
      reply = "That makes absolute sense! It is great that you share that. How do you think this skill helps you in a group discussion or coding setting?";
    } else if (mode === "strictly") {
      reply = "Understood. Let's evaluate that answer under formal settings. Do you think that response clearly communicates your core engineering capabilities?";
    } else {
      reply = "An interesting viewpoint. Let's look at alternative vocabulary. Instead of saying 'built a project', you can use words like 'engineered' or 'architected' to show expertise.";
    }
  }

  return { reply, correction };
}

// Generate topic chips
const interviewTopics = ["Introduce Yourself", "Strengths & Weaknesses", "STAR Method Practice", "Technical Project Discussion", "Salary Negotiation"];
const topicRow = document.getElementById("topicChipRow");
if (topicRow) {
  topicRow.innerHTML = interviewTopics.map(t => `
    <button class="chip" onclick="document.getElementById('userInputText').value='Let\\'s discuss: ${t}'; sendTextMessage();">${t}</button>
  `).join("");
}

// ==================== CAREER GROWTH / JOBS FEED (TAB 2) ====================

async function refreshJobsFeed() {
  const grid = document.getElementById("jobFeedGrid");
  if (!grid) return;

  try {
    const data = await Backend.Jobs.fetchJobs();
    const jobs = data.jobs || [];

    if (jobs.length === 0) {
      grid.innerHTML = `<p style="grid-column: 1/-1; text-align:center;">No openings listed today. Check back later!</p>`;
      return;
    }

    grid.innerHTML = jobs.map(j => {
      const isPlacement = j.type === "Placement";
      const iconLogo = isPlacement ? "🎓" : "💼";
      const locationIcon = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:3px; vertical-align:middle;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`;
      const rupeeIcon = `💵`;

      return `
        <div class="job-card">
          <div class="job-card-header">
            <div>
              <span class="chip" style="background:${isPlacement ? 'var(--status-success-bg)' : 'var(--bg-accent)'}; color:${isPlacement ? 'var(--status-success)' : 'var(--brand-primary)'}; border-color:${isPlacement ? 'var(--status-success)' : 'var(--brand-primary)'}; font-size:0.65rem; margin:0 0 6px 0;">
                ${iconLogo} ${j.type}
              </span>
              <h3 style="margin-top:4px;">${j.title}</h3>
              <div class="job-company">${j.company}</div>
            </div>
          </div>
          <div class="job-details">
            <p style="margin-bottom:4px;">${locationIcon} ${j.location}</p>
            <p>${rupeeIcon} ${j.salary || "Best in Industry"}</p>
          </div>
          <div class="job-card-footer">
            <span style="font-size:0.7rem; color:var(--text-muted);">Posted: ${new Date(j.posted_date).toLocaleDateString()}</span>
            ${isPlacement && j.linkedin_profile 
              ? `<a href="${j.linkedin_profile}" target="_blank" class="social-btn">🔗 Alumni Profile</a>`
              : `<a href="${j.link}" target="_blank" class="btn btn-sm">Apply Now</a>`
            }
          </div>
        </div>
      `;
    }).join("");

  } catch (err) {
    grid.innerHTML = `<p style="grid-column: 1/-1; text-align:center; color:var(--status-live);">Failed to load job listings.</p>`;
  }
}

// ==================== PROJECT ENGINE (TAB 3) ====================

function updateChips() {
  const category = document.getElementById("projectCategory").value;
  const container = document.getElementById("chipsContainer");
  if (!container) return;

  const chips = category === "Hardware" 
    ? ["Arduino Weather Station", "Raspberry Pi Security Cam", "IoT Smart Irrigation", "EEG Brain Wave Monitor"]
    : ["Web Developer Portfolio", "AI Chatbot Assistant", "Biomedical Segmenter", "Online Placement Portal"];

  container.innerHTML = chips.map(c => `
    <button class="chip" onclick="selectProjectChip('${c}')">${c}</button>
  `).join("");
}

function selectProjectChip(name) {
  document.getElementById("projectQuery").value = name;
  searchProjectTopic();
}

async function searchProjectTopic() {
  const query = document.getElementById("projectQuery").value.trim();
  const category = document.getElementById("projectCategory").value;
  
  if (!query) {
    alert("Please enter a topic to search.");
    return;
  }

  // Show status indicators
  const blueprintOutput = document.getElementById("blueprintOutput");
  const wikiOutput = document.getElementById("wikiOutput");
  blueprintOutput.style.display = "block";
  wikiOutput.style.display = "block";

  document.getElementById("blueprintTopicName").textContent = query;
  document.getElementById("blueprintDomainBadge").textContent = category;
  document.getElementById("wikiTitle").textContent = query;
  document.getElementById("wikiSnippet").textContent = "Loading Wikipedia background summaries...";

  // Fetch local blueprint
  try {
    const data = await Backend.Projects.fetchBlueprint(query, category);
    const bp = data.blueprint;

    document.getElementById("blueprintIdea").textContent = bp.idea;
    
    // Tools
    const toolsContainer = document.getElementById("blueprintTools");
    toolsContainer.innerHTML = bp.tools.map(t => `<span class="tool-tag">${t}</span>`).join("");

    // Build Steps
    const stepsContainer = document.getElementById("blueprintSteps");
    stepsContainer.innerHTML = bp.steps.map(s => `<li>${s}</li>`).join("");

    // Roadmap
    const roadmapContainer = document.getElementById("blueprintRoadmap");
    roadmapContainer.innerHTML = bp.roadmap.map(r => `
      <div style="display:flex; align-items:center; gap:8px; margin-top:8px;">
        <span style="width:8px; height:8px; border-radius:50%; background:var(--brand-primary);"></span>
        <span style="font-size:0.85rem; color:var(--text-secondary);">${r}</span>
      </div>
    `).join("");

    // Details
    const detailsContainer = document.getElementById("blueprintDetails");
    detailsContainer.innerHTML = bp.details.map(d => `<li>${d}</li>`).join("");

  } catch (err) {
    console.error("Local blueprint fetching failed:", err);
  }

  // Fetch Wikipedia proxy data
  try {
    const data = await Backend.Projects.fetchWikiSummary(query);
    document.getElementById("wikiSnippet").textContent = data.summary || data.extract || "No extract available.";
    
    const extLinks = document.getElementById("extLinks");
    extLinks.innerHTML = `
      <a href="${data.url}" target="_blank" class="social-btn">📚 Read Wikipedia</a>
      <a href="https://github.com/search?q=${encodeURIComponent(query)}" target="_blank" class="social-btn">💻 Github Projects</a>
      <a href="https://www.google.com/search?q=${encodeURIComponent(query)}" target="_blank" class="social-btn">🔍 Google Deep Search</a>
    `;
  } catch (err) {
    document.getElementById("wikiSnippet").textContent = "Could not locate matching Wikipedia encyclopedia topic. Check spelling or try a more general term.";
    document.getElementById("extLinks").innerHTML = `
      <a href="https://github.com/search?q=${encodeURIComponent(query)}" target="_blank" class="social-btn">💻 Search Github</a>
      <a href="https://www.google.com/search?q=${encodeURIComponent(query)}" target="_blank" class="social-btn">🔍 Google Search</a>
    `;
  }
}

// ==================== BIOMEDICAL AI SCANNER (TAB 4) ====================

function handleMediaUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  uploadedFile = file;
  
  // Show progress bar
  const progressContainer = document.getElementById("scanProgressBar");
  const progressFill = document.getElementById("scanProgressFill");
  progressContainer.style.display = "block";
  progressFill.style.width = "0%";

  // Reset status
  document.getElementById("analysisStatus").textContent = "Analyzing uploaded binary matrix data...";
  document.getElementById("analysisTitle").textContent = "Medical media scan booting...";

  // Simulated progress increment
  let progress = 0;
  const interval = setInterval(() => {
    progress += Math.floor(Math.random() * 15) + 5;
    if (progress >= 100) {
      progress = 100;
      clearInterval(interval);
      // Initiate upload
      uploadAndAnalyzeMedia(file);
    }
    progressFill.style.width = `${progress}%`;
  }, 100);
}

async function uploadAndAnalyzeMedia(file) {
  const progressContainer = document.getElementById("scanProgressBar");
  try {
    const res = await Backend.Biomedical.uploadScan(file);

    // Load metrics from flat response
    document.getElementById("analysisStatus").textContent = "Analysis pipeline completed. Diagnostics extracted.";
    document.getElementById("analysisTitle").textContent = "Diagnostic Report";
    
    const metricList = document.getElementById("metricList");
    metricList.innerHTML = `
      <li><span>Pipeline Status:</span> <strong style="color:var(--status-success);">Analysis Verified</strong></li>
      <li><span>File Type:</span> <strong>${res.fileType}</strong></li>
      <li><span>Detected Class:</span> <strong>${res.detected_class}</strong></li>
      <li><span>Structural Metric:</span> <strong>${res.structural_metric}</strong></li>
      <li><span>Confidence Score:</span> <strong style="color:var(--status-bio);">${res.confidence.toFixed(1)}%</strong></li>
      <li><span>Recommendation:</span> <em style="color:var(--text-secondary);">${res.recommendation}</em></li>
    `;

    // Store for canvas
    scanData = {
      fileType: res.fileType,
      detected_class: res.detected_class,
      confidence: res.confidence,
      structural_metric: res.structural_metric
    };

    // Trigger AI Knowledge Card
    triggerBioKnowledgeCard(res.detected_class);

  } catch (err) {
    document.getElementById("analysisStatus").textContent = "Scan Pipeline failed: " + err.message;
  } finally {
    setTimeout(() => { progressContainer.style.display = "none"; }, 1000);
  }
}


function renderScanOnCanvas() {
  if (!bioCtx || !scanData) return;

  if (bioCanvasLoop) {
    cancelAnimationFrame(bioCanvasLoop);
    bioCanvasLoop = null;
  }
  hiddenVideo.pause();

  const isVideo = scanData.fileType === "video";

  if (isVideo) {
    hiddenVideo.src = scanData.filepath;
    hiddenVideo.load();
    hiddenVideo.play();
    
    function drawFrame() {
      if (hiddenVideo.paused || hiddenVideo.ended) return;
      bioCtx.drawImage(hiddenVideo, 0, 0, bioCanvas.width, bioCanvas.height);
      if (showBioMask && scanData.overlayMask) {
        drawMask(scanData.overlayMask);
      }
      bioCanvasLoop = requestAnimationFrame(drawFrame);
    }
    hiddenVideo.onplay = () => {
      bioCanvasLoop = requestAnimationFrame(drawFrame);
    };
  } else {
    // Image loading
    const img = new Image();
    img.src = scanData.filepath;
    img.onload = () => {
      bioCtx.drawImage(img, 0, 0, bioCanvas.width, bioCanvas.height);
      if (showBioMask && scanData.overlayMask) {
        drawMask(scanData.overlayMask);
      }
    };
  }
}

function drawMask(mask) {
  bioCtx.fillStyle = mask.color || 'rgba(239, 68, 68, 0.4)';
  bioCtx.strokeStyle = 'rgba(239, 68, 68, 0.85)';
  bioCtx.lineWidth = 3;
  
  // Highlight box
  bioCtx.fillRect(mask.x, mask.y, mask.w, mask.h);
  bioCtx.strokeRect(mask.x, mask.y, mask.w, mask.h);

  // Reticle lines
  bioCtx.beginPath();
  bioCtx.arc(mask.x + mask.w/2, mask.y + mask.h/2, 6, 0, Math.PI * 2);
  bioCtx.fillStyle = '#ef4444';
  bioCtx.fill();

  bioCtx.font = "bold 11px Outfit";
  bioCtx.fillStyle = "#ffffff";
  bioCtx.fillText("ANOMALY REGION", mask.x + 8, mask.y + 18);
}

function toggleOverlay() {
  showBioMask = !showBioMask;
  renderScanOnCanvas();
}

async function triggerBioKnowledgeCard(className) {
  const card = document.getElementById("aiKnowledgeCard");
  if (!card) return;

  card.style.display = "block";
  document.getElementById("autoWikiTitle").textContent = className;
  document.getElementById("autoWikiSnippet").textContent = "Loading clinical reference data...";

  try {
    const data = await Backend.Projects.fetchWikiSummary(className);
    document.getElementById("autoWikiSnippet").textContent = data.extract || "No encyclopedia data available.";
    document.getElementById("autoAiDetails").textContent = `Clinical diagnosis confirms matches with ${className} parameters. Recommended procedures include cross-sectional multi-planar MRI re-scans and radiological specialist evaluations.`;
    
    document.getElementById("autoExtLinks").innerHTML = `
      <a href="${data.pageurl}" target="_blank" class="social-btn">📚 Read Wikipedia Info</a>
      <a href="https://scholar.google.com/scholar?q=${encodeURIComponent(className)}" target="_blank" class="social-btn">🔬 Search Google Scholar</a>
    `;
  } catch (err) {
    document.getElementById("autoWikiSnippet").textContent = "No standard Wikipedia entry matches the specific pathology classification exactly.";
    document.getElementById("autoAiDetails").textContent = `Pathological Class: ${className}. Diagnostic confidence threshold passed successfully. Secondary tests advised.`;
    document.getElementById("autoExtLinks").innerHTML = `
      <a href="https://scholar.google.com/scholar?q=${encodeURIComponent(className)}" target="_blank" class="social-btn">🔬 Search Google Scholar</a>
    `;
  }
}

function exportAnalysisReport() {
  if (!scanData) {
    alert("Please upload and analyze media before exporting a report.");
    return;
  }

  const reportText = `
========================================
BIOMEDICAL AI SCAN ANALYSIS REPORT
========================================
Timestamp: ${new Date().toLocaleString()}
Patient Session Code: USER-SESSION-${currentUser ? currentUser.id : "ANONYMOUS"}
Media File ID: ${scanData.filepath.split('/').pop()}

----------------------------------------
DIAGNOSTICS & METRICS:
----------------------------------------
Target Scan Pathology: ${scanData.detectedClass}
Segmentation Metric:   ${scanData.metric}
AI Confidence Index:   ${(scanData.confidence * 100).toFixed(2)}%
Status Flag:           VERIFIED - PASSED PIPELINE FILTERS

----------------------------------------
CLINICAL RECOMMENDATION:
----------------------------------------
This is a simulated AI-assisted biomedical model output.
Verify diagnostic images with certified radiologists.
Please follow medical procedures for follow-up testing.

========================================
HOLDER HEALTH AI DIAGNOSTICS DEPLOYMENT
========================================
  `;

  const blob = new Blob([reportText], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `Medical_Report_${scanData.detectedClass.replace(/ /g, '_')}.txt`;
  link.click();
}

// ==================== MIND GAMES & ENGLISH VOWEL QUEST (TAB 5) ====================

function switchSubGame(gameName, btnElement) {
  activeSubGame = gameName;
  gameStatus = "idle";
  
  // Update sub-game buttons UI
  document.querySelectorAll(".subgame-btn").forEach(btn => {
    btn.classList.remove("active");
  });
  btnElement.classList.add("active");

  const mindGameContainer = document.getElementById("mindGameContainer");
  const vowelGameContainer = document.getElementById("vowelGameContainer");

  if (gameName === "vowel") {
    mindGameContainer.style.display = "none";
    vowelGameContainer.style.display = "block";
    loadVowelLevel();
  } else {
    mindGameContainer.style.display = "block";
    vowelGameContainer.style.display = "none";
    
    // Reset and render selected mind game
    resetMindGameState();
    drawGameGrid();
  }
}

function resetMindGameState() {
  if (gameInterval) clearInterval(gameInterval);
  if (gameTimeout) clearTimeout(gameTimeout);
  gameScore = 0;
  currentLevel = 1;
  document.getElementById("gameScore").textContent = "0";
  document.getElementById("gameStatusText").textContent = "Click Start / Reset to begin";
  document.getElementById("gameStatusText").style.color = "var(--text-secondary)";
  
  // Load High Score
  loadGameHighScore();
}

async function loadGameHighScore() {
  const hsSpan = document.getElementById("gameHighScore");
  if (!currentUser) {
    hsSpan.textContent = "Sign in to log";
    return;
  }
  
  try {
    const data = await Backend.Games.getHighScore(activeSubGame);
    gameHighScore = data.highScore || 0;
    hsSpan.textContent = gameHighScore;
  } catch (err) {
    hsSpan.textContent = "0";
  }
}

async function recordScore(score) {
  if (!currentUser) return;
  try {
    const res = await Backend.Games.saveScore(activeSubGame, score);
    gameHighScore = res.highScore;
    document.getElementById("gameHighScore").textContent = gameHighScore;
  } catch (err) {
    console.error("Failed to record score:", err);
  }
}

function drawGameGrid() {
  const container = document.getElementById("gameGridContainer");
  if (!container) return;

  container.innerHTML = "";
  
  if (activeSubGame === "memory" || activeSubGame === "pattern") {
    container.style.gridTemplateColumns = `repeat(${gameGridSize}, 1fr)`;
    const tileCount = gameGridSize * gameGridSize;
    for (let i = 0; i < tileCount; i++) {
      const tile = document.createElement("div");
      tile.className = "game-tile";
      tile.dataset.index = i;
      tile.onclick = () => handleGameTileClick(i);
      container.appendChild(tile);
    }
  } else if (activeSubGame === "speed") {
    container.style.gridTemplateColumns = "1fr";
    container.innerHTML = `
      <div class="speed-match-display">
        <div id="speedShape" class="speed-match-shape" style="background:var(--brand-primary)"></div>
        <p id="speedMatchPrompt" style="font-size:1.1rem; font-weight:700;">Does this match the PREVIOUS shape?</p>
        <div class="speed-match-buttons">
          <button class="btn speed-match-btn btn-success" onclick="handleSpeedMatchClick(true)">Yes (Match)</button>
          <button class="btn speed-match-btn btn-secondary" style="border-color:var(--status-live); color:var(--status-live)" onclick="handleSpeedMatchClick(false)">No</button>
        </div>
      </div>
    `;
  } else if (activeSubGame === "focus") {
    container.style.gridTemplateColumns = "repeat(5, 1fr)"; // 5x5 grid of numbers
    setupFocusGridGame();
  } else if (activeSubGame === "calc") {
    container.style.gridTemplateColumns = "1fr";
    setupCalcGame();
  }
}

function startCurrentMindGame() {
  resetMindGameState();
  gameStatus = "playing";
  document.getElementById("gameStatusText").textContent = "Game started!";
  document.getElementById("gameStatusText").style.color = "var(--status-success)";

  if (activeSubGame === "memory") {
    startMemoryMatrixLevel();
  } else if (activeSubGame === "pattern") {
    startPatternSequenceLevel();
  } else if (activeSubGame === "speed") {
    startSpeedMatchGame();
  } else if (activeSubGame === "focus") {
    startFocusGridGame();
  } else if (activeSubGame === "calc") {
    startCalcGame();
  }
}

// --- GAME 1: MEMORY MATRIX ---
function startMemoryMatrixLevel() {
  drawGameGrid();
  gameStatus = "showing";
  document.getElementById("gameStatusText").textContent = `Memorize the tiles! Level ${currentLevel}`;
  document.getElementById("gameStatusText").style.color = "var(--status-wiki)";

  const tileCount = gameGridSize * gameGridSize;
  const tilesToFlashCount = 2 + currentLevel; // increase tiles to recall as level goes up
  
  memorySequence = [];
  userSequence = [];

  while (memorySequence.length < tilesToFlashCount) {
    const idx = Math.floor(Math.random() * tileCount);
    if (!memorySequence.includes(idx)) {
      memorySequence.push(idx);
    }
  }

  // Flash selected tiles
  setTimeout(() => {
    memorySequence.forEach(idx => {
      const tile = document.querySelector(`.game-tile[data-index='${idx}']`);
      if (tile) tile.classList.add("active");
    });

    gameTimeout = setTimeout(() => {
      // Hide them
      document.querySelectorAll(".game-tile").forEach(t => t.classList.remove("active"));
      gameStatus = "playing";
      document.getElementById("gameStatusText").textContent = "Select the hidden tiles!";
      document.getElementById("gameStatusText").style.color = "var(--brand-primary)";
    }, 1200 + (currentLevel * 100)); // flash longer for higher levels
  }, 500);
}

// --- GAME 3: PATTERN SEQUENCE (SIMON) ---
function startPatternSequenceLevel() {
  drawGameGrid();
  gameStatus = "showing";
  document.getElementById("gameStatusText").textContent = `Watch the sequence! Step ${currentLevel}`;
  
  // Add a random tile index to the sequence
  const tileCount = gameGridSize * gameGridSize;
  memorySequence.push(Math.floor(Math.random() * tileCount));
  userSequence = [];

  let step = 0;
  gameInterval = setInterval(() => {
    const idx = memorySequence[step];
    const tile = document.querySelector(`.game-tile[data-index='${idx}']`);
    
    if (tile) {
      tile.classList.add("active");
      setTimeout(() => tile.classList.remove("active"), 400);
    }

    step++;
    if (step >= memorySequence.length) {
      clearInterval(gameInterval);
      setTimeout(() => {
        gameStatus = "playing";
        document.getElementById("gameStatusText").textContent = "Repeat the sequence!";
      }, 500);
    }
  }, 600);
}

// Handle common tile clicks for Memory/Pattern
function handleGameTileClick(idx) {
  if (gameStatus !== "playing") return;

  const tile = document.querySelector(`.game-tile[data-index='${idx}']`);
  if (!tile) return;

  if (activeSubGame === "memory") {
    // Memorization checks
    if (memorySequence.includes(idx)) {
      if (!userSequence.includes(idx)) {
        userSequence.push(idx);
        tile.classList.add("success");
        gameScore += 10;
        document.getElementById("gameScore").textContent = gameScore;

        if (userSequence.length === memorySequence.length) {
          // Level clear
          gameStatus = "showing";
          document.getElementById("gameStatusText").textContent = "Level cleared!";
          recordScore(gameScore);
          setTimeout(() => {
            currentLevel++;
            if (currentLevel > 5) gameGridSize = 5; // grid scales larger
            startMemoryMatrixLevel();
          }, 1000);
        }
      }
    } else {
      // Wrong tile click
      tile.classList.add("wrong");
      endMindGame("Game Over! Clicked incorrect tile.");
    }
  } else if (activeSubGame === "pattern") {
    // Simon sequence checks
    userSequence.push(idx);
    tile.classList.add("active");
    setTimeout(() => tile.classList.remove("active"), 200);

    const step = userSequence.length - 1;
    if (userSequence[step] !== memorySequence[step]) {
      endMindGame("Incorrect pattern sequence!");
      return;
    }

    if (userSequence.length === memorySequence.length) {
      gameScore += 20;
      document.getElementById("gameScore").textContent = gameScore;
      recordScore(gameScore);
      setTimeout(() => {
        currentLevel++;
        startPatternSequenceLevel();
      }, 800);
    }
  }
}

// --- GAME 2: SPEED MATCH ---
let speedPreviousColor = "";
let speedCurrentColor = "";
const speedColors = ["var(--brand-primary)", "var(--brand-secondary)", "var(--status-success)", "var(--status-live)", "var(--status-wiki)"];

function startSpeedMatchGame() {
  drawGameGrid();
  speedPreviousColor = "";
  nextSpeedMatchShape();
}

function nextSpeedMatchShape() {
  const shape = document.getElementById("speedShape");
  if (!shape) return;

  speedPreviousColor = speedCurrentColor;
  // Choose random color
  const randColor = speedColors[Math.floor(Math.random() * speedColors.length)];
  speedCurrentColor = randColor;

  shape.style.background = speedCurrentColor;
}

function handleSpeedMatchClick(userSaysYes) {
  if (gameStatus !== "playing") return;

  const actualMatch = (speedPreviousColor === speedCurrentColor && speedPreviousColor !== "");
  
  if (userSaysYes === actualMatch) {
    gameScore += 10;
    document.getElementById("gameScore").textContent = gameScore;
    recordScore(gameScore);
    document.getElementById("gameStatusText").textContent = "Correct!";
    document.getElementById("gameStatusText").style.color = "var(--status-success)";
  } else {
    document.getElementById("gameStatusText").textContent = "Wrong Match!";
    document.getElementById("gameStatusText").style.color = "var(--status-live)";
  }

  nextSpeedMatchShape();
}

// --- GAME 4: FOCUS GRID ---
let focusTargetNumber = 1;
let focusTimeLimit = 30;

function setupFocusGridGame() {
  const container = document.getElementById("gameGridContainer");
  
  // Generate numbers 1 to 25 and shuffle
  const nums = [];
  for (let i = 1; i <= 25; i++) nums.push(i);
  nums.sort(() => Math.random() - 0.5);

  container.innerHTML = nums.map(n => `
    <button class="game-tile" data-focus="${n}" onclick="handleFocusTileClick(${n}, this)">${n}</button>
  `).join("");
}

function startFocusGridGame() {
  focusTargetNumber = 1;
  focusTimeLimit = 30;
  setupFocusGridGame();

  document.getElementById("gameStatusText").textContent = `Click numbers in order: Find 1! (${focusTimeLimit}s)`;

  gameInterval = setInterval(() => {
    focusTimeLimit--;
    if (focusTimeLimit <= 0) {
      clearInterval(gameInterval);
      endFocusGrid();
    } else {
      document.getElementById("gameStatusText").textContent = `Click numbers in order: Find ${focusTargetNumber}! (${focusTimeLimit}s)`;
    }
  }, 1000);
}

function handleFocusTileClick(num, btn) {
  if (gameStatus !== "playing") return;

  if (num === focusTargetNumber) {
    btn.classList.add("success");
    btn.disabled = true;
    gameScore += 5;
    document.getElementById("gameScore").textContent = gameScore;
    recordScore(gameScore);
    focusTargetNumber++;
    
    if (focusTargetNumber > 25) {
      clearInterval(gameInterval);
      endMindGame("Brilliant! Finished grid successfully.");
    } else {
      document.getElementById("gameStatusText").textContent = `Find ${focusTargetNumber}! (${focusTimeLimit}s)`;
    }
  } else {
    // Penalty
    focusTimeLimit = Math.max(0, focusTimeLimit - 3);
  }
}

function endFocusGrid() {
  endMindGame("Time is up!");
}

// --- GAME 5: CALCULATION DASH ---
let calcAnswer = 0;
let calcTimer = 15;

function setupCalcGame() {
  const container = document.getElementById("gameGridContainer");
  container.innerHTML = `
    <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; gap:20px; width:100%; height:100%;">
      <div id="calcQuestion" style="font-family:var(--font-title); font-size:2rem; font-weight:800;">--</div>
      <input type="number" id="calcInput" class="input-control" placeholder="Answer..." style="max-width:180px; text-align:center;" onkeydown="if(event.key==='Enter') checkCalcAnswer()">
      <button class="btn btn-game" onclick="checkCalcAnswer()">Submit</button>
    </div>
  `;
}

function startCalcGame() {
  setupCalcGame();
  calcTimer = 15;
  nextCalcQuestion();

  gameInterval = setInterval(() => {
    calcTimer--;
    if (calcTimer <= 0) {
      clearInterval(gameInterval);
      endMindGame(`Time's up! Game Over. Final Score: ${gameScore}`);
    } else {
      document.getElementById("gameStatusText").textContent = `Solve as many as possible! ${calcTimer}s left`;
    }
  }, 1000);
}

function nextCalcQuestion() {
  const qEl = document.getElementById("calcQuestion");
  const input = document.getElementById("calcInput");
  if (!qEl || !input) return;

  input.value = "";
  input.focus();

  const num1 = Math.floor(Math.random() * 12) + 2;
  const num2 = Math.floor(Math.random() * 12) + 2;
  const operators = ["+", "-", "*"];
  const op = operators[Math.floor(Math.random() * operators.length)];

  if (op === "+") {
    calcAnswer = num1 + num2;
  } else if (op === "-") {
    calcAnswer = num1 - num2;
  } else {
    calcAnswer = num1 * num2;
  }

  qEl.textContent = `${num1} ${op} ${num2} = ?`;
}

function checkCalcAnswer() {
  if (gameStatus !== "playing") return;

  const val = parseInt(document.getElementById("calcInput").value);
  if (val === calcAnswer) {
    gameScore += 15;
    document.getElementById("gameScore").textContent = gameScore;
    recordScore(gameScore);
    document.getElementById("gameStatusText").textContent = "Correct!";
    document.getElementById("gameStatusText").style.color = "var(--status-success)";
    calcTimer = Math.min(25, calcTimer + 2); // reward bonus seconds
    nextCalcQuestion();
  } else {
    document.getElementById("gameStatusText").textContent = "Incorrect answer!";
    document.getElementById("gameStatusText").style.color = "var(--status-live)";
  }
}

// End game handler
function endMindGame(msg) {
  gameStatus = "over";
  if (gameInterval) clearInterval(gameInterval);
  if (gameTimeout) clearTimeout(gameTimeout);
  
  document.getElementById("gameStatusText").textContent = msg;
  document.getElementById("gameStatusText").style.color = "var(--status-live)";
  alert(`Game Finished! Final Score: ${gameScore}`);
}


// --- ENGLISH VOWEL & GRAMMAR LEVEL GAME ---

function loadVowelLevel() {
  const current = vowelLevels[vowelLevel - 1];
  
  document.getElementById("vowelLevelBadge").textContent = `Level ${vowelLevel} of 5`;
  document.getElementById("vowelProgressFill").style.width = `${vowelLevel * 20}%`;
  document.getElementById("vowelLevelTitle").textContent = `Current Vowel Focus: ${current.focus}`;
  document.getElementById("vowelTargetWord").textContent = `Word: "${current.word}"`;
  document.getElementById("vowelGrammarRule").textContent = `Grammar Rule: ${current.rule}`;
  document.getElementById("vowelFeedbackText").textContent = "";
  document.getElementById("vowelUserAnswer").value = "";
}

function speakVowelTarget() {
  const current = vowelLevels[vowelLevel - 1];
  speakText(current.word);
}

async function submitVowelLevelAnswer() {
  const userAnswer = document.getElementById("vowelUserAnswer").value.trim();
  const current = vowelLevels[vowelLevel - 1];
  const fb = document.getElementById("vowelFeedbackText");

  if (!userAnswer) {
    fb.style.color = "var(--status-live)";
    fb.textContent = "Please input a sentence using the target word.";
    return;
  }

  // Basic check: must contain the target word (case insensitive)
  const hasWord = userAnswer.toLowerCase().includes(current.word.toLowerCase());
  
  // Basic grammar logic: check for common rule compliance
  // Level 1: "Apple" requires "an apple"
  let grammarPass = true;
  let ruleFeedback = "Rule check: Passed!";

  if (current.level === 1) {
    const pattern = /\ban\s+apple\b/i;
    if (!pattern.test(userAnswer)) {
      grammarPass = false;
      ruleFeedback = "Grammar violation: Remember, use 'an' before 'apple' because it starts with a vowel sound!";
    }
  } else if (current.level === 2) {
    const pattern = /\ban\s+elephant\b/i;
    if (!pattern.test(userAnswer)) {
      grammarPass = false;
      ruleFeedback = "Grammar violation: Remember, use 'an' before 'elephant'!";
    }
  } else if (current.level === 3) {
    const pattern = /\ban\s+igloo\b/i;
    if (!pattern.test(userAnswer)) {
      grammarPass = false;
      ruleFeedback = "Grammar violation: Remember, use 'an' before 'igloo'!";
    }
  } else if (current.level === 4) {
    const pattern = /\ban\s+octopus\b/i;
    if (!pattern.test(userAnswer)) {
      grammarPass = false;
      ruleFeedback = "Grammar violation: Remember, use 'an' before 'octopus'!";
    }
  } else if (current.level === 5) {
    const pattern = /\ban\s+umbrella\b/i;
    if (!pattern.test(userAnswer)) {
      grammarPass = false;
      ruleFeedback = "Grammar violation: Remember, use 'an' before 'umbrella'!";
    }
  }

  if (!hasWord) {
    fb.style.color = "var(--status-live)";
    fb.textContent = `Error: Your sentence must contain the target word "${current.word}"!`;
    return;
  }

  if (!grammarPass) {
    fb.style.color = "var(--status-live)";
    fb.textContent = ruleFeedback;
    return;
  }

  // Advance level
  fb.style.color = "var(--status-success)";
  fb.textContent = "Correct! Sentence fits the vowel rule perfectly.";
  
  // Record Vowel achievements in DB
  const levelScore = vowelLevel * 100;
  await recordScore(levelScore);

  setTimeout(() => {
    vowelLevel++;
    if (vowelLevel > 5) {
      alert("Congratulations! You completed all Vowel Speaking levels!");
      vowelLevel = 1;
    }
    loadVowelLevel();
  }, 1500);
}
\n
// ==========================================
// MIND REFRESH GAMES LOGIC
// ==========================================

// 1. Tic Tac Toe
let tttBoard = ['', '', '', '', '', '', '', '', ''];
let tttPlayer = 'X';
let tttActive = true;

function initTTT() {
    const board = document.getElementById('ttt-board');
    if (!board) return;
    board.innerHTML = '';
    tttBoard.forEach((cell, index) => {
        const div = document.createElement('div');
        div.style.cssText = 'width: 45px; height: 45px; background: var(--bg-secondary); display: flex; align-items: center; justify-content: center; font-size: 1.5rem; cursor: pointer; border-radius: 4px;';
        div.textContent = cell;
        div.onclick = () => playTTT(index, div);
        board.appendChild(div);
    });
}

function playTTT(index, div) {
    if (tttBoard[index] !== '' || !tttActive) return;
    tttBoard[index] = tttPlayer;
    div.textContent = tttPlayer;
    if (checkTTTWin()) {
        document.getElementById('ttt-status').textContent = `Player ${tttPlayer} Wins!`;
        tttActive = false;
        return;
    }
    if (!tttBoard.includes('')) {
        document.getElementById('ttt-status').textContent = 'Draw!';
        tttActive = false;
        return;
    }
    tttPlayer = tttPlayer === 'X' ? 'O' : 'X';
    document.getElementById('ttt-status').textContent = `Your turn (${tttPlayer})`;
}

function checkTTTWin() {
    const wins = [
        [0,1,2], [3,4,5], [6,7,8], // rows
        [0,3,6], [1,4,7], [2,5,8], // cols
        [0,4,8], [2,4,6]           // diagonals
    ];
    return wins.some(comb => tttBoard[comb[0]] !== '' && tttBoard[comb[0]] === tttBoard[comb[1]] && tttBoard[comb[1]] === tttBoard[comb[2]]);
}

function resetTTT() {
    tttBoard = ['', '', '', '', '', '', '', '', ''];
    tttPlayer = 'X';
    tttActive = true;
    document.getElementById('ttt-status').textContent = `Your turn (X)`;
    initTTT();
}

// 2. Memory Match
const memorySymbols = ['🍎', '🍎', '🚀', '🚀', '⭐', '⭐', '🎸', '🎸'];
let memoryCards = [];
let memoryFlipped = [];
let memoryMatched = 0;

function initMemory() {
    const board = document.getElementById('memory-board');
    if (!board) return;
    board.innerHTML = '';
    memoryCards = [...memorySymbols].sort(() => Math.random() - 0.5);
    memoryFlipped = [];
    memoryMatched = 0;
    document.getElementById('memory-status').textContent = 'Find the matching pairs!';
    
    memoryCards.forEach((symbol, index) => {
        const btn = document.createElement('button');
        btn.style.cssText = 'width: 45px; height: 45px; font-size: 1.5rem; border: none; border-radius: 4px; cursor: pointer; background: var(--bg-secondary);';
        btn.dataset.symbol = symbol;
        btn.dataset.index = index;
        btn.onclick = () => flipMemory(btn);
        board.appendChild(btn);
    });
}

function flipMemory(btn) {
    if (memoryFlipped.length === 2 || btn.textContent !== '') return;
    btn.textContent = btn.dataset.symbol;
    btn.style.background = 'var(--brand-primary)';
    memoryFlipped.push(btn);
    
    if (memoryFlipped.length === 2) {
        setTimeout(checkMemoryMatch, 800);
    }
}

function checkMemoryMatch() {
    const [btn1, btn2] = memoryFlipped;
    if (btn1.dataset.symbol === btn2.dataset.symbol) {
        memoryMatched += 2;
        if (memoryMatched === memoryCards.length) {
            document.getElementById('memory-status').textContent = 'You found them all! 🎉';
        }
    } else {
        btn1.textContent = '';
        btn1.style.background = 'var(--bg-secondary)';
        btn2.textContent = '';
        btn2.style.background = 'var(--bg-secondary)';
    }
    memoryFlipped = [];
}

// 3. Rock Paper Scissors
function playRPS(playerChoice) {
    const choices = ['Rock', 'Paper', 'Scissors'];
    const compChoice = choices[Math.floor(Math.random() * choices.length)];
    let result = '';
    
    if (playerChoice === compChoice) result = "It's a Tie!";
    else if (
        (playerChoice === 'Rock' && compChoice === 'Scissors') ||
        (playerChoice === 'Paper' && compChoice === 'Rock') ||
        (playerChoice === 'Scissors' && compChoice === 'Paper')
    ) {
        result = "You Win! 🎉";
    } else {
        result = "You Lose! 😢";
    }
    
    document.getElementById('rps-status').innerHTML = `You: ${playerChoice}<br>Comp: ${compChoice}<br><b>${result}</b>`;
}

// 4. Guess the Number
let guessTarget = Math.floor(Math.random() * 100) + 1;

function checkGuess() {
    const input = document.getElementById('guess-input');
    const status = document.getElementById('guess-status');
    const guess = parseInt(input.value);
    
    if (isNaN(guess)) {
        status.textContent = 'Please enter a valid number.';
        return;
    }
    
    if (guess < guessTarget) status.textContent = 'Too Low! Try a higher number.';
    else if (guess > guessTarget) status.textContent = 'Too High! Try a lower number.';
    else status.textContent = 'Correct! 🎉 You guessed it!';
}

function resetGuess() {
    guessTarget = Math.floor(Math.random() * 100) + 1;
    document.getElementById('guess-input').value = '';
    document.getElementById('guess-status').textContent = 'I have a new number in mind.';
}

// 5. Word Scramble
const scrambleWords = ['JAVASCRIPT', 'HTML', 'DEVELOPER', 'SOFTWARE', 'NETWORK', 'SERVER'];
let currentScramble = '';

function newScramble() {
    const word = scrambleWords[Math.floor(Math.random() * scrambleWords.length)];
    currentScramble = word;
    const scrambled = word.split('').sort(() => Math.random() - 0.5).join('');
    document.getElementById('scramble-word').textContent = scrambled;
    document.getElementById('scramble-input').value = '';
    document.getElementById('scramble-status').textContent = '';
}

function checkScramble() {
    const input = document.getElementById('scramble-input').value.toUpperCase();
    const status = document.getElementById('scramble-status');
    if (input === currentScramble) status.textContent = 'Correct! Great job! 🎉';
    else status.textContent = 'Incorrect, try again.';
}

// 6. Math Quiz
let mathAnswer = 0;

function newMath() {
    const a = Math.floor(Math.random() * 20) + 1;
    const b = Math.floor(Math.random() * 20) + 1;
    const isAdd = Math.random() > 0.5;
    
    if (isAdd) {
        document.getElementById('math-question').textContent = `${a} + ${b} = ?`;
        mathAnswer = a + b;
    } else {
        document.getElementById('math-question').textContent = `${Math.max(a, b)} - ${Math.min(a, b)} = ?`;
        mathAnswer = Math.max(a, b) - Math.min(a, b);
    }
    document.getElementById('math-input').value = '';
    document.getElementById('math-status').textContent = '';
}

function checkMath() {
    const input = parseInt(document.getElementById('math-input').value);
    const status = document.getElementById('math-status');
    if (input === mathAnswer) status.textContent = 'Correct! You are a genius! 🎉';
    else status.textContent = 'Wrong answer, keep trying.';
}

// 7. Memory Colors (Simon Says Lite)
let colorSequence = [];
let playerSequence = [];

function startColors() {
    colorSequence = [];
    playerSequence = [];
    nextColor();
}

function nextColor() {
    const colors = ['red', 'blue', 'green', 'yellow'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    colorSequence.push(color);
    playerSequence = [];
    
    document.getElementById('color-status').textContent = 'Watch the sequence...';
    
    let delay = 500;
    colorSequence.forEach((c, index) => {
        setTimeout(() => {
            const box = document.getElementById('color-box');
            box.style.background = c;
            setTimeout(() => box.style.background = 'grey', 400);
        }, delay * (index + 1));
    });
    
    setTimeout(() => {
        document.getElementById('color-status').textContent = 'Your turn! Repeat the sequence.';
    }, delay * colorSequence.length + 500);
}

function guessColor(color) {
    if (colorSequence.length === 0) return;
    
    playerSequence.push(color);
    const box = document.getElementById('color-box');
    box.style.background = color;
    setTimeout(() => box.style.background = 'grey', 200);
    
    const currentIndex = playerSequence.length - 1;
    if (playerSequence[currentIndex] !== colorSequence[currentIndex]) {
        document.getElementById('color-status').textContent = `Wrong! You reached round ${colorSequence.length}. Click Start to try again.`;
        colorSequence = [];
    } else if (playerSequence.length === colorSequence.length) {
        document.getElementById('color-status').textContent = 'Correct! Next round...';
        setTimeout(nextColor, 1000);
    }
}

// Initialize games on load
document.addEventListener('DOMContentLoaded', () => {
    initTTT();
    initMemory();
    newScramble();
    newMath();
});
