// Fraud Alert Voice Agent - COMPLETE WORKING VERSION
// This version is tested and works 100%

console.log('=============================================');
console.log('🚀 Fraud Agent Loading...');
console.log('=============================================');

// ============================================
// DATABASE
// ============================================

const fraudCases = [
    {
        caseId: "FRD001",
        userName: "John Doe",
        securityIdentifier: "1993",
        maskedCard: "**** 4242",
        amount: "₹14,499",
        merchant: "ABC INDUSTRIES",
        location: "Mumbai, IN",
        timestamp: "2025-01-19 14:23 PM",
        transactionCategory: "e-commerce",
        transactionSource: "alibaba.com",
        securityQuestion: "What is your birth city?",
        securityAnswer: "delhi",
        status: "pending_review",
        outcomeNote: null
    },
    {
        caseId: "FRD002",
        userName: "Sarah Johnson",
        securityIdentifier: "1987",
        maskedCard: "**** 8765",
        amount: "₹45,230",
        merchant: "LUXURY WATCHES INC",
        location: "Dubai, UAE",
        timestamp: "2025-01-20 09:15 AM",
        transactionCategory: "luxury goods",
        transactionSource: "luxurywatches.com",
        securityQuestion: "What is your pet's name?",
        securityAnswer: "buddy",
        status: "pending_review",
        outcomeNote: null
    },
    {
        caseId: "FRD003",
        userName: "Michael Chen",
        securityIdentifier: "2001",
        maskedCard: "**** 3456",
        amount: "₹8,999",
        merchant: "TECH GADGETS STORE",
        location: "Singapore, SG",
        timestamp: "2025-01-21 18:45 PM",
        transactionCategory: "electronics",
        transactionSource: "techstore.sg",
        securityQuestion: "What is your mother's maiden name?",
        securityAnswer: "wong",
        status: "pending_review",
        outcomeNote: null
    },
    {
        caseId: "FRD004",
        userName: "Emily Williams",
        securityIdentifier: "1995",
        maskedCard: "**** 9012",
        amount: "₹125,000",
        merchant: "INTERNATIONAL TRAVEL AGENCY",
        location: "London, UK",
        timestamp: "2025-01-22 11:30 AM",
        transactionCategory: "travel",
        transactionSource: "travelworld.co.uk",
        securityQuestion: "What is your favorite color?",
        securityAnswer: "blue",
        status: "pending_review",
        outcomeNote: null
    }
];

console.log('✅ Database loaded:', fraudCases.length, 'cases');

// ============================================
// GLOBAL STATE
// ============================================

let currentCase = null;
let conversationState = 'IDLE'; // IDLE, AWAITING_CASE, VERIFYING, AWAITING_CONFIRMATION
let recognition = null;
let isSpeaking = false;
let isListening = false;

// ============================================
// DOM ELEMENTS
// ============================================

console.log('📋 Getting DOM elements...');

const elements = {
    startBtn: document.getElementById('startBtn'),
    micBtn: document.getElementById('micBtn'),
    endBtn: document.getElementById('endBtn'),
    chatMessages: document.getElementById('chatMessages'),
    clearChat: document.getElementById('clearChat'),
    statusBadge: document.getElementById('statusBadge'),
    statusText: document.getElementById('statusText'),
    agentStatus: document.getElementById('agentStatus'),
    micText: document.getElementById('micText'),
    caseList: document.getElementById('caseList'),
    detailsPanel: document.getElementById('detailsPanel'),
    caseDetails: document.getElementById('caseDetails'),
    waveform: document.getElementById('waveform')
};

// Check if all elements exist
let allElementsFound = true;
for (const [key, element] of Object.entries(elements)) {
    if (!element) {
        console.error(`❌ Element not found: ${key}`);
        allElementsFound = false;
    }
}

if (allElementsFound) {
    console.log('✅ All DOM elements found');
} else {
    console.error('❌ Some DOM elements missing!');
}

// ============================================
// WAVEFORM ANIMATION (apple-style tweaks)
// ============================================

const canvas = elements.waveform;
const ctx = canvas ? canvas.getContext('2d') : null;

if (canvas && ctx) {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
}

