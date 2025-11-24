const startBtn = document.getElementById("startBtn")
const stopBtn = document.getElementById("stopBtn")
const downloadBtn = document.getElementById("downloadBtn")
const transcriptEl = document.getElementById("transcript")
const lastEntryEl = document.getElementById("lastEntry")
const liveSummaryEl = document.getElementById("liveSummary")
const logArea = document.getElementById("logArea")

let recognition = null
let expecting = null
let session = { mood:"", energy:"", stress:"", objectives:[], summary:"" }
let last = null
let sessionActive = false
let listeningPaused = false
let ttsSpeaking = false


async function fetchLast(){
  const r = await fetch("/api/history")
  const j = await r.json()
  last = j.last
  lastEntryEl.textContent = last ? JSON.stringify(last,null,2) : "no previous check-in"
}

function appendLog(t){
  const now = new Date().toLocaleString()
  logArea.textContent += `[${now}] ${t}\n`
  logArea.scrollTop = logArea.scrollHeight
}

function updateLive(){
  liveSummaryEl.textContent = JSON.stringify(session,null,2)
}


function tts(text){
  ttsSpeaking = true
  listeningPaused = true

  const url = "https://murf-tts-falcon-demo.vercel.app/api/voice?text="+encodeURIComponent(text)
  const audio = new Audio(url)

  audio.onended = () => {
    setTimeout(() => {
      ttsSpeaking = false
      listeningPaused = false
    }, 500)
  }

  audio.play().catch(()=>{
    const u = new SpeechSynthesisUtterance(text)
    u.onend = ()=>{
      setTimeout(()=>{
        ttsSpeaking = false
        listeningPaused = false
      },500)
    }
    window.speechSynthesis.speak(u)
  })
}


function extractMood(txt){
  const t = txt.toLowerCase()

  if(t.includes("great")) return "great"
  if(t.includes("good")) return "good"
  if(t.includes("fine")) return "fine"
  if(t.includes("awesome")) return "awesome"
  if(t.includes("okay") || t.includes("ok")) return "okay"
  if(t.includes("happy")) return "happy"
  if(t.includes("sad")) return "sad"
  if(t.includes("tired")) return "tired"
  if(t.includes("relaxed")) return "relaxed"
  if(t.includes("normal")) return "normal"

  return null
}


function createRecognition(){
  const R = window.SpeechRecognition || window.webkitSpeechRecognition
  if(!R) return null

  const r = new R()
  r.lang = "en-US"
  r.interimResults = false
  r.continuous = true

  r.onresult = ev=>{
    if(!sessionActive) return
    if(ttsSpeaking) return
    if(listeningPaused) return

    const txt = ev.results[ev.results.length-1][0].transcript.trim()
    transcriptEl.textContent = txt
    routeInput(txt)
  }

  r.onend = ()=>{
    if(sessionActive){
      try{ r.start() }catch(e){}
    }
  }

  return r
}


function ask(q,key){
  expecting = { key }
  appendLog("agent: " + q)
  tts(q)
}


function validateMood(txt){
  return extractMood(txt) !== null
}

function validateEnergy(txt){
  const t = txt.toLowerCase()
  return t.includes("low") || t.includes("medium") || t.includes("high")
}

function validateObjectives(txt){
  const parts = txt.split(/,| and /).map(s=>s.trim()).filter(Boolean)
  return parts.length > 0
}



function routeInput(txt){
  if(!expecting) return

  appendLog("user: " + txt)

  if(expecting.key === "confirm") return handleConfirm(txt)
  if(expecting.key === "adjust") return handleAdjust(txt)

  const key = expecting.key
  const lower = txt.toLowerCase()

  if(key === "mood"){
    if(!validateMood(txt)){
      return ask("I didn't catch that clearly. How are you feeling today?","mood")
    }
    session.mood = extractMood(txt)
  }

  else if(key === "energy"){
    if(!validateEnergy(txt)){
      return ask("Please say low, medium, or high for your energy.","energy")
    }
    session.energy = lower.includes("low") ? "low" :
                     lower.includes("medium") ? "medium" : "high"
  }

  else if(key === "stress"){
    session.stress = txt
  }

  else if(key === "objectives"){
    if(!validateObjectives(txt)){
      return ask("Can you list one to three things you'd like to get done?","objectives")
    }
    session.objectives = txt.split(/,| and /).map(s=>s.trim())
  }

  expecting = null
  updateLive()
  proceed()
}


function proceed(){
  if(!sessionActive) return

  if(!session.mood) return ask("How are you feeling today?","mood")
  if(!session.energy) return ask("What is your energy like today? low, medium, or high?","energy")
  if(!session.stress) return ask("Anything stressing you out right now?","stress")
  if(session.objectives.length===0) return ask("What are one to three things you want to get done today?","objectives")

  session.summary = `You feel ${session.mood}, your energy is ${session.energy}, and your goals are ${session.objectives.join(", ")}`

  updateLive()

  const recap = `Here is your quick recap. You said you feel ${session.mood}, your energy is ${session.energy}, and your goals are ${session.objectives.join(", ")}. Does this sound right?`

  appendLog("agent: " + recap)
  tts(recap)
  expecting = { key:"confirm" }
}


function handleConfirm(txt){
  const t = txt.toLowerCase()

  if(
    t.includes("yes") || t.includes("yeah") || t.includes("yep") ||
    t.includes("right") || t.includes("correct") || t.includes("sure") ||
    t.includes("ok") || t.includes("okay") || t.includes("done") ||
    t.includes("sounds good") || t.includes("looks good")
  ){
    return finalizeAndSend()
  }

  tts("Okay, what would you like to adjust?")
  expecting = { key:"adjust" }
}

function handleAdjust(txt){
  expecting = null
  const lower = txt.toLowerCase()

  if(lower.includes("mood")) session.mood = extractMood(txt)
  else if(lower.includes("energy"))
    session.energy = lower.includes("low") ? "low" :
                     lower.includes("medium") ? "medium" : "high"
  else if(lower.includes("stress")) session.stress = txt
  else session.objectives = txt.split(/,| and /).map(s=>s.trim())

  updateLive()
  proceed()
}


function finalizeAndSend(){
  const payload = {
    mood: session.mood,
    energy: session.energy,
    stress: session.stress,
    objectives: session.objectives,
    summary: session.summary
  }

  fetch("/api/checkin",{
    method:"POST",
    headers:{"content-type":"application/json"},
    body:JSON.stringify(payload)
  })
  .then(r=>r.json())
  .then(()=>{
    appendLog("saved check-in")
    tts("I have saved your check-in. Take care and have a good day.")
    try{ recognition.stop() }catch(e){}
    sessionActive = false
    expecting = null
    fetchLast()
  })
}


startBtn.addEventListener("click", ()=>{
  if(!recognition) recognition = createRecognition()
  try{ recognition.start() }catch(e){}
  sessionActive = true

  appendLog("check-in started")

  session = { mood:"", energy:"", stress:"", objectives:[], summary:"" }
  updateLive()
  fetchLast()

  setTimeout(()=> proceed(), 800)
})

stopBtn.addEventListener("click", ()=>{
  try{ recognition.stop() }catch(e){}
  sessionActive = false
  expecting = null
  appendLog("check-in stopped")
})

downloadBtn.addEventListener("click", async ()=>{
  const r = await fetch("/api/history")
  const j = await r.json()
  const blob = new Blob([JSON.stringify(j,null,2)],{type:"application/json"})
  const a = document.createElement("a")
  a.href = URL.createObjectURL(blob)
  a.download = "wellness_log.json"
  a.click()
})

fetchLast()
updateLive()
