/* ================= SOZLAMALAR ================= */
const DEFAULT_SITES = []; // doimiy saytlar: { name: "Nom", url: "https://...", desc: "Tavsif" }
const AUDIO_FILE = ""; // o'z musiqangiz: "audio/music.mp3" (bo'sh bo'lsa, yumshoq kosmik musiqa chaladi)

const $ = id => document.getElementById(id);
const on = (id, fn) => { const e = $(id); if (e) e.onclick = fn; };
const esc = t => String(t).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem("pf_" + k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem("pf_" + k, JSON.stringify(v)); } catch { alert("Xotira to'ldi (rasm juda katta bo'lishi mumkin)"); } }
};
let custom = store.get("sites", []);
let cfg = Object.assign({ title: "Mening saytlarim", pass: "admin123", img: "" }, store.get("cfg", {}));
let pref = { vol: +(localStorage.getItem("pf_vol") || 0.5), muted: localStorage.getItem("pf_muted") === "1" };
let users = store.get("users", []);
const sites = () => [...DEFAULT_SITES.map(s => ({...s, builtin: true})), ...custom.map((s, i) => ({...s, idx: i}))];
const saveAll = () => { store.set("sites", custom); store.set("cfg", cfg); localStorage.setItem("pf_muted", pref.muted ? "1" : ""); };
const saveUsers = () => store.set("users", users);

/* ================= AUDIO: yumshoq pad + qo'ng'iroqcha ================= */
let ac, master, bus, started = false, music;
const CHORDS = [ // Dmaj7 → Bm9 → Gmaj7 → A6
  [146.8, 220, 277.2, 370], [123.5, 185, 220, 293.7], [98, 146.8, 185, 246.9], [110, 164.8, 220, 277.2]
];
const PENTA = [587.3, 659.3, 740, 880, 987.8, 1174.7]; // D major pentatonika

function startAudio() {
  if (started) return; started = true;
  if (AUDIO_FILE) { music = new Audio(AUDIO_FILE); music.loop = true; applyVol(); music.play().catch(() => {}); return; }
  ac = new (window.AudioContext || window.webkitAudioContext)();
  master = ac.createGain(); master.connect(ac.destination);
  bus = ac.createGain(); bus.gain.value = 0.9;
  const dry = ac.createGain(); dry.gain.value = 0.55;
  const wet = ac.createGain(); wet.gain.value = 0.6;
  const len = ac.sampleRate * 3.5, ir = ac.createBuffer(2, len, ac.sampleRate); // soxta reverb
  for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.8); }
  const rev = ac.createConvolver(); rev.buffer = ir;
  bus.connect(dry); bus.connect(rev); rev.connect(wet); dry.connect(master); wet.connect(master);
  applyVol();
  let n = 0;
  const chord = () => { padChord(CHORDS[n++ % CHORDS.length]); };
  chord(); setInterval(chord, 8000);
  const bellLoop = () => { if (!document.hidden) bell(PENTA[Math.floor(Math.random() * PENTA.length)], 0.05, 3); setTimeout(bellLoop, 3500 + Math.random() * 4500); };
  setTimeout(bellLoop, 2500);
  document.addEventListener("visibilitychange", () => document.hidden ? ac.suspend() : ac.resume());
}
function padChord(freqs) {
  const t = ac.currentTime, lp = ac.createBiquadFilter();
  lp.type = "lowpass"; lp.frequency.value = 1100; lp.connect(bus);
  freqs.forEach(f => [-4, 4].forEach(det => {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = "sine"; o.frequency.value = f; o.detune.value = det;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.045, t + 3);   // sekin kirib keladi
    g.gain.linearRampToValueAtTime(0.0001, t + 9.5); // sekin so'nadi
    o.connect(g); g.connect(lp); o.start(t); o.stop(t + 10);
  }));
}
function bell(f, vol = 0.12, dur = 2) {
  if (!ac || pref.muted) return;
  const t = ac.currentTime;
  [[1, 1], [2.76, 0.25], [5.4, 0.08]].forEach(([m, a]) => {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = "sine"; o.frequency.value = f * m;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol * a, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur / m);
    o.connect(g); g.connect(bus); o.start(t); o.stop(t + dur);
  });
}
function applyVol() {
  const v = pref.muted ? 0 : pref.vol;
  if (master) master.gain.value = v;
  if (music) music.volume = v;
  $("bAudio").textContent = pref.muted ? "🔇" : "🔊";
}
const tap = () => bell(PENTA[Math.floor(Math.random() * 4)], 0.14, 1.6);
const soft = () => bell(PENTA[Math.floor(Math.random() * 6)], 0.05, 1);
addEventListener("pointerdown", startAudio, { once: true });
$("bAudio").onclick = () => { startAudio(); pref.muted = !pref.muted; saveAll(); applyVol(); tap(); };