const waveData = new Array(64).fill(0);
let wavePhase = 0; // for smooth sine-based motion

function animateWaveform() {
    if (!ctx || !canvas) return;

    // subtle dark gradient background
    const bg = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bg.addColorStop(0, '#16161f');
    bg.addColorStop(1, '#0f1017');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const barCount = waveData.length;
    const barWidth = canvas.width / barCount;
    const maxHeight = canvas.height * 0.6; // ~60% height for minimal look

    ctx.save();
    ctx.shadowColor = 'rgba(79, 140, 255, 0.35)';
    ctx.shadowBlur = 12;

    for (let i = 0; i < barCount; i++) {
        // smoother waveform: sine + a little randomness
        if (isSpeaking) {
            wavePhase += 0.02;
            const base = Math.abs(Math.sin(wavePhase + i * 0.25)); // 0–1 smooth
            const jitter = (Math.random() - 0.5) * 0.15;           // small variation
            const target = Math.min(Math.max(base + jitter, 0), 1);
            // smooth towards target
            waveData[i] = waveData[i] * 0.6 + target * 0.4;
        } else {
            // gentle decay when not speaking
            waveData[i] *= 0.92;
        }

        const height = waveData[i] * maxHeight;
        const x = i * barWidth;
        const y = (canvas.height - height) / 2;

        const visualBarWidth = barWidth * 0.55; // thinner bars
        ctx.fillStyle = '#4f8cff';
        ctx.fillRect(x + (barWidth - visualBarWidth) / 2, y, visualBarWidth, height);
    }

    ctx.restore();

    requestAnimationFrame(animateWaveform);
}

animateWaveform();
console.log('✅ Waveform animation started');

// ============================================
// HELPER FUNCTIONS
// ============================================

// ---- risk scoring helper (add-on) ----
function computeRisk(caseObj) {
    let score = 0;

    // amount > 50,000
    const amountNum = parseInt(caseObj.amount.replace(/[^\d]/g, ''), 10) || 0;
    if (amountNum > 50000) score += 40;

    // foreign location: not "IN" or "india"
    const loc = (caseObj.location || '').toLowerCase();
    if (!/\b(in|india)\b/.test(loc)) score += 30;

    // high-risk category
    const highRiskCategories = ['luxury goods', 'travel', 'electronics'];
    const cat = (caseObj.transactionCategory || '').toLowerCase();
    if (highRiskCategories.includes(cat)) score += 20;

    // odd time 22:00–06:00
    const timeMatch = (caseObj.timestamp || '').match(/(\d{2}):(\d{2})/);
    if (timeMatch) {
        const hour = parseInt(timeMatch[1], 10);
        if (hour >= 22 || hour < 6) score += 10;
    }

    caseObj.riskScore = score;

    if (score <= 30) {
        caseObj.riskLevel = 'low';
    } else if (score <= 70) {
        caseObj.riskLevel = 'medium';
    } else {
        caseObj.riskLevel = 'high';
    }
}

function initRiskScores() {
    fraudCases.forEach(computeRisk);
    console.log('✅ Risk scores computed:', fraudCases.map(c => ({
        id: c.caseId,
        score: c.riskScore,
        level: c.riskLevel
    })));
}
// ---- end risk scoring helper ----

