from flask import Flask, render_template, request, jsonify, session
import requests
import os
from dotenv import load_dotenv
from game_state import GameState
import json
import uuid

load_dotenv()

app = Flask(__name__)
app.secret_key = os.urandom(24)

# Store game states per session
game_sessions = {}

SYSTEM_PROMPT = """You are an expert Game Master running an immersive Dark Fantasy D&D-style adventure. 

YOUR ROLE:
- Create vivid, atmospheric descriptions that engage all the senses
- Ask the player what they do after each scene description
- React dynamically to player choices and maintain continuity
- Be dramatic, engaging, and occasionally inject humor or tension
- Track the game state and update it after significant events

TONE: Dramatic and immersive, with hints of mystery and danger. Describe scenes cinematically.

UNIVERSE: Dark Fantasy
- Medieval setting with magic, monsters, and ancient ruins
- Danger lurks in shadows; choices have consequences
- NPCs have motivations and remember the player's actions
- The world feels alive and reactive

GAME STATE TRACKING:
You have access to a JSON world state that tracks:
- Player stats (HP, inventory, gold, traits)
- Current location and connections
- NPCs and their attitudes
- Quests and objectives
- Recent events

IMPORTANT INSTRUCTIONS:
1. Always end your response with a question prompting player action (e.g., "What do you do?", "How do you respond?")
2. When something significant happens (combat, finding items, meeting NPCs, completing objectives), you MUST include a STATE_UPDATE block
3. Keep responses concise but evocative (2-4 paragraphs max)
4. Never break character or mention that you're an AI

STATE UPDATE FORMAT:
When the game state changes, include this at the END of your response:

[STATE_UPDATE]
{{
  "player": {{"hp": 85, "inventory": ["torch", "magic sword"]}},
  "location": {{"name": "Dark Cave", "description": "A damp cave"}},
  "events": {{"description": "Found a magic sword", "importance": "major"}},
  "quests": [{{"name": "Quest Name", "objectives": [{{"task": "task", "completed": true}}]}}]
}}
[/STATE_UPDATE]

Only include the fields that have CHANGED. If nothing changed, don't include STATE_UPDATE.

CURRENT GAME STATE:
{game_state}

Now, continue the adventure!"""

def get_game_state(session_id):
    if session_id not in game_sessions:
        game_sessions[session_id] = {
            'state': GameState(),
            'messages': []
        }
    return game_sessions[session_id]

def extract_state_update(text):
    """Extract state update from GM response"""
    if "[STATE_UPDATE]" in text:
        try:
            start = text.find("[STATE_UPDATE]") + len("[STATE_UPDATE]")
            end = text.find("[/STATE_UPDATE]")
            if end > start:
                json_str = text[start:end].strip()
                updates = json.loads(json_str)
                # Remove the STATE_UPDATE block from the displayed text
                clean_text = text[:text.find("[STATE_UPDATE]")].strip()
                return clean_text, updates
        except json.JSONDecodeError:
            pass
    return text, None

@app.route('/')
def index():
    # Create a new session ID if not exists
    if 'session_id' not in session:
        session['session_id'] = str(uuid.uuid4())
    return render_template('index.html')

@app.route('/start', methods=['POST'])
def start_game():
    session_id = session.get('session_id')
    game_session = get_game_state(session_id)
    
    # Reset game state
    game_session['state'] = GameState()
    game_session['messages'] = []
    
    initial_message = """You stand at the entrance to the Ancient Forest. The sun is setting, casting long shadows between the towering trees. A cool mist rolls along the forest floor, and you hear strange, melodic sounds echoing from deep within the woods.

The village elder's warning echoes in your mind: "Many have entered seeking the source of those haunting melodies. None have returned."

Your torch flickers in your hand. The path ahead splits in two - one winds deeper into darkness, the other follows the forest's edge toward what might be the village.

What do you do?"""
    
    game_session['messages'].append({
        'role': 'assistant',
        'content': initial_message
    })
    
    return jsonify({
        'message': initial_message,
        'game_state': game_session['state'].get_state_dict()
    })

@app.route('/send_message', methods=['POST'])
def send_message():
    try:
        session_id = session.get('session_id')
        game_session = get_game_state(session_id)
        
        user_message = request.json.get('message', '')
        
        if not user_message:
            return jsonify({'error': 'No message provided'}), 400
        
        print(f"Received message: {user_message}")
        
        # Add user message to history
        game_session['messages'].append({
            'role': 'user',
            'content': user_message
        })
        
        print("Preparing API request")
        
        # Prepare messages with system prompt
        system_prompt = SYSTEM_PROMPT.format(
            game_state=game_session['state'].get_summary()
        )
        
        messages = [
            {"role": "system", "content": system_prompt}
        ] + game_session['messages']
        
        print(f"Sending {len(messages)} messages to API")
        
        # Call Groq API using requests
        api_response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {os.getenv('GROQ_API_KEY')}",
                "Content-Type": "application/json"
            },
            json={
                "model": "llama-3.3-70b-versatile",
                "messages": messages,
                "max_tokens": 1000,
                "temperature": 0.8
            },
            timeout=30
        )
        
        if api_response.status_code != 200:
            error_detail = api_response.json() if api_response.text else {"error": "Unknown error"}
            print(f"API Error: {api_response.status_code} - {error_detail}")
            return jsonify({'error': f'API returned error: {error_detail}'}), api_response.status_code
        
        response_data = api_response.json()
        gm_message = response_data['choices'][0]['message']['content']
        print(f"Received response from API")
        
        # Extract and apply state updates
        clean_message, state_updates = extract_state_update(gm_message)
        
        if state_updates:
            try:
                game_session['state'].update_state(state_updates)
                print(f"State updated: {state_updates}")
            except Exception as e:
                print(f"Error updating state: {e}")
                # Continue without state update
        
        # Add GM message to history (with STATE_UPDATE removed)
        game_session['messages'].append({
            'role': 'assistant',
            'content': clean_message
        })
        
        return jsonify({
            'message': clean_message,
            'game_state': game_session['state'].get_state_dict()
        })
    
    except Exception as e:
        error_msg = str(e)
        print(f"Error details: {error_msg}")
        
        # Check if it's an API key issue
        if "api_key" in error_msg.lower() or "authentication" in error_msg.lower():
            return jsonify({'error': 'API Key error. Please check your DeepSeek API key in .env file'}), 401
        
        # Check if it's a rate limit
        if "rate_limit" in error_msg.lower() or "429" in error_msg:
            return jsonify({'error': 'Rate limit exceeded. Please wait a moment and try again.'}), 429
        
        # Generic error
        return jsonify({'error': f'API Error: {error_msg}'}), 500

@app.route('/get_state', methods=['GET'])
def get_state():
    session_id = session.get('session_id')
    game_session = get_game_state(session_id)
    return jsonify(game_session['state'].get_state_dict())

@app.route('/text_to_speech', methods=['POST'])
def text_to_speech():
    """Placeholder for TTS - you can integrate Murf Falcon here"""
    text = request.json.get('text', '')
    # For now, return success - integrate with Murf Falcon API
    return jsonify({'success': True, 'audio_url': None})

if __name__ == '__main__':
    app.run(debug=True, port=5000)