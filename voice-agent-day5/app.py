from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import json
import os
from datetime import datetime
import requests

app = Flask(__name__, static_folder='static')
CORS(app)

# File paths
FAQ_FILE = 'faq.json'
LEAD_FILE = 'lead_data.json'
MEETING_SLOTS_FILE = 'meeting_slots.json'
MEETING_FILE = 'meeting.json'

# Initialize files if they don't exist
def init_files():
    if not os.path.exists(LEAD_FILE):
        with open(LEAD_FILE, 'w') as f:
            json.dump([], f)
    if not os.path.exists(MEETING_FILE):
        with open(MEETING_FILE, 'w') as f:
            json.dump([], f)

init_files()

@app.route('/')
def index():
    return send_from_directory('static', 'index.html')

@app.route('/api/faq', methods=['GET'])
def get_faq():
    """Load FAQ data"""
    try:
        with open(FAQ_FILE, 'r') as f:
            faq = json.load(f)
        return jsonify(faq)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/query', methods=['POST'])
def query_faq():
    """Answer questions using FAQ"""
    data = request.json
    query = data.get('query', '').lower()
    
    try:
        with open(FAQ_FILE, 'r') as f:
            faq = json.load(f)
        
        # Simple keyword matching
        if any(word in query for word in ['what', 'do', 'does', 'about', 'razorpay']):
            return jsonify({'answer': faq['company']['description']})
        
        if any(word in query for word in ['feature', 'features', 'capability', 'capabilities']):
            features = ', '.join(faq['features'])
            return jsonify({'answer': f"Our key features include: {features}"})
        
        if any(word in query for word in ['price', 'pricing', 'cost', 'charge']):
            return jsonify({'answer': faq['pricing']['description']})
        
        if any(word in query for word in ['who', 'for whom', 'target', 'customers']):
            target = ', '.join(faq['target_audience'])
            return jsonify({'answer': f"Razorpay is perfect for: {target}"})
        
        if any(word in query for word in ['free', 'trial', 'demo']):
            for q in faq['common_faqs']:
                if 'trial' in q['question'].lower():
                    return jsonify({'answer': q['answer']})
        
        if any(word in query for word in ['integrate', 'integration', 'setup']):
            for q in faq['common_faqs']:
                if 'integrate' in q['question'].lower():
                    return jsonify({'answer': q['answer']})
        
        if any(word in query for word in ['support', 'help', 'customer']):
            for q in faq['common_faqs']:
                if 'support' in q['question'].lower():
                    return jsonify({'answer': q['answer']})
        
        # Default response
        return jsonify({'answer': "I can help you with information about what Razorpay does, our features, pricing, who we serve, and common questions. What would you like to know?"})
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/lead', methods=['POST'])
def save_lead():
    """Save lead information"""
    data = request.json
    
    try:
        with open(LEAD_FILE, 'r') as f:
            leads = json.load(f)
        
        lead = {
            'timestamp': datetime.now().isoformat(),
            'name': data.get('name', ''),
            'company': data.get('company', ''),
            'email': data.get('email', ''),
            'role': data.get('role', ''),
            'use_case': data.get('use_case', ''),
            'team_size': data.get('team_size', ''),
            'timeline': data.get('timeline', '')
        }
        
        leads.append(lead)
        
        with open(LEAD_FILE, 'w') as f:
            json.dump(leads, f, indent=2)
        
        return jsonify({'success': True, 'lead': lead})
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/meeting-slots', methods=['GET'])
def get_meeting_slots():
    """Get available meeting slots"""
    try:
        with open(MEETING_SLOTS_FILE, 'r') as f:
            slots = json.load(f)
        return jsonify(slots)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/book-meeting', methods=['POST'])
def book_meeting():
    """Book a meeting slot"""
    data = request.json
    
    try:
        with open(MEETING_FILE, 'r') as f:
            meetings = json.load(f)
        
        meeting = {
            'timestamp': datetime.now().isoformat(),
            'name': data.get('name', ''),
            'email': data.get('email', ''),
            'slot': data.get('slot', ''),
            'date': data.get('date', ''),
            'time': data.get('time', '')
        }
        
        meetings.append(meeting)
        
        with open(MEETING_FILE, 'w') as f:
            json.dump(meetings, f, indent=2)
        
        return jsonify({'success': True, 'meeting': meeting})
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/tts', methods=['POST'])
def text_to_speech():
    """Proxy for Murf AI TTS"""
    data = request.json
    text = data.get('text', '')
    
    try:
        # Murf Falcon demo endpoint
        murf_url = "https://api.murf.ai/v1/speech/generate-with-key"
        
        payload = {
            "text": text,
            "voiceId": "en-US-ken",
            "style": "Conversational",
            "rate": 0,
            "pitch": 0,
            "sampleRate": 48000,
            "format": "MP3",
            "channelType": "STEREO",
            "pronunciationDictionary": {},
            "encodeAsBase64": False,
            "variation": 1,
            "audioDuration": 0,
            "modelVersion": "GEN2"
        }
        
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "api-key": "YOUR_MURF_API_KEY"  # Replace with actual key
        }
        
        # For demo purposes, return a mock response
        # In production, uncomment the actual API call
        # response = requests.post(murf_url, json=payload, headers=headers)
        # return jsonify(response.json())
        
        return jsonify({
            'audioUrl': f'data:audio/mp3;base64,mock_audio_for_{len(text)}_chars',
            'text': text
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)