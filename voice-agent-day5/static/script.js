class VoiceSDR{
    constructor(){
        this.recognition=null;
        this.agentSpeaking=false;
        this.state="intent";
        this.currentField=null;

        this.lead={
            name:"",company:"",email:"",role:"",
            use_case:"",team_size:"",timeline:""
        };

        this.initSpeech();
        this.bindUI();
    }

    bindUI(){
        startBtn.onclick=()=>this.start();
        closeModal.onclick=()=>this.close();
    }

    start(){
        chatModal.style.display="flex";
        this.speak("hello, i am your razorpay voice s d r. how may i assist you today?");
        this.enableMicAfterSpeak(); // mic ON only after speech finishes
    }

    close(){
        this.disableMic();
        chatModal.style.display="none";
    }

    /* ================= SPEECH ENGINE ================= */

    initSpeech(){
        const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
        if(!SR){alert("speech not supported");return;}

        this.recognition=new SR();
        this.recognition.lang="en-IN";
        this.recognition.continuous=true;
        this.recognition.interimResults=false;

        this.recognition.onresult=(e)=>{
            if(this.agentSpeaking) return;  // NEVER listen when bot talks
            let text=e.results[e.results.length-1][0].transcript.toLowerCase().trim();
            if(text.length<2) return;
            this.add("user",text);
            this.route(text);
        };

        this.recognition.onend=()=>{ 
            if(!this.agentSpeaking) this.enableMic(); 
        };
    }

    enableMic(){
        try{ this.recognition.start(); }catch{}
    }

    disableMic(){
        try{ this.recognition.stop(); }catch{}
    }

    enableMicAfterSpeak(){
        setTimeout(()=>{ 
            this.agentSpeaking=false;
            this.enableMic(); 
        },600); // mic opens only AFTER voice ended fully
    }

    /* ================= ROUTER ================= */

    route(t){

        if(this.isEnd(t)) return this.endCall();

        if(this.state==="lead") return this.leadCapture(t);

        if(this.askRazorpay(t)) return this.faq("razorpay overview");

        if(this.askPricing(t)) return this.faq("pricing");

        if(this.askFeatures(t)) return this.faq("features");

        if(this.startOnboarding(t)){
            this.state="lead";
            this.currentField="name";
            return this.speakThenListen("great, let's onboard you. tell me your full name.", "name");
        }

        return this.speakThenListen("i did not understand. ask pricing, features or say start onboarding.");
    }

    /* ================= INTENT MATCHERS ================= */

    isEnd(t){ return /(bye|exit|stop|thank|done)/.test(t); }
    askRazorpay(t){ return /(what.*raz|tell me.*raz|razorpay)/.test(t); }
    askPricing(t){ return /(pricing|price|fees|charges|cost)/.test(t); }
    askFeatures(t){ return /(features|services|capabilities|offer|benefits)/.test(t); }
    startOnboarding(t){ return /(start onboarding|onboard|get started|begin onboarding)/.test(t); }

    /* ================= FAQ ================= */

    async faq(type){
        let res=await fetch("/api/query",{
            method:"POST",
            headers:{"Content-Type":"application/json"},
            body:JSON.stringify({query:type})
        });
        let data=await res.json();
        await this.speak(data.answer);
        this.speakThenListen("you can ask pricing, features, or say start onboarding.");
    }

    /* ================= ONBOARDING STEP-BY-STEP ================= */

    async leadCapture(input){

    input = input.trim();

    // SAVE ANSWER CORRECTLY
    if(this.currentField === "name")      this.lead.name      = input;
    else if(this.currentField === "company")   this.lead.company   = input;
    else if(this.currentField === "email")     this.lead.email     = input;
    else if(this.currentField === "role")      this.lead.role      = input;
    else if(this.currentField === "use_case")  this.lead.use_case  = input;
    else if(this.currentField === "team_size") this.lead.team_size = input;
    else if(this.currentField === "timeline")  this.lead.timeline  = input;

    this.updateUI();

    const flow = {
        name:"tell me your company name.",
        company:"now tell me your email address.",
        email:"great. what is your role?",
        role:"what will you use razorpay for?",
        use_case:"how many people are in your team?",
        team_size:"when do you want to go live — now, soon or later?",
        timeline:"__end__"
    };

    let next = flow[this.currentField];

    if(next !== "__end__"){
        this.currentField = Object.keys(flow)[Object.keys(flow).indexOf(this.currentField)+1];
        return this.speakThenListen(next);
    }

    // 🎉 ONBOARD COMPLETE → ASK FOR MEETING
    await this.speak("awesome, your onboarding details are saved.");
    await this.speak("would you like me to book a demo call for you?");
    this.enableMicAfterSpeak();
}



    /* ================= END ================= */

    async endCall(){
        await this.speak(`thank you. summary: ${this.lead.name}, ${this.lead.company}, usecase ${this.lead.use_case}`);
        setTimeout(()=>this.close(),1500);
    }

    /* ================= SPEAK — FINAL MIC FIX ================= */

    async speak(text){
        this.add("agent",text);
        this.agentSpeaking=true;
        this.disableMic();

        await new Promise(r=>{
            let u=new SpeechSynthesisUtterance(text);
            u.lang="en-IN";u.rate=0.95;u.pitch=1;
            u.onend=r;
            speechSynthesis.speak(u);
        });
    }

    async speakThenListen(text){
        await this.speak(text);
        this.enableMicAfterSpeak(); // mic opens after speech ends only
    }

    /* ================= UI ================= */

    add(role,text){
        transcript.innerHTML+=`<div class="msg ${role}">${text}</div>`;
        transcript.scrollTop=999999;
    }

    updateUI(){
        leadName.textContent=this.lead.name||"-";
        leadCompany.textContent=this.lead.company||"-";
        leadEmail.textContent=this.lead.email||"-";
        leadRole.textContent=this.lead.role||"-";
        leadUseCase.textContent=this.lead.use_case||"-";
        leadTeamSize.textContent=this.lead.team_size||"-";
        leadTimeline.textContent=this.lead.timeline||"-";
    }
}

new VoiceSDR();