/* ================= MARKAZ RASMI ================= */
function applyCore() {
  const c = $("core"), im = $("coreImg");
  if (cfg.img) { im.src = cfg.img; c.classList.add("has"); } else { im.removeAttribute("src"); c.classList.remove("has"); }
}
function fitImage(file, cb) {
  const r = new FileReader();
  r.onload = () => {
    const im = new Image();
    im.onload = () => {
      const S = 256, c = document.createElement("canvas"); c.width = c.height = S;
      const m = Math.min(im.width, im.height);
      c.getContext("2d").drawImage(im, (im.width - m) / 2, (im.height - m) / 2, m, m, 0, 0, S, S);
      cb(c.toDataURL("image/jpeg", 0.88));
    };
    im.src = r.result;
  };
  r.readAsDataURL(file);
}

/* ================= ORBITALAR ================= */
let planets = [];
function render() {
  $("title").textContent = cfg.title; applyCore();
  const box = $("orbits"); box.innerHTML = ""; planets = [];
  const list = sites(), n = list.length;
  const maxR = Math.max(90, Math.min(innerWidth / 2 - 22, innerHeight / 2 - 95));
  const minR = Math.min(115, maxR * 0.6);
  const step = n > 1 ? Math.min(55, (maxR - minR) / (n - 1)) : 0;
  list.forEach((s, i) => {
    const r = Math.min(maxR, minR + i * step);
    const ring = document.createElement("div"); ring.className = "ring";
    ring.style.width = ring.style.height = r * 2 + "px"; box.appendChild(ring);
    const p = document.createElement("button"); p.className = "planet";
    p.innerHTML = `<span class="lbl">${esc(s.name)}</span>`;
    p.onclick = () => { tap(); openInfo(s, p); };
    p.onmouseenter = soft;
    box.appendChild(p);
    planets.push({ el: p, r, a: i * 2.1, v: (0.0035 / (1 + i * 0.35)) * (i % 2 ? -1 : 1) });
  });
  $("chips").innerHTML = "";
  list.forEach((s, i) => {
    const b = document.createElement("button"); b.textContent = s.name;
    b.onclick = () => { tap(); openInfo(s, planets[i].el); };
    $("chips").appendChild(b);
  });
}
function loop() {
  for (const p of planets) {
    p.a += p.v;
    p.el.style.left = Math.cos(p.a) * p.r + "px";
    p.el.style.top = Math.sin(p.a) * p.r + "px";
  }
  requestAnimationFrame(loop);
}
function openInfo(s, el) {
  document.querySelectorAll(".planet.active").forEach(x => x.classList.remove("active"));
  el && el.classList.add("active");
  $("info").innerHTML = `<h3>${esc(s.name)}</h3><p>${esc(s.desc || "Tavsif yo'q")}</p>
    <div class="url">${esc(s.url)}</div>
    <a class="btn" href="${esc(s.url)}" target="_blank" rel="noopener">Ochish</a>`;
  $("panel").classList.add("open");
  track(s.name);
}
document.querySelectorAll("[data-close]").forEach(b => b.onclick = () => $(b.dataset.close).classList.remove("open"));

/* ================= RO'YXATDAN O'TISH (brauzerda saqlanadi) ================= */
let me = localStorage.getItem("pf_me");
function devInfo() {
  const ua = navigator.userAgent;
  const browser = /Edg/.test(ua) ? "Edge" : /OPR/.test(ua) ? "Opera" : /Chrome|CriOS/.test(ua) ? "Chrome" : /Firefox/.test(ua) ? "Firefox" : /Safari/.test(ua) ? "Safari" : "Boshqa";
  return { dev: /Mobi|Android|iPhone/.test(ua) ? "Telefon" : "Kompyuter", browser };
}
function boot() {
  const u = users.find(x => x.key === me);
  if (u) { u.last = Date.now(); u.logins++; saveUsers(); $("auth").classList.remove("show"); render(); }
  else showAuth();
}
function showAuth() {
  $("auth").classList.add("show");
  $("authBox").innerHTML = `<h2>${esc(cfg.title)}</h2>
    <p class="note">Davom etish uchun ma'lumotlaringizni kiriting</p>
    <input id="rName" placeholder="Ism familiya" autocomplete="name">
    <input id="rContact" placeholder="Telefon yoki email" autocomplete="username">
    <p class="err" id="rErr"></p>
    <button class="btn" id="rGo">Kirish</button>`;
  const go = () => {
    const name = $("rName").value.trim(), c = $("rContact").value.trim();
    if (name.length < 2 || c.length < 5) { $("rErr").textContent = "Ism va telefon/email kiriting"; return; }
    const key = c.toLowerCase();
    let u = users.find(x => x.key === key);
    if (u) { u.last = Date.now(); u.logins++; }
    else { u = { key, name, contact: c, created: Date.now(), last: Date.now(), logins: 1, ...devInfo(), opens: {} }; users.unshift(u); }
    saveUsers(); me = key; localStorage.setItem("pf_me", key);
    $("auth").classList.remove("show"); render();
  };
  on("rGo", go); $("rContact").onkeydown = e => { if (e.key === "Enter") go(); };
}
const track = name => { const u = users.find(x => x.key === me); if (u) { u.opens[name] = (u.opens[name] || 0) + 1; saveUsers(); } };

