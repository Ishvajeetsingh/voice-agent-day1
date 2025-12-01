// app.js - complete fixed version with waveform control + robust voice handling

// ui elements
const nameInput = document.getElementById("name");
const startBtn = document.getElementById("start-btn");
const stopBtn = document.getElementById("stop-btn");
const hostBox = document.getElementById("host-box");
const hostGreeting = document.getElementById("host-greeting");
const scenarioArea = document.getElementById("scenario-area");
const listenBtn = document.getElementById("listen-btn");
const endSceneBtn = document.getElementById("end-scene-btn");
const skipBtn = document.getElementById("skip-btn");
const transcriptDiv = document.getElementById("transcript");
const scoreList = document.getElementById("score-list");
const summaryDiv = document.getElementById("summary");
const saveBtn = document.getElementById("save-btn");
const sessionIdSpan = document.getElementById("session-id");
const maxRoundsSelect = document.getElementById("max_rounds");

let session = {
  session_id: generateId(),
  player_name: "",
  current_round: 0,
  max_rounds: 3,
  rounds: [],
  phase: "intro"
};

sessionIdSpan.textContent = session.session_id;

function generateId() {
  return 's_' + Math.random().toString(36).slice(2,9);
}

/* ---------- scenarios + reactions ---------- */

const SCENARIOS = [
  "you are a barista who has to tell a customer that their latte is actually a portal to another dimension.",
  "you are a time-travelling tour guide explaining smartphones to someone from the 1800s.",
  "you are a waiter informing a customer that their order escaped the kitchen.",
  "you are returning a cursed object to a skeptical shop owner.",
  "you are a spaceship captain negotiating parking rules with an asteroid.",
  "you are a proud parent bragging about your child's ability to talk to plants."
];

const REACTIONS = {
  supportive: [
    "that was delightful — the moment about {bit} really sold it!",
    "excellent energy! i loved how you played with {bit}.",
    "strong character work — you leaned into {bit} nicely!"
  ],
  neutral: [
    "nice attempt — maybe expand on {bit} next time.",
    "good start — some beats around {bit} could be richer.",
    "decent flow, but i'd love more commitment to {bit}."
  ],
  critical: [
    "honestly a bit rushed — slow down and develop {bit} more.",
    "some great seeds, but the logic breaks around {bit}.",
    "you can push the character more — especially at {bit}."
  ]
};

const TAGS = [
  "bold", "story-focused", "character-focused", "absurdist", "emotional",
  "clever callback", "physicality"
];

function pickRandom(a) { return a[Math.floor(Math.random()*a.length)]; }

/* ---------- waveform element helpers ---------- */

let waveformEl = null;

function ensureWaveform() {
  if (waveformEl) return waveformEl;
  // create small waveform container under hostGreeting if not present
  waveformEl = document.querySelector(".waveform");
  if (!waveformEl && hostBox) {
    waveformEl = document.createElement("div");
    waveformEl.className = "waveform";
    // create 5 bars
    for (let i=0;i<5;i++){
      const b = document.createElement("div");
      waveformEl.appendChild(b);
    }
    // insert after hostGreeting
    hostGreeting.insertAdjacentElement("afterend", waveformEl);
  }
  return waveformEl;
}

function waveformOn() {
  const w = ensureWaveform();
  if (w) w.classList.add("active");
}

function waveformOff() {
  const w = ensureWaveform();
  if (w) w.classList.remove("active");
}

/* ---------- speech recognition ---------- */

let recognition = null;
let listening = false;
let interimTranscript = "";
let finalTranscript = "";

// will hold cached voices once available
let cachedVoices = [];

function refreshVoices() {
  cachedVoices = speechSynthesis.getVoices() || [];
}
refreshVoices();
window.speechSynthesis.onvoiceschanged = () => {
  refreshVoices();
};