function addMessage(type, text) {
    if (!elements.chatMessages) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${type}`;
    
    const time = new Date().toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    messageDiv.innerHTML = `
        <div class="message-content">
            <p>${text}</p>
        </div>
        <div class="message-time">${time}</div>
    `;
    
    elements.chatMessages.appendChild(messageDiv);
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
    
    console.log(`[${type.toUpperCase()}] ${text}`);
}

function updateStatus(status) {
    if (!elements.statusBadge || !elements.statusText) return;
    
    elements.statusBadge.className = `status-badge ${status}`;
    
    const statusTexts = {
        'idle': 'Ready',
        'active': 'Active',
        'speaking': 'Speaking',
        'listening': 'Listening'
    };
    
    elements.statusText.textContent = statusTexts[status] || 'Ready';
}

function searchCase(query) {
    const q = query.toLowerCase().trim();
    
    // Try case ID first
    let found = fraudCases.find(c => c.caseId.toLowerCase() === q);
    if (found) return found;
    
    // Try case numbers
    const numberMap = {
        'one': 0, 'first': 0, '1': 0,
        'two': 1, 'second': 1, '2': 1,
        'three': 2, 'third': 2, '3': 2,
        'four': 3, 'fourth': 3, '4': 3
    };
    
    for (const [key, index] of Object.entries(numberMap)) {
        if (q.includes(key)) {
            return fraudCases[index];
        }
    }
    
    // Try name match
    found = fraudCases.find(c => {
        const name = c.userName.toLowerCase();
        return name.includes(q) || q.includes(name) || 
               name.split(' ').some(part => part.includes(q));
    });
    
    return found;
}

function updateCase(caseId, status, outcomeNote) {
    const caseObj = fraudCases.find(c => c.caseId === caseId);
    if (caseObj) {
        caseObj.status = status;
        caseObj.outcomeNote = outcomeNote;
        caseObj.updatedAt = new Date().toISOString();
        
        console.log('=============================================');
        console.log('✅ DATABASE UPDATED:');
        console.log(JSON.stringify(caseObj, null, 2));
        console.log('=============================================');
    }
}

function showCaseDetails(fraudCase) {
    if (!elements.detailsPanel || !elements.caseDetails) return;
    
    elements.detailsPanel.style.display = 'block';
    elements.caseDetails.innerHTML = `
        <div class="detail-item">
            <div class="detail-label">Case ID</div>
            <div class="detail-value">${fraudCase.caseId}</div>
        </div>
        <div class="detail-item">
            <div class="detail-label">Customer Name</div>
            <div class="detail-value">${fraudCase.userName}</div>
        </div>
        <div class="detail-item">
            <div class="detail-label">Card</div>
            <div class="detail-value">${fraudCase.maskedCard}</div>
        </div>
        <div class="detail-item">
            <div class="detail-label">Amount</div>
            <div class="detail-value highlight">${fraudCase.amount}</div>
        </div>
        <div class="detail-item">
            <div class="detail-label">Merchant</div>
            <div class="detail-value">${fraudCase.merchant}</div>
        </div>
        <div class="detail-item">
            <div class="detail-label">Location</div>
            <div class="detail-value">${fraudCase.location}</div>
        </div>
        <div class="detail-item">
            <div class="detail-label">Risk</div>
            <div class="detail-value">${fraudCase.riskLevel?.toUpperCase() || 'LOW'} (${fraudCase.riskScore ?? 0})</div>
        </div>
    `;
}

function loadCases() {
    if (!elements.caseList) return;
    
    elements.caseList.innerHTML = fraudCases.map(c => `
        <div class="case-item" data-case-id="${c.caseId}">
            <div class="case-id">Case ID: ${c.caseId}</div>
            <div class="case-name">${c.userName}</div>
            <div class="case-amount">${c.amount}</div>
            <div class="case-status">${c.status.replace('_', ' ').toUpperCase()}</div>
            <div class="case-risk risk-${c.riskLevel || 'low'}">
                ${(c.riskLevel || 'low').toUpperCase()} RISK
            </div>
        </div>
    `).join('');
    
    console.log('✅ Cases loaded to UI');
}

// ============================================
// SPEECH SYNTHESIS (TTS)
// ============================================

function speak(text) {
    return new Promise((resolve) => {
        console.log('🔊 SPEAKING:', text.substring(0, 60) + '...');
        
        addMessage('agent', text);
        
        isSpeaking = true;
        if (elements.micBtn) elements.micBtn.disabled = true;
        if (elements.agentStatus) elements.agentStatus.textContent = 'AI Agent Speaking...';
        updateStatus('speaking');
        
        // Cancel any ongoing speech
        speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        
        // Get and use best voice
        const voices = speechSynthesis.getVoices();
        if (voices.length > 0) {
            const englishVoice = voices.find(v => v.lang.startsWith('en')) || voices[0];
            utterance.voice = englishVoice;
            console.log('🔊 Using voice:', englishVoice.name);
        }
        
        utterance.onstart = () => {
            console.log('🔊 Speech started');
        };
        
        utterance.onend = () => {
            console.log('🔊 Speech ended');
            isSpeaking = false;
            if (elements.agentStatus) elements.agentStatus.textContent = 'AI Agent Ready';
            updateStatus('active');
            
            // Enable mic after a short delay
            setTimeout(() => {
                if (conversationState !== 'IDLE' && elements.micBtn) {
                    elements.micBtn.disabled = false;
                    console.log('🎤 Microphone enabled');
                }
                resolve();
            }, 800);
        };
        
        utterance.onerror = (event) => {
            console.error('❌ Speech error:', event.error);
            isSpeaking = false;
            resolve();
        };
        
        // Small delay before speaking
        setTimeout(() => {
            speechSynthesis.speak(utterance);
        }, 100);
    });
}

// ============================================
// SPEECH RECOGNITION
// ============================================

function initSpeechRecognition() {
    console.log('🎤 Initializing speech recognition...');
    
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        console.error('❌ Speech recognition not supported');
        addMessage('system', '⚠️ Speech recognition not supported. Please use Chrome or Edge.');
        return false;
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    
    recognition.onstart = () => {
        console.log('🎤 Microphone STARTED');
        isListening = true;
        if (elements.micBtn) elements.micBtn.classList.add('listening');
        if (elements.micText) elements.micText.textContent = 'Listening...';
        updateStatus('listening');
    };
    
    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        console.log('🎤 HEARD:', transcript);
        handleUserInput(transcript);
    };
    
    recognition.onerror = (event) => {
        console.error('❌ Speech recognition error:', event.error);
        isListening = false;
        if (elements.micBtn) elements.micBtn.classList.remove('listening');
        if (elements.micText) elements.micText.textContent = 'Push to Talk';
        
        if (event.error === 'not-allowed') {
            addMessage('system', '⚠️ Microphone blocked! Click the 🎤 icon in your browser address bar and allow access.');
        } else if (event.error !== 'no-speech' && event.error !== 'aborted') {
            addMessage('system', `⚠️ Microphone error: ${event.error}`);
        }
    };
    
    recognition.onend = () => {
        console.log('🎤 Microphone STOPPED');
        isListening = false;
        if (elements.micBtn) elements.micBtn.classList.remove('listening');
        if (elements.micText) elements.micText.textContent = 'Push to Talk';
        
        // Re-enable mic if conversation is active
        if (conversationState !== 'IDLE' && !isSpeaking && elements.micBtn) {
            elements.micBtn.disabled = false;
        }
    };
    
    console.log('✅ Speech recognition initialized');
    return true;
}

// ============================================
// CONVERSATION HANDLERS
// ============================================

async function handleUserInput(transcript) {
    addMessage('user', transcript);
    
    if (elements.micBtn) elements.micBtn.disabled = true;
    
    console.log('📝 Current state:', conversationState);
    
    switch (conversationState) {
        case 'AWAITING_CASE':
            await handleCaseSelection(transcript);
            break;
            
        case 'VERIFYING':
            await handleVerification(transcript);
            break;
            
        case 'AWAITING_CONFIRMATION':
            await handleTransactionConfirmation(transcript);
            break;
            
        default:
            await speak("I'm sorry, I didn't understand. Please try again.");
            if (elements.micBtn) elements.micBtn.disabled = false;
    }
}

async function handleCaseSelection(transcript) {
    console.log('🔍 Searching for case:', transcript);
    
    const foundCase = searchCase(transcript);
    
    if (!foundCase) {
        console.log('❌ Case not found');
        await speak(
            "I couldn't find a case matching that name or number. " +
            "Please try again. Say a customer name like 'John Doe' or 'case one'."
        );
        return;
    }
    
    console.log('✅ Found case:', foundCase.caseId, '-', foundCase.userName);
    
    currentCase = foundCase;
    showCaseDetails(foundCase);
    conversationState = 'VERIFYING';
    
    await speak(
        `Thank you. I have located the case for ${foundCase.userName}. ` +
        `Before we proceed, I need to verify your identity. ` +
        `${foundCase.securityQuestion}`
    );
}

async function handleVerification(transcript) {
    const answer = transcript.toLowerCase().trim();
    const correctAnswer = currentCase.securityAnswer.toLowerCase();
    
    console.log('🔐 Verification attempt:', answer, 'vs', correctAnswer);
    
    if (answer.includes(correctAnswer) || correctAnswer.includes(answer)) {
        console.log('✅ Verification PASSED');
        
        conversationState = 'AWAITING_CONFIRMATION';
        
        await speak(
            `Thank you for verifying your identity. ` +
            `Now, let me review the suspicious transaction with you. ` +
            `On ${currentCase.timestamp}, we detected a transaction on your card ending in ${currentCase.maskedCard}. ` +
            `The transaction was for ${currentCase.amount} at ${currentCase.merchant}, located in ${currentCase.location}. ` +
            `This purchase was made on ${currentCase.transactionSource}. ` +
            `Can you please confirm: Did you authorize this transaction? ` +
            `Please respond with yes or no.`
        );
        
    } else {
        console.log('❌ Verification FAILED');
        
        await speak(
            "I'm sorry, but that answer doesn't match our records. " +
            "For your security, I cannot proceed with this verification. " +
            "Please contact our customer service directly at 1-800-SECURE-BANK. " +
            "This call will now end."
        );
        
        updateCase(
            currentCase.caseId,
            'verification_failed',
            'Customer failed security verification. Identity could not be confirmed.'
        );
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        endSession();
    }
}

async function handleTransactionConfirmation(transcript) {
    const response = transcript.toLowerCase();
    
    console.log('💳 Transaction confirmation:', response);
    
    if (response.includes('yes') || response.includes('correct') || 
        response.includes('authorize') || response.includes('i did')) {
        
        console.log('✅ Transaction CONFIRMED as SAFE');
        
        await speak(
            `Thank you for confirming. I'm marking this transaction as legitimate in our system. ` +
            `The fraud alert has been cleared, and no further action is needed. ` +
            `Your card ending in ${currentCase.maskedCard} remains active. ` +
            `Thank you for your time!`
        );
        
        updateCase(
            currentCase.caseId,
            'confirmed_safe',
            'Customer confirmed transaction as legitimate. No fraud detected.'
        );
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        endSession();
        
    } else if (response.includes('no') || response.includes('not me') || 
               response.includes('fraud') || response.includes("didn't")) {
        
        console.log('🚫 Transaction CONFIRMED as FRAUD');
        
        await speak(
            `I understand. I'm very sorry this happened. ` +
            `I'm immediately blocking your card ending in ${currentCase.maskedCard} to prevent any further unauthorized charges. ` +
            `We will initiate a fraud investigation and reverse this ${currentCase.amount} charge within 3 to 5 business days. ` +
            `A new card will be shipped to your registered address within 5 to 7 business days. ` +
            `You will also receive an email confirmation with a fraud case reference number. ` +
            `Thank you for reporting this.`
        );
        
        updateCase(
            currentCase.caseId,
            'confirmed_fraud',
            `Customer denied authorizing transaction. Card blocked. Dispute initiated for ${currentCase.amount}.`
        );
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        endSession();
        
    } else {
        await speak(
            "I didn't quite catch that. Please respond with 'yes' if you made this transaction, " +
            "or 'no' if you did not authorize it."
        );
        if (elements.micBtn) elements.micBtn.disabled = false;
    }
}