/* ================= BOSHQARUV PANELI ================= */
let authed = false, tab = "main";
const fmt = t => new Date(t).toLocaleString("uz-UZ");
function renderAdmin() {
  const b = $("adminBody");
  if (!authed) {
    b.innerHTML = `<input id="pw" type="password" placeholder="Admin paroli (boshlang'ich: admin123)"><p class="err" id="aErr"></p><button class="btn" id="login">Kirish</button>`;
    const go = () => { if ($("pw").value === cfg.pass) { authed = true; renderAdmin(); } else $("aErr").textContent = "Parol noto'g'ri"; };
    on("login", go); $("pw").onkeydown = e => { if (e.key === "Enter") go(); };
    return;
  }
  const tabs = `<div class="tabs"><button data-tab="main" class="${tab === "main" ? "on" : ""}">Boshqaruv</button><button data-tab="users" class="${tab === "users" ? "on" : ""}">Kuzatuvchilar</button></div>`;
  if (tab === "users") {
    const today = new Date().toDateString();
    b.innerHTML = tabs + `<div class="stats">
        <div class="stat"><b>${users.length}</b><span>Ro'yxatdan o'tgan</span></div>
        <div class="stat"><b>${users.filter(u => new Date(u.last).toDateString() === today).length}</b><span>Bugun kirgan</span></div>
        <div class="stat"><b>${users.filter(u => u.dev === "Telefon").length}</b><span>Telefondan</span></div></div>
      <h3>Foydalanuvchilar</h3>
      ${users.map((u, i) => `<div class="user"><b>${esc(u.name)}</b><span>${esc(u.contact)}</span>
        <small>Ro'yxatdan: ${fmt(u.created)} · Oxirgi kirish: ${fmt(u.last)} · Kirishlar: ${u.logins} · ${esc(u.dev)}, ${esc(u.browser)}</small>
        <small>Ochgan saytlari: ${Object.entries(u.opens || {}).map(([k, v]) => esc(k) + " ×" + v).join(", ") || "—"}</small>
        <button class="btn red" data-du="${i}">O'chirish</button></div>`).join("") || "<p class='note'>Hali hech kim ro'yxatdan o'tmagan</p>"}
      <p class="note">Ma'lumot faqat shu brauzerda saqlanadi.</p>
      <button class="btn red" id="aOut">Admindan chiqish</button>`;
    b.querySelectorAll("[data-du]").forEach(x => x.onclick = () => { if (confirm("O'chirilsinmi?")) { users.splice(+x.dataset.du, 1); saveUsers(); renderAdmin(); } });
  } else {
    b.innerHTML = tabs + `
      <h3>Sayt sarlavhasi</h3><input id="aTitle" value="${esc(cfg.title)}">
      <h3>Markaz rasmi</h3>
      <label class="btn ghost">Rasm tanlash<input id="aImg" type="file" accept="image/*" hidden></label>
      <button class="btn red" id="aImgDel">Olib tashlash</button>
      <input id="aImgUrl" placeholder="yoki rasm havolasi (https://...)" value="${cfg.img && !cfg.img.startsWith("data:") ? esc(cfg.img) : ""}">
      <h3>Ovoz balandligi</h3><input id="aVol" type="range" min="0" max="1" step="0.05" value="${pref.vol}">
      <h3>Saytlar</h3>
      ${sites().map(s => `<div class="item"><span>${esc(s.name)}</span>${s.builtin ? "<small>asosiy</small>" :
        `<button data-up="${s.idx}">↑</button><button data-ed="${s.idx}">✎</button><button data-del="${s.idx}">✕</button>`}</div>`).join("") || "<p class='note'>Hali sayt yo'q</p>"}
      <h3 id="fh">Yangi sayt qo'shish</h3>
      <input id="aName" placeholder="Sayt nomi"><input id="aUrl" placeholder="Havola (https://...)"><textarea id="aDesc" rows="2" placeholder="Tavsif"></textarea>
      <button class="btn" id="aAdd">Qo'shish</button>
      <h3>Boshqa</h3>
      <button class="btn ghost" id="aExp">Eksport</button>
      <label class="btn ghost">Import<input id="aImp" type="file" accept=".json" hidden></label>
      <button class="btn ghost" id="aPass">Parolni o'zgartirish</button>
      <button class="btn red" id="aOut">Admindan chiqish</button>`;
    let editing = null;
    const done = () => { saveAll(); render(); renderAdmin(); };
    $("aTitle").onchange = e => { cfg.title = e.target.value; saveAll(); render(); };
    $("aVol").oninput = e => { pref.vol = +e.target.value; localStorage.setItem("pf_vol", pref.vol); applyVol(); };
    $("aVol").onchange = tap;
    $("aImg").onchange = e => e.target.files[0] && fitImage(e.target.files[0], url => { cfg.img = url; done(); });
    $("aImgUrl").onchange = e => { cfg.img = e.target.value.trim(); saveAll(); render(); };
    on("aImgDel", () => { cfg.img = ""; done(); });
    on("aAdd", () => {
      const o = { name: $("aName").value.trim(), url: $("aUrl").value.trim(), desc: $("aDesc").value.trim() };
      if (!o.name || !o.url) return alert("Nom va havola kerak");
      editing === null ? custom.push(o) : (custom[editing] = o);
      tap(); done();
    });
    b.querySelectorAll("[data-del]").forEach(x => x.onclick = () => { if (confirm("O'chirilsinmi?")) { custom.splice(+x.dataset.del, 1); done(); } });
    b.querySelectorAll("[data-up]").forEach(x => x.onclick = () => { const i = +x.dataset.up; if (i > 0) { [custom[i - 1], custom[i]] = [custom[i], custom[i - 1]]; done(); } });
    b.querySelectorAll("[data-ed]").forEach(x => x.onclick = () => {
      editing = +x.dataset.ed; const s = custom[editing];
      $("aName").value = s.name; $("aUrl").value = s.url; $("aDesc").value = s.desc; $("aAdd").textContent = "Saqlash"; $("fh").textContent = "Tahrirlash";
      $("aName").scrollIntoView({ behavior: "smooth", block: "center" });
    });
    on("aExp", () => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify({ custom, cfg: { title: cfg.title, img: cfg.img } }, null, 2)])); a.download = "portfolio.json"; a.click(); });
    $("aImp").onchange = e => { const r = new FileReader(); r.onload = () => { try { const j = JSON.parse(r.result); custom = j.custom || []; cfg.title = (j.cfg && j.cfg.title) || cfg.title; cfg.img = (j.cfg && j.cfg.img) || ""; done(); } catch { alert("Fayl xato"); } }; r.readAsText(e.target.files[0]); };
    on("aPass", () => { const p = prompt("Yangi parol:"); if (p) { cfg.pass = p; saveAll(); } });
  }
  b.querySelectorAll("[data-tab]").forEach(x => x.onclick = () => { tab = x.dataset.tab; renderAdmin(); });
  on("aOut", () => { authed = false; renderAdmin(); });
}
$("bAdmin").onclick = () => { renderAdmin(); $("adminWin").classList.toggle("open"); tap(); };

/* ================= YULDUZLAR ================= */
const cv = $("stars"), cx = cv.getContext("2d"); let stars = [];
function initStars() {
  cv.width = innerWidth; cv.height = innerHeight;
  stars = Array.from({ length: innerWidth < 600 ? 120 : 220 }, () => ({ x: Math.random() * cv.width, y: Math.random() * cv.height, r: Math.random() * 1.3, a: Math.random() * 6, v: 0.005 + Math.random() * 0.015 }));
}
function twinkle() {
  cx.clearRect(0, 0, cv.width, cv.height);
  for (const s of stars) { s.a += s.v; cx.fillStyle = `rgba(255,236,190,${0.3 + Math.abs(Math.sin(s.a)) * 0.7})`; cx.beginPath(); cx.arc(s.x, s.y, s.r, 0, 7); cx.fill(); }
  requestAnimationFrame(twinkle);
}
addEventListener("resize", () => { initStars(); render(); });

initStars(); twinkle(); render(); loop(); applyVol(); boot();