function setupSpeech() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    transcriptDiv.innerHTML = "<span class='muted'>speech recognition unsupported</span>";
    listenBtn.disabled = true;
    return;
  }

  // if recognition already exists, remove handlers
  if (recognition) {
    try {
      recognition.onresult = null;
      recognition.onend = null;
      recognition.onerror = null;
      recognition = null;
    } catch(e){}
  }

  recognition = new SR();
  recognition.lang = "en-US";
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  recognition.onresult = (e) => {
    interimTranscript = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const res = e.results[i];
      if (res.isFinal) {
        finalTranscript += (res[0].transcript || "") + " ";
      } else {
        interimTranscript += (res[0].transcript || "");
      }
    }
    renderTranscript();

    const lower = finalTranscript.toLowerCase();

    // handle STOP GAME anytime
    if (lower.includes("stop game")) {
      finalTranscript = "";
      interimTranscript = "";
      confirmStop();
      return;
    }

    // special: during intro, first speech = name (accept only first phrase)
    if (session.phase === "awaiting_name" && finalTranscript.trim().length > 0) {
      // use first reasonably short phrase as name (max 3 words)
      const candidate = finalTranscript.trim().split(/\s+/).slice(0,3).join(" ");
      session.player_name = candidate;
      finalTranscript = "";
      interimTranscript = "";
      startRound();
      return;
    }

    // normal improv: detect "end scene"
    if (lower.includes("end scene")) {
      onEndScene();
    }
  };

  recognition.onend = () => {
    listening = false;
    listenBtn.textContent = "listen / start scene";
    listenBtn.classList.remove("listening");
  };

  recognition.onerror = (err) => {
    console.warn("recognition error", err);
    listening = false;
    listenBtn.textContent = "listen / start scene";
    listenBtn.classList.remove("listening");
  };
}

/* ---------- UI events ---------- */

startBtn.onclick = () => {
  session.player_name = nameInput.value.trim() || "";
  session.max_rounds = parseInt(maxRoundsSelect.value) || 3;

  startShow();
  setupSpeech();
};

stopBtn.onclick = () => confirmStop();

listenBtn.onclick = () => {
  if (!recognition) {
    setupSpeech();
    if (!recognition) return;
  }
  if (!listening) startListening();
  else stopListening();
};

endSceneBtn.onclick = onEndScene;

skipBtn.onclick = () => {
  recordRound({scenario: currentScenario, transcript: "(skipped)", reaction: "skipped", tags:["skipped"], tone:"neutral"});
  renderScoreboard();
  setTimeout(nextRound, 300);
};

saveBtn.onclick = saveSession;

/* ---------- show flow ---------- */

function startShow() {
  startBtn.style.display = "none";
  stopBtn.style.display = "inline-block";
  hostBox.classList.remove("hidden");

  ensureWaveform(); // ensure waveform present in DOM

  const intro = `welcome to improv battle! i'm your host. quick rules — i'll give you ${session.max_rounds} short scenarios. 
for each one: i'll set the scene, you act, then say "end scene". i'll react after each one.
ready? tell me your name!`;

  session.phase = "awaiting_name";
  hostSay(intro);

  transcriptDiv.innerHTML = "<span class='muted'>say your name using the microphone.</span>";
}

/* ---------- host speaking (tts) ---------- */

/**
 * speak(text)
 * - replaces kakarot with a DBZ-like phonetic "Kack-ah-rot"
 * - picks a good male voice if available
 * - toggles waveform on/off during speech
 */