// ============================================
// SESSION CONTROL
// ============================================

async function startSession() {
    console.log('=============================================');
    console.log('🚀 START SESSION BUTTON CLICKED!');
    console.log('=============================================');
    
    conversationState = 'AWAITING_CASE';
    
    if (elements.startBtn) elements.startBtn.disabled = true;
    if (elements.endBtn) elements.endBtn.disabled = false;
    
    addMessage('system', '✅ Session started. Please wait for the agent...');
    
    console.log('🔊 About to speak welcome message...');
    
    await speak(
        "Good day! This is SecureBank's Fraud Detection Department. " +
        "I'm here to help you review a potentially suspicious transaction. " +
        "To begin, please tell me your name or the case number you'd like to review. " +
        "You can say something like 'My name is John Doe' or 'Check case one'."
    );
    
    console.log('✅ Welcome message complete');
}

function toggleMicrophone() {
    console.log('🎤 MICROPHONE BUTTON CLICKED');
    
    if (!recognition) {
        console.error('❌ Recognition not initialized');
        addMessage('system', '⚠️ Microphone not initialized. Please refresh the page.');
        return;
    }
    
    if (isListening) {
        console.log('🛑 Stopping microphone');
        recognition.stop();
    } else {
        console.log('🎤 Starting microphone');
        try {
            recognition.start();
        } catch (error) {
            console.error('❌ Error starting microphone:', error);
            addMessage('system', '⚠️ Could not start microphone. Make sure to allow microphone permission.');
        }
    }
}

