import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, addDoc, query, orderBy, limit, getDocs, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig, LEADERBOARD_COLLECTION } from "./firebase-config.js";

(() => {
  "use strict";

  const GAME_LENGTH = 60;        // seconds to survive
  const PERSONAL_BEST_KEY = "dodge60_personal_best";
  const MAX_ENTRIES = 10;

  const firebaseApp = initializeApp(firebaseConfig);
  const db = getFirestore(firebaseApp);
  const leaderboardCol = collection(db, LEADERBOARD_COLLECTION);

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const stage = document.getElementById("stage");
  const popupsEl = document.getElementById("popups");

  const scoreValEl = document.getElementById("scoreVal");
  const bestValEl = document.getElementById("bestVal");
  const timerValEl = document.getElementById("timerVal");
  const timerRing = document.getElementById("timerRing");
  const RING_CIRC = 276.46;

  const screenStart = document.getElementById("screenStart");
  const screenOver = document.getElementById("screenOver");
  const screenBoard = document.getElementById("screenBoard");
  const overStatus = document.getElementById("overStatus");
  const finalScore = document.getElementById("finalScore");
  const finalSub = document.getElementById("finalSub");
  const entryForm = document.getElementById("entryForm");
  const nameInput = document.getElementById("nameInput");
  const entryStatus = document.getElementById("entryStatus");
  const boardList = document.getElementById("boardList");

  document.getElementById("btnStart").addEventListener("click", startGame);
  document.getElementById("btnRetry").addEventListener("click", startGame);
  document.getElementById("btnShowBoard").addEventListener("click", () => openBoard(screenStart));
  document.getElementById("btnOverBoard").addEventListener("click", () => openBoard(screenOver));
  document.getElementById("btnBoardBack").addEventListener("click", closeBoard);
  document.getElementById("btnBoardRefresh").addEventListener("click", renderBoard);
  document.getElementById("btnSaveScore").addEventListener("click", saveScore);
  nameInput.addEventListener("keydown", (e) => { if (e.key === "Enter") saveScore(); });

  // ---------- canvas sizing ----------
  let W = 0, H = 0, DPR = 1;
  function resize() {
    const rect = stage.getBoundingClientRect();
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = rect.width;
    H = rect.height;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  window.addEventListener("resize", resize);
  resize();

  // ---------- state ----------
  let running = false;
  let elapsed = 0;
  let lastTime = 0;
  let score = 0;
  let grazeCount = 0;
  let spawnTimer = 0;
  let enemies = [];
  let particles = [];
  let boardReturnScreen = null;

  const player = {
    x: 0, y: 0, r: 13, hitR: 10, grazeR: 34,
    tx: 0, ty: 0, alive: true,
  };

  function resetPlayer() {
    player.x = player.tx = W / 2;
    player.y = player.ty = H * 0.75;
  }

  // ---------- input (pointer follows finger/mouse) ----------
  let pointerActive = false;
  function setPointer(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    player.tx = clientX - rect.left;
    player.ty = clientY - rect.top;
  }
  canvas.addEventListener("pointerdown", (e) => { pointerActive = true; setPointer(e.clientX, e.clientY); });
  window.addEventListener("pointermove", (e) => { if (pointerActive) setPointer(e.clientX, e.clientY); });
  window.addEventListener("pointerup", () => { pointerActive = false; });
  canvas.addEventListener("touchmove", (e) => e.preventDefault(), { passive: false });

  // ---------- difficulty curve ----------
  function spawnInterval(t) { return Math.max(260, 980 - t * 11); }   // ms between spawns
  function enemySpeed(t) { return 95 + t * 4.2; }                     // px/s
  function enemyRadius(t) { return 9 + Math.random() * 6; }

  function spawnEnemy() {
    const edge = Math.floor(Math.random() * 4); // 0 top 1 right 2 bottom 3 left
    let x, y;
    if (edge === 0) { x = Math.random() * W; y = -20; }
    else if (edge === 1) { x = W + 20; y = Math.random() * H; }
    else if (edge === 2) { x = Math.random() * W; y = H + 20; }
    else { x = -20; y = Math.random() * H; }

    // aim roughly at player with randomness so it's dodgeable, not tracking
    const spread = (Math.random() - 0.5) * 0.9;
    const angle = Math.atan2(player.y - y, player.x - x) + spread;
    const speed = enemySpeed(elapsed);

    enemies.push({
      x, y, r: enemyRadius(elapsed),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      grazed: false,
      hue: Math.random() < 0.5 ? "#ff3d81" : "#ff7a4c",
    });
  }

  // ---------- popups ----------
  function popup(text, x, y, color) {
    const el = document.createElement("div");
    el.className = "popup";
    el.textContent = text;
    el.style.left = x + "px";
    el.style.top = y + "px";
    if (color) el.style.color = color;
    popupsEl.appendChild(el);
    setTimeout(() => el.remove(), 720);
  }

  // ---------- main loop ----------
  function startGame() {
    hideAll();
    resize();
    resetPlayer();
    enemies = [];
    particles = [];
    elapsed = 0;
    score = 0;
    grazeCount = 0;
    spawnTimer = 0;
    player.alive = true;
    running = true;
    lastTime = performance.now();
    updateHud();
    requestAnimationFrame(loop);
  }

  function loop(now) {
    if (!running) return;
    let dt = (now - lastTime) / 1000;
    dt = Math.min(dt, 0.05);
    lastTime = now;
    elapsed += dt;

    update(dt);
    draw();

    if (elapsed >= GAME_LENGTH) {
      endGame(true);
      return;
    }
    if (!player.alive) {
      endGame(false);
      return;
    }
    requestAnimationFrame(loop);
  }

  function update(dt) {
    // player follows pointer smoothly, clamped inside canvas
    const ease = 1 - Math.pow(0.001, dt);
    player.x += (player.tx - player.x) * ease;
    player.y += (player.ty - player.y) * ease;
    player.x = Math.max(player.r, Math.min(W - player.r, player.x));
    player.y = Math.max(player.r, Math.min(H - player.r, player.y));

    // spawn
    spawnTimer -= dt * 1000;
    if (spawnTimer <= 0) {
      spawnEnemy();
      if (elapsed > 30 && Math.random() < 0.35) spawnEnemy();
      spawnTimer = spawnInterval(elapsed);
    }

    // enemies
    for (let i = enemies.length - 1; i >= 0; i--) {
      const en = enemies[i];
      en.x += en.vx * dt;
      en.y += en.vy * dt;

      const dx = en.x - player.x, dy = en.y - player.y;
      const dist = Math.hypot(dx, dy);

      if (dist < en.r + player.hitR) {
        player.alive = false;
      } else if (!en.grazed && dist < en.r + player.grazeR) {
        en.grazed = true;
        grazeCount++;
        score += 15;
        popup("+15 GRAZE", player.x, player.y - 30, "#ffc857");
      }

      if (en.x < -60 || en.x > W + 60 || en.y < -60 || en.y > H + 60) {
        enemies.splice(i, 1);
      }
    }

    // base score from survival time
    score = Math.floor(elapsed * 10) + grazeCount * 15;

    updateHud();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    // faint grid backdrop
    ctx.strokeStyle = "rgba(124,133,179,0.07)";
    ctx.lineWidth = 1;
    const gap = 32;
    for (let x = 0; x < W; x += gap) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += gap) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    // enemies
    for (const en of enemies) {
      ctx.beginPath();
      ctx.arc(en.x, en.y, en.r, 0, Math.PI * 2);
      ctx.fillStyle = en.hue;
      ctx.shadowColor = en.hue;
      ctx.shadowBlur = 14;
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    // player graze ring
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.grazeR, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(76,243,255,0.18)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // player
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.r, 0, Math.PI * 2);
    ctx.fillStyle = "#4cf3ff";
    ctx.shadowColor = "#4cf3ff";
    ctx.shadowBlur = 18;
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  function updateHud() {
    scoreValEl.textContent = score;
    const remaining = Math.max(0, GAME_LENGTH - elapsed);
    timerValEl.textContent = Math.ceil(remaining);
    const frac = remaining / GAME_LENGTH;
    timerRing.style.strokeDashoffset = String(RING_CIRC * (1 - frac));
    timerRing.style.stroke = frac < 0.2 ? "#ff3d81" : (frac < 0.5 ? "#ffc857" : "#4cf3ff");
    bestValEl.textContent = getPersonalBest();
  }

  function endGame(survived) {
    running = false;
    overStatus.textContent = survived ? "SELAMAT — KAMU BERTAHAN!" : "KENA MUSUH";
    let finalScoreVal = score;
    if (survived) {
      finalScoreVal += 200; // survivor bonus
      popup("+200 SURVIVOR", player.x, player.y - 30, "#4cf3ff");
    }
    finalScore.textContent = finalScoreVal;
    finalSub.textContent = `Waktu bertahan: ${elapsed.toFixed(1)}s  ·  Graze: ${grazeCount}`;

    nameInput.value = "";
    entryStatus.textContent = "";
    entryForm.classList.remove("hidden");
    entryForm.dataset.pendingScore = finalScoreVal;
    entryForm.dataset.pendingSurvived = survived ? "1" : "0";
    entryForm.dataset.pendingTime = elapsed.toFixed(1);

    setPersonalBest(finalScoreVal);
    show(screenOver);
  }

  // ---------- personal best (local, per-device) ----------
  function getPersonalBest() {
    try { return Number(localStorage.getItem(PERSONAL_BEST_KEY) || 0); } catch (e) { return 0; }
  }
  function setPersonalBest(s) {
    try {
      if (s > getPersonalBest()) localStorage.setItem(PERSONAL_BEST_KEY, String(s));
    } catch (e) {}
  }

  // ---------- global leaderboard (Firestore) ----------
  async function saveScore() {
    const name = (nameInput.value.trim() || "PLAYER").toUpperCase().slice(0, 12);
    const scoreVal = Number(entryForm.dataset.pendingScore || 0);
    const survived = entryForm.dataset.pendingSurvived === "1";
    const timeVal = entryForm.dataset.pendingTime;

    entryStatus.textContent = "Mengirim...";
    entryStatus.className = "entry-status";
    try {
      await addDoc(leaderboardCol, {
        name, score: scoreVal, time: timeVal, survived,
        date: new Date().toLocaleDateString("id-ID"),
        createdAt: serverTimestamp(),
      });
      entryForm.classList.add("hidden");
    } catch (e) {
      console.error(e);
      entryStatus.textContent = "Gagal mengirim skor. Cek koneksi & konfigurasi Firebase.";
      entryStatus.className = "entry-status error";
    }
  }

  async function renderBoard() {
    boardList.innerHTML = `<li class="empty">Memuat leaderboard...</li>`;
    try {
      const q = query(leaderboardCol, orderBy("score", "desc"), limit(MAX_ENTRIES));
      const snap = await getDocs(q);
      boardList.innerHTML = "";
      if (snap.empty) {
        const li = document.createElement("li");
        li.className = "empty";
        li.textContent = "Belum ada skor. Jadilah yang pertama!";
        boardList.appendChild(li);
        return;
      }
      let i = 0;
      snap.forEach((doc) => {
        i++;
        const entry = doc.data();
        const li = document.createElement("li");
        li.innerHTML = `
          <span class="rank">${i}</span>
          <span class="name">${escapeHtml(entry.name || "PLAYER")}${entry.survived ? " ★" : ""}</span>
          <span class="pts">${entry.score}</span>
        `;
        boardList.appendChild(li);
      });
    } catch (e) {
      console.error(e);
      boardList.innerHTML = `<li class="empty">Gagal memuat leaderboard. Cek koneksi & konfigurasi Firebase.</li>`;
    }
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  // ---------- screen helpers ----------
  function hideAll() {
    screenStart.classList.add("hidden");
    screenOver.classList.add("hidden");
    screenBoard.classList.add("hidden");
  }
  function show(el) { hideAll(); el.classList.remove("hidden"); }
  function openBoard(returnScreen) {
    boardReturnScreen = returnScreen;
    renderBoard();
    show(screenBoard);
  }
  function closeBoard() {
    show(boardReturnScreen || screenStart);
  }

  // ---------- init ----------
  bestValEl.textContent = getPersonalBest();
})();