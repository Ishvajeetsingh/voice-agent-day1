# Razorpay Voice SDR Agent

A fully functional voice-powered Sales Development Representative (SDR) agent for Razorpay, built for the Murf AI Voice Agent Challenge.

## 🎯 Features

### Primary Goals (All Implemented)
1. **FAQ Content** - Complete Razorpay information in `faq.json`
2. **Greeting & Intent Collection** - Natural conversation flow
3. **FAQ Q&A** - Smart keyword-based question answering
4. **Lead Collection** - Collects name, company, email, role, use case, team size, timeline
5. **End-of-Call Detection** - Detects completion and generates summary

### Advanced Goals
 **Meeting Scheduler** - Offers 3 time slots, allows selection, confirms booking

## 🏗️ Tech Stack

- **Backend**: Flask (Python)
- **Frontend**: Vanilla JavaScript
- **Speech Recognition**: Browser Web Speech API
- **Text-to-Speech**: Browser Speech Synthesis API (Web Speech API)
- **Storage**: JSON files

## 📁 Project Structure

```
project/
├── app.py                    # Flask backend with all routes
├── static/
│   ├── index.html           # Frontend UI
│   ├── script.js            # Voice SDR logic
│   └── style.css            # Modern styling
├── faq.json                 # Razorpay FAQ data
├── meeting_slots.json       # Available meeting slots
├── lead_data.json           # Stored leads (auto-created)
├── meeting.json             # Booked meetings (auto-created)
└── README.md                # This file
```


### Installation

1. **Install dependencies**:
```bash
pip install flask flask-cors
```

2. **Run the application**:
```bash
python app.py
```

3. **Open in browser**:
```
http://localhost:5000
```

4. **Allow microphone access** when prompted

## 🎙️ How to Use

1. Click **"Start Conversation"** button
2. Allow microphone access
3. Wait for the agent to greet you
4. Have a natural conversation:
   - Ask questions about Razorpay
   - Express interest to get started
   - Book a meeting
   - Say "that's all" or "thanks" to end

## 🗣️ Example Conversations

### FAQ Mode
```
User: "What does Razorpay do?"
Agent: "Razorpay is India's leading payment gateway..."

User: "What about pricing?"
Agent: "We charge a simple transaction fee of 2%..."
```

### Lead Collection
```
Agent: "May I have your name?"
User: "John Doe"
Agent: "What company do you work for?"
User: "TechCorp"
[Continues through all fields]
```

### Meeting Booking
```
User: "I'd like to book a meeting"
Agent: "I have the following slots available..."
User: "First option"
Agent: "Perfect! I've scheduled a meeting for..."
```

## 📋 API Endpoints

- `GET /` - Serve frontend
- `GET /api/faq` - Get FAQ data
- `POST /api/query` - Answer FAQ questions
- `POST /api/lead` - Save lead information
- `GET /api/meeting-slots` - Get available slots
- `POST /api/book-meeting` - Book a meeting
- `POST /api/tts` - Text-to-speech (placeholder for Murf AI)

## 🔧 Configuration

### Customizing FAQ Data
Edit `faq.json` to update:
- Company description
- Features
- Pricing
- Target audience
- Common FAQs

### Meeting Slots
Edit `meeting_slots.json` to change available times

### Murf AI Integration
To use actual Murf AI TTS:
1. Get API key from Murf AI
2. Update `YOUR_MURF_API_KEY` in `app.py`
3. Uncomment the actual API call in `/api/tts` endpoint
4. Update `speak()` method in `script.js` to use `/api/tts`

## 🎨 Features Breakdown

### Speech Recognition
- Continuous listening mode
- Handles Indian English accent
- Auto-restart on silence

### Conversation Flow
1. Greeting
2. Intent detection
3. FAQ answering OR Lead collection
4. Meeting scheduling (optional)
5. End-of-call summary

### Lead Management
- Real-time display of collected data
- Persistent storage in JSON
- Progressive field collection

### Meeting Scheduler
- 3 available slots
- Natural language selection
- Confirmation with details
- Storage in separate JSON

## 🐛 Troubleshooting

**Microphone not working?**
- Ensure browser has microphone permission
- Use Chrome for best compatibility
- Check system microphone settings

**Speech recognition stops?**
- Auto-restart is implemented
- Click "Stop" and "Start" to reset
- Check browser console for errors

**No audio output?**
- Check system volume
- Verify browser can play audio
- Try refreshing the page

## 📝 Data Storage

All data is stored in JSON files:

### lead_data.json
```json
[
  {
    "timestamp": "2025-11-26T10:30:00",
    "name": "John Doe",
    "company": "TechCorp",
    "email": "john@techcorp.com",
    "role": "CTO",
    "use_case": "payment gateway",
    "team_size": "50",
    "timeline": "now"
  }
]
```

### meeting.json
```json
[
  {
    "timestamp": "2025-11-26T10:35:00",
    "name": "John Doe",
    "email": "john@techcorp.com",
    "slot": 1,
    "date": "2025-11-28",
    "time": "11:00 AM IST"
  }
]
```


## 📄 License

Built for Murf AI Voice Agent Challenge - Day 5