function speak(text) {
  // phonetic replacement for kakarot (dbz style)
  text = text.replace(/kakarot/gi, "Kack-ah-rot");

  // prepare utterance
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "en-US";
  utter.rate = 1.0;
  utter.pitch = 1.0;

  // ensure voices are loaded
  if (!cachedVoices || cachedVoices.length === 0) refreshVoices();

  // pick preferred male-like voice (robust)
  let maleVoice = null;
  const names = cachedVoices.map(v => (v.name || "").toLowerCase());
  maleVoice = cachedVoices.find(v => (v.name||"").toLowerCase().includes("google us english"));
  if (!maleVoice) maleVoice = cachedVoices.find(v => (v.name||"").toLowerCase().includes("david"));
  if (!maleVoice) maleVoice = cachedVoices.find(v => (v.name||"").toLowerCase().includes("daniel"));
  if (!maleVoice) maleVoice = cachedVoices.find(v => (v.name||"").toLowerCase().includes("male"));
  if (!maleVoice && cachedVoices.length>0) maleVoice = cachedVoices[0];

  if (maleVoice) utter.voice = maleVoice;

  // show waveform while host speaks
  utter.onstart = () => {
    try { waveformOn(); } catch(e){}
  };
  utter.onend = () => {
    try { waveformOff(); } catch(e){}
  };
  utter.onerror = () => {
    try { waveformOff(); } catch(e){}
  };

  // cancel any previous speech then speak
  try { speechSynthesis.cancel(); } catch(e){}
  try { speechSynthesis.speak(utter); } catch(e) {
    console.warn("tts speak failed", e);
  }
}

function hostSay(text) {
  // set host text immediately for UX
  hostGreeting.textContent = text;
  speak(text);
}

/* ---------- round system ---------- */

let currentScenario = "";

function pickScenario() {
  const used = session.rounds.map(r=>r.scenario);
  const remaining = SCENARIOS.filter(s=>!used.includes(s));
  return remaining.length ? pickRandom(remaining) : pickRandom(SCENARIOS);
}

function startRound() {
  session.phase = "awaiting_improv";
  session.current_round++;

  if (session.current_round > session.max_rounds) {
    finishShow();
    return;
  }

  currentScenario = pickScenario();
  scenarioArea.textContent = `round ${session.current_round}: ${currentScenario}`;

  finalTranscript = "";
  interimTranscript = "";
  renderTranscript();

  hostSay(`${session.player_name || "contestant"}, here we go! ${currentScenario} start whenever you're ready.`);
}

function onEndScene() {
  if (session.phase !== "awaiting_improv") return;

  stopListening();

  const userText = finalTranscript.trim() || "(no audio)";
  const analysis = analyze(userText);

  recordRound({
    scenario: currentScenario,
    transcript: userText,
    reaction: analysis.text,
    tags: analysis.tags,
    tone: analysis.tone
  });

  renderScoreboard();
  // speak reaction after a small delay for natural pacing
  setTimeout(()=> hostSay(analysis.text), 250);
  // after reaction move next
  setTimeout(nextRound, 1600);
}

function nextRound() {
  if (session.current_round >= session.max_rounds) finishShow();
  else startRound();
}

function finishShow() {
  session.phase = "done";
  const sum = summary();
  summaryDiv.textContent = sum;
  hostSay("and that's our show! " + sum);
  // reset UI states
  startBtn.style.display = "inline-block";
  stopBtn.style.display = "none";
  listenBtn.disabled = true;
  endSceneBtn.disabled = true;
}

/* ---------- reactions ---------- */

function analyze(text) {
  const words = text.split(/\s+/).filter(Boolean);
  const len = words.length;
  const bit = pickRandom(words.length ? words : ["that part"]);

  const tone = pickRandom(["supportive","neutral","critical"]);
  const template = pickRandom(REACTIONS[tone]);
  const reaction = template.replace("{bit}", bit);

  let tags = [];
  if (len > 10) tags.push("expanded");
  if (len < 8) tags.push("short");
  if (text.includes("!")) tags.push("bold");
  tags.push(pickRandom(TAGS));

  return {text: reaction, tags, tone};
}

function recordRound(r) { session.rounds.push(r); }

/* ---------- transcript + speech control ---------- */

function startListening() {
  if (!recognition) setupSpeech();
  if (!recognition) return;
  try {
    listening = true;
    finalTranscript = "";
    interimTranscript = "";
    transcriptDiv.textContent = "listening...";
    listenBtn.textContent = "listening...";
    listenBtn.classList.add("listening");
    recognition.start();
  } catch (e) {
    console.warn("recognition start error", e);
  }
}