function endSession() {
    console.log('=============================================');
    console.log('🛑 ENDING SESSION');
    console.log('=============================================');
    
    if (recognition) {
        recognition.stop();
    }
    
    speechSynthesis.cancel();
    
    conversationState = 'IDLE';
    currentCase = null;
    isSpeaking = false;
    isListening = false;
    
    if (elements.startBtn) elements.startBtn.disabled = false;
    if (elements.micBtn) {
        elements.micBtn.disabled = true;
        elements.micBtn.classList.remove('listening');
    }
    if (elements.endBtn) elements.endBtn.disabled = true;
    if (elements.micText) elements.micText.textContent = 'Push to Talk';
    if (elements.agentStatus) elements.agentStatus.textContent = 'AI Agent Ready';
    if (elements.detailsPanel) elements.detailsPanel.style.display = 'none';
    
    updateStatus('idle');
    
    addMessage('system', '✅ Session ended. Thank you for using SecureBank Fraud Detection.');
    
    loadCases();
    
    console.log('✅ Session cleanup complete');
}

function clearChat() {
    if (!elements.chatMessages) return;
    
    elements.chatMessages.innerHTML = `
        <div class="chat-message system">
            <div class="message-content">
                <p>Chat cleared.</p>
            </div>
            <div class="message-time">Just now</div>
        </div>
    `;
    
    console.log('🗑️ Chat cleared');
}

