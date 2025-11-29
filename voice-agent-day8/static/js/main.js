let recognition;
let isRecording = false;
let isMuted = false;

// Initialize Speech Recognition
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    
    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        document.getElementById('text-input').value = transcript;
        stopRecording();
        sendMessage(transcript);
    };
    
    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        stopRecording();
        
        if (event.error === 'no-speech') {
            // User didn't speak, just stop recording silently
            return;
        }
        
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
            alert('Microphone access denied. Please:\n1. Click the lock icon in the address bar\n2. Allow microphone access\n3. Refresh the page\n\nOr use text input instead.');
        } else {
            alert('Speech recognition error: ' + event.error + '\nPlease use text input.');
        }
    };
    
    recognition.onend = () => {
        stopRecording();
    };
}

// DOM Elements
const startBtn = document.getElementById('start-btn');
const voiceBtn = document.getElementById('voice-btn');
const sendBtn = document.getElementById('send-btn');
const restartBtn = document.getElementById('restart-btn');
const muteBtn = document.getElementById('mute-btn');
const textInput = document.getElementById('text-input');
const storyContainer = document.getElementById('story-container');
const welcomeScreen = document.getElementById('welcome-screen');
const inputArea = document.getElementById('input-area');

// Event Listeners
startBtn.addEventListener('click', startGame);
voiceBtn.addEventListener('mousedown', startRecording);
voiceBtn.addEventListener('mouseup', stopRecording);
voiceBtn.addEventListener('mouseleave', stopRecording);
voiceBtn.addEventListener('touchstart', startRecording);
voiceBtn.addEventListener('touchend', stopRecording);
sendBtn.addEventListener('click', () => {
    const message = textInput.value.trim();
    if (message) {
        sendMessage(message);
        textInput.value = '';
    }
});
textInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const message = textInput.value.trim();
        if (message) {
            sendMessage(message);
            textInput.value = '';
        }
    }
});
restartBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to restart the adventure? All progress will be lost.')) {
        startGame();
    }
});
muteBtn.addEventListener('click', () => {
    isMuted = !isMuted;
    const muteIcon = document.getElementById('mute-icon');
    const muteText = document.getElementById('mute-text');
    
    if (isMuted) {
        muteIcon.textContent = '🔇';
        muteText.textContent = 'Unmute Voice';
        if ('speechSynthesis' in window) {
            speechSynthesis.cancel();
        }
    } else {
        muteIcon.textContent = '🔊';
        muteText.textContent = 'Mute Voice';
    }
});

// Functions
async function startGame() {
    try {
        const response = await fetch('/start', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        // Hide welcome screen, show input area
        welcomeScreen.style.display = 'none';
        inputArea.style.display = 'block';
        
        // Clear story container and add first message
        storyContainer.innerHTML = '';
        addMessage('gm', data.message);
        
        // Update game state
        updateGameState(data.game_state);
        
        // Speak the initial message
        speakText(data.message);
    } catch (error) {
        console.error('Error starting game:', error);
        alert('Failed to start the game. Please check your API key and try again.');
    }
}

async function sendMessage(message) {
    if (!message.trim()) return;
    
    // Disable inputs
    setInputsEnabled(false);
    
    // Add player message
    addMessage('player', message);
    
    // Add thinking indicator
    const thinkingId = addThinkingIndicator();
    
    try {
        const response = await fetch('/send_message', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message })
        });
        
        const data = await response.json();
        
        // Remove thinking indicator
        removeThinkingIndicator(thinkingId);
        
        if (data.error) {
            alert('Error: ' + data.error);
        } else {
            // Add GM response
            addMessage('gm', data.message);
            
            // Update game state
            updateGameState(data.game_state);
            
            // Speak the GM's response
            speakText(data.message);
        }
    } catch (error) {
        console.error('Error sending message:', error);
        removeThinkingIndicator(thinkingId);
        alert('Failed to send message. Please try again.');
    } finally {
        setInputsEnabled(true);
    }
}