function stopListening() {
  if (!recognition) return;
  try {
    recognition.stop();
  } catch(e){}
  listening = false;
  listenBtn.textContent = "listen / start scene";
  listenBtn.classList.remove("listening");
}

function renderTranscript() {
  transcriptDiv.innerHTML = `
    <div><strong>you:</strong> ${escape(finalTranscript)}</div>
    <div class="muted">${escape(interimTranscript)}</div>
  `;
}

function escape(t) {
  return (t||"").replace(/[&<>'"]/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;","\"":"&quot;"}[c]));
}

/* ---------- scoreboard ---------- */

function renderScoreboard() {
  scoreList.innerHTML = "";
  if (session.rounds.length === 0) {
    scoreList.innerHTML = `<p class="muted">No Rounds Yet — Start The Show.</p>`;
    return;
  }
  session.rounds.forEach((r,i)=>{
    let el = document.createElement("div");
    el.className = "round-row";
    el.innerHTML = `
      <div><strong>round ${i+1}</strong><br><span class="host-reaction">${escape(r.reaction)}</span></div>
      <div class="tags">${(r.tags||[]).slice(0,3).map(t=>`<span class="tag">${t}</span>`).join("")}</div>
    `;
    scoreList.appendChild(el);
  });
}

/* ---------- summary ---------- */

function summary() {
  if (!session.rounds.length) return "no scenes performed!";
  const allTags = session.rounds.flatMap(r=>r.tags||[]);
  const freq = {};
  allTags.forEach(t=>freq[t]=(freq[t]||0)+1);
  const entries = Object.entries(freq).sort((a,b)=>b[1]-a[1]);
  const top = entries.length ? entries[0][0] : "versatile";

  // pick favorite (longest) safely
  let fav = null;
  let maxLen = -1;
  for (const r of session.rounds) {
    const count = (r.transcript || "").split(/\s+/).filter(Boolean).length;
    if (count > maxLen) { maxLen = count; fav = r; }
  }
  const snippet = fav ? (fav.transcript || "").slice(0,60) : "";

  return `overall you came across as ${top}. standout moment: "${snippet}..."`;
}

/* ---------- save session ---------- */

async function saveSession() {
  try {
    const res = await fetch("/save_session", {
      method:"POST",
      headers:{"content-type":"application/json"},
      body: JSON.stringify({...session, summary: summary()})
    });
    const j = await res.json();
    if (j.ok) {
      sessionIdSpan.textContent = "saved: " + j.session_id;
      alert("session saved.");
    } else {
      alert("save failed");
    }
  } catch(e) {
    console.error("saveSession error", e);
    alert("save failed: " + (e.message || e));
  }
}

/* ---------- utils ---------- */

function confirmStop() {
  if (confirm("quit improv battle?")) {
    hostSay("ending early. thanks for playing!");
    summaryDiv.textContent = summary();
    session.phase = "done";
    // reset UI a bit
    startBtn.style.display = "inline-block";
    stopBtn.style.display = "none";
    listenBtn.disabled = true;
    endSceneBtn.disabled = true;
  } else {
    hostSay("cool — let's continue!");
  }
}

/* ---------- init ---------- */

(function init() {
  ensureWaveform(); // create waveform container (hidden by default) if missing
  setupSpeech();
  // ui initial states
  hostBox.classList.add("hidden");
})();
(function neonCursorTrail(){
  const MAX = 10;
  const dots = [];

  for(let i=0;i<MAX;i++){
    const d=document.createElement("div");
    d.className="cursor-dot";
    d.style.opacity = (1 - i*0.08);
    document.body.appendChild(d);
    dots.push({el:d,x:-50,y:-50});
  }

  let idx=0;
  window.addEventListener("mousemove",e=>{
    const d = dots[idx];
    d.x = e.clientX;
    d.y = e.clientY;
    d.el.style.transform = `translate(${d.x}px,${d.y}px)`;
    idx = (idx+1) % MAX;
  });

})();