// ============================================
// EVENT LISTENERS
// ============================================

console.log('🔌 Attaching event listeners...');

if (elements.startBtn) {
    elements.startBtn.addEventListener('click', () => {
        console.log('✅ Start button clicked!');
        startSession();
    });
    console.log('✅ Start button listener attached');
}

if (elements.micBtn) {
    elements.micBtn.addEventListener('click', () => {
        console.log('✅ Mic button clicked!');
        toggleMicrophone();
    });
    console.log('✅ Mic button listener attached');
}

if (elements.endBtn) {
    elements.endBtn.addEventListener('click', () => {
        console.log('✅ End button clicked!');
        endSession();
    });
    console.log('✅ End button listener attached');
}

if (elements.clearChat) {
    elements.clearChat.addEventListener('click', () => {
        console.log('✅ Clear chat clicked!');
        clearChat();
    });
    console.log('✅ Clear chat listener attached');
}

// ============================================
// INITIALIZATION
// ============================================

function initialize() {
    console.log('=============================================');
    console.log('🎬 INITIALIZING FRAUD AGENT');
    console.log('=============================================');
    
    // NEW: compute risk scores before loading into UI
    initRiskScores();

    // Load cases
    loadCases();
    
    // Initialize speech recognition
    const recReady = initSpeechRecognition();
    
    // Load voices for TTS
    const voices = speechSynthesis.getVoices();
    console.log(`🔊 Voices available: ${voices.length}`);
    
    if (voices.length === 0) {
        console.log('⏳ Waiting for voices to load...');
        speechSynthesis.onvoiceschanged = () => {
            const v = speechSynthesis.getVoices();
            console.log(`✅ Voices loaded: ${v.length}`);
        };
        
        // Force voices to load
        setTimeout(() => {
            speechSynthesis.getVoices();
        }, 100);
    }
    
    console.log('=============================================');
    console.log('✅ INITIALIZATION COMPLETE!');
    console.log('✅ READY TO USE - CLICK "START SESSION"');
    console.log('=============================================');
}

// Run initialization when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}

// Also listen for voices loaded event
speechSynthesis.addEventListener('voiceschanged', () => {
    const voices = speechSynthesis.getVoices();
    console.log('🔊 Voices changed event:', voices.length);
});

console.log('✅ Script fully loaded and ready!');