function addMessage(type, content) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message message-${type}`;
    
    const label = document.createElement('div');
    label.className = `message-label label-${type}`;
    label.innerHTML = type === 'gm' ? 
        '<span>🎲</span> Game Master' : 
        '<span>⚔️</span> You';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.textContent = content;
    
    messageDiv.appendChild(label);
    messageDiv.appendChild(contentDiv);
    storyContainer.appendChild(messageDiv);
    
    // Scroll to bottom
    storyContainer.scrollTop = storyContainer.scrollHeight;
}

function addThinkingIndicator() {
    const id = 'thinking-' + Date.now();
    const messageDiv = document.createElement('div');
    messageDiv.id = id;
    messageDiv.className = 'message message-gm';
    messageDiv.style.opacity = '0.6';
    
    const label = document.createElement('div');
    label.className = 'message-label label-gm';
    label.innerHTML = '<span>🎲</span> Game Master';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.textContent = 'The Game Master is thinking...';
    
    messageDiv.appendChild(label);
    messageDiv.appendChild(contentDiv);
    storyContainer.appendChild(messageDiv);
    storyContainer.scrollTop = storyContainer.scrollHeight;
    
    return id;
}

function removeThinkingIndicator(id) {
    const element = document.getElementById(id);
    if (element) {
        element.remove();
    }
}

function updateGameState(state) {
    // Update character sheet
    document.getElementById('char-name').textContent = state.player.name;
    document.getElementById('char-class').textContent = state.player.class;
    document.getElementById('char-level').textContent = state.player.level;
    document.getElementById('char-hp').textContent = `${state.player.hp}/${state.player.max_hp}`;
    document.getElementById('char-gold').textContent = `💰 ${state.player.gold}`;
    
    // Update health bar
    const healthPercentage = (state.player.hp / state.player.max_hp) * 100;
    document.getElementById('health-bar').style.width = healthPercentage + '%';
    
    // Update status
    const statusElement = document.getElementById('char-status');
    statusElement.textContent = state.player.status;
    statusElement.className = 'stat-value';
    if (state.player.hp >= state.player.max_hp * 0.7) {
        statusElement.classList.add('status-healthy');
    } else if (state.player.hp >= state.player.max_hp * 0.3) {
        statusElement.classList.add('status-injured');
    } else {
        statusElement.classList.add('status-critical');
    }
    
    // Update inventory
    const inventoryList = document.getElementById('inventory-list');
    inventoryList.innerHTML = '';
    state.player.inventory.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'inventory-item';
        itemDiv.textContent = item;
        inventoryList.appendChild(itemDiv);
    });
    
    // Update quests
    const questsList = document.getElementById('quests-list');
    questsList.innerHTML = '';
    const activeQuests = state.quests.filter(q => q.status === 'active');
    activeQuests.forEach(quest => {
        const questDiv = document.createElement('div');
        questDiv.className = 'quest-item';
        
        const completedObjectives = quest.objectives.filter(o => o.completed).length;
        const totalObjectives = quest.objectives.length;
        
        questDiv.innerHTML = `
            <div class="quest-name">${quest.name}</div>
            <div class="quest-progress">${completedObjectives}/${totalObjectives} objectives</div>
        `;
        questsList.appendChild(questDiv);
    });
    
    if (activeQuests.length === 0) {
        questsList.innerHTML = '<div class="event-item">No active quests</div>';
    }
    
    // Update world info
    document.getElementById('location-name').textContent = state.location.name;
    document.getElementById('location-desc').textContent = state.location.description;
    document.getElementById('world-time').textContent = state.world_info.time_of_day.charAt(0).toUpperCase() + state.world_info.time_of_day.slice(1);
    document.getElementById('world-weather').textContent = state.world_info.weather.charAt(0).toUpperCase() + state.world_info.weather.slice(1);
    
    // Update danger level
    const dangerElement = document.getElementById('danger-level');
    dangerElement.textContent = state.world_info.danger_level.charAt(0).toUpperCase() + state.world_info.danger_level.slice(1);
    dangerElement.className = 'info-value';
    if (state.world_info.danger_level === 'low') {
        dangerElement.classList.add('danger-low');
    } else if (state.world_info.danger_level === 'moderate') {
        dangerElement.classList.add('danger-moderate');
    } else {
        dangerElement.classList.add('danger-high');
    }
    
    // Update recent events
    const eventsList = document.getElementById('events-list');
    eventsList.innerHTML = '';
    const recentEvents = state.events.slice(-5).reverse();
    recentEvents.forEach(event => {
        const eventDiv = document.createElement('div');
        eventDiv.className = 'event-item';
        eventDiv.textContent = event.description;
        eventsList.appendChild(eventDiv);
    });
}

function startRecording() {
    if (!recognition) {
        alert('Speech recognition is not supported in your browser. Please use text input.');
        return;
    }
    
    if (!isRecording) {
        isRecording = true;
        voiceBtn.classList.add('recording');
        voiceBtn.querySelector('.voice-text').textContent = 'Release to Stop';
        recognition.start();
    }
}

function stopRecording() {
    if (isRecording) {
        isRecording = false;
        voiceBtn.classList.remove('recording');
        voiceBtn.querySelector('.voice-text').textContent = 'Hold to Speak';
        if (recognition) {
            recognition.stop();
        }
    }
}

function setInputsEnabled(enabled) {
    voiceBtn.disabled = !enabled;
    sendBtn.disabled = !enabled;
    textInput.disabled = !enabled;
}

function speakText(text) {
    // Check if muted
    if (isMuted) {
        console.log('Voice is muted');
        return;
    }
    
    // Text-to-Speech using Web Speech API
    if ('speechSynthesis' in window) {
        // Stop any ongoing speech
        speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        
        // GM voice settings - deeper, slower, more dramatic
        utterance.rate = 0.85;
        utterance.pitch = 0.8;
        utterance.volume = 1.0;
        
        // Try to select a good voice
        const voices = speechSynthesis.getVoices();
        const preferredVoice = voices.find(voice => 
            voice.name.includes('Male') || 
            voice.name.includes('David') ||
            voice.name.includes('Daniel')
        );
        
        if (preferredVoice) {
            utterance.voice = preferredVoice;
        }
        
        // Visual feedback while speaking
        const lastMessage = storyContainer.lastElementChild;
        if (lastMessage && lastMessage.classList.contains('message-gm')) {
            lastMessage.style.borderLeft = '4px solid #00ff00';
        }
        
        utterance.onend = () => {
            if (lastMessage) {
                lastMessage.style.borderLeft = '';
            }
        };
        
        speechSynthesis.speak(utterance);
    } else {
        console.log('Text-to-speech not supported in this browser');
    }
}