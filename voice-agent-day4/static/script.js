const conceptSelect = document.getElementById("conceptSelect")
const learnBtn = document.getElementById("learnBtn")
const quizBtn = document.getElementById("quizBtn")
const teachBtn = document.getElementById("teachBtn")
const startMic = document.getElementById("startMic")
const stopMic = document.getElementById("stopMic")
const modeLabel = document.getElementById("modeLabel")
const transcript = document.getElementById("transcript")
const assistant = document.getElementById("assistant")
const conceptBox = document.getElementById("conceptBox")
const feedbackBox = document.getElementById("feedbackBox")
const modeChip = document.getElementById("modeChip")

let recognition = null
let currentMode = null
let listening = false
let speaking = false
let speechLock = false

// UI
function setHtmlMode(mode){
  document.documentElement.setAttribute("data-mode", mode || "idle")
  modeChip.textContent = "Mode: " + (mode || "idle")
  modeLabel.textContent = "Mode: " + (mode || "idle")
  document.querySelectorAll(".mode-btn").forEach(b => b.classList.remove("active"))
  const btn = document.querySelector(`.mode-btn[data-mode="${mode}"]`)
  if(btn) btn.classList.add("active")
}

// ---------------------------
// TTS FIXED + VOICE SWITCHING
// ---------------------------
async function playTTS(text, voice = "matthew") {
  try {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text, voice })
    });

    const j = await res.json();
    if (!j.ok || !j.url) {
      console.log("TTS failed:", j);
      return;
    }

    const audio = new Audio(j.url);
    await audio.play();

  } catch (err) {
    console.log("fallback TTS:", err);

    const u = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();

    if (voice === "alicia") {
      u.voice = voices.find(v => v.name.includes("Female")) || voices[0];
      u.pitch = 1.1;
    } else if (voice === "ken") {
      u.voice = voices.find(v => v.name.includes("Male")) || voices[0];
      u.pitch = 0.9;
    }

    window.speechSynthesis.speak(u);
  }
}

// fuzzy mode detect
function fuzzyModeFromText(txt){
  txt = txt.toLowerCase()
  if(txt.includes("learn")) return "learn"
  if(txt.includes("quiz") || txt.includes("question")) return "quiz"
  if(txt.includes("teach") || txt.includes("explain")) return "teach_back"
  return null
}

// speech rec
function createRecognition(){
  const R = window.SpeechRecognition || window.webkitSpeechRecognition
  if(!R) return null
  const r = new R()
  r.lang = "en-US"
  r.continuous = true
  r.interimResults = false
  return r
}

// ---------------------------
// LISTEN
// ---------------------------
async function startListening(){
  if(listening || speaking) return

  const R = window.SpeechRecognition || window.webkitSpeechRecognition
  if(!R) return

  recognition = createRecognition()
  if(!recognition) return

  recognition.onresult = async ev => {
    if(speaking) return

    const txt = ev.results[ev.results.length-1][0].transcript.trim()
    transcript.textContent = txt

    if(currentMode === null){
      const pick = fuzzyModeFromText(txt)
      if(pick){
        recognition.stop()
        listening=false
        await setMode(pick)
        return
      }
      await playTTS("please say learn, quiz, or teach back.", "matthew")
      return
    }

    if(currentMode === "quiz"){
      recognition.stop()
      listening=false
      await handleQuiz(txt)
      return
    }

    if(currentMode === "teach_back"){
      recognition.stop()
      listening=false
      await handleTeach(txt)
      return
    }

    const pick = fuzzyModeFromText(txt)
    if(pick && pick !== "learn"){
      recognition.stop()
      listening = false
      await setMode(pick)
    }
  }

  recognition.onend = ()=>{
    listening=false
    if(!speaking && (currentMode===null || currentMode==="quiz" || currentMode==="teach_back")){
      setTimeout(startListening, 250)
    }
  }

  try{
    recognition.start()
    listening=true
  }catch(e){
    listening=false
  }
}

function stopListening(){
  if(recognition){
    try { recognition.stop() } catch(e){}
    recognition=null
  }
  listening=false
}

// quiz
async function handleQuiz(txt){
  const r = await fetch("/api/respond", {
    method:"POST",
    headers:{ "content-type":"application/json" },
    body:JSON.stringify({ mode:"quiz", concept_id:conceptSelect.value, user_text:txt })
  })
  const j = await r.json()
  feedbackBox.textContent = `score: ${j.score}\n\n${j.feedback}`
  await playTTS(j.feedback, "alicia")
  startListening()
}

// teach
async function handleTeach(txt){
  const r = await fetch("/api/respond", {
    method:"POST",
    headers:{ "content-type":"application/json" },
    body:JSON.stringify({ mode:"teach_back", concept_id:conceptSelect.value, user_text:txt })
  })
  const j = await r.json()
  feedbackBox.textContent = `score: ${j.score}\n\n${j.feedback}`
  await playTTS(j.feedback, "ken")
  startListening()
}

// ---------------------------
// SET MODE
// ---------------------------
async function setMode(mode){
  currentMode = mode
  setHtmlMode(mode)
  feedbackBox.textContent = "No feedback yet"
  assistant.textContent = "..."

  const r = await fetch("/api/mode", {
    method:"POST",
    headers:{ "content-type":"application/json" },
    body:JSON.stringify({ mode, concept_id:conceptSelect.value })
  })
  const j = await r.json()

  assistant.textContent = j.text
  await playTTS(j.text, j.voice)

  if(mode === "quiz" || mode === "teach_back"){
    startListening()
  } else {
    stopListening()
  }
}

// render concept
function renderConcept(){
  fetch("/shared-data/day4_tutor_content.json")
  .then(r=>r.json())
  .then(arr=>{
    const c = arr.find(x=>x.id===conceptSelect.value) || arr[0]
    conceptBox.textContent =
      `Title: ${c.title}\n\nSummary:\n${c.summary}\n\nSample question:\n${c.sample_question}`
  })
}

// ---------------------------
// GREETING — FIXED AUTOPLAY
// ---------------------------
async function _greetNow(){
  const r = await fetch("/api/mode",{
    method:"POST",
    headers:{ "content-type":"application/json" },
    body:JSON.stringify({ mode:"greet" })
  })
  const j = await r.json()
  assistant.textContent = j.text
  await playTTS(j.text, j.voice)
  currentMode = null
  startListening()
}

// ⭐ autoplay FIX
document.addEventListener("click", function unlockOnce(){
  document.removeEventListener("click", unlockOnce);
  _greetNow();   // greeting allowed after click
});

// UI
learnBtn.onclick = ()=> setMode("learn")
quizBtn.onclick = ()=> setMode("quiz")
teachBtn.onclick = ()=> setMode("teach_back")
startMic.onclick = ()=> startListening()
stopMic.onclick = ()=> stopListening()
conceptSelect.onchange = ()=> renderConcept()

// initial load
fetch("/shared-data/day4_tutor_content.json")
.then(r=>r.json())
.then(arr=>{
  conceptSelect.innerHTML=""
  arr.forEach(c=>{
    const o=document.createElement("option")
    o.value=c.id
    o.textContent=c.title
    conceptSelect.appendChild(o)
  })
  renderConcept()
  setHtmlMode("idle")
})
