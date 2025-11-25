from flask import Flask, request, jsonify, render_template, send_from_directory
from flask_cors import CORS
import json, os, re

app = Flask(__name__, template_folder="templates", static_folder="static")
CORS(app)

DATA_PATH = os.path.join("shared-data", "day4_tutor_content.json")
with open(DATA_PATH, "r", encoding="utf-8") as f:
    CONTENT = json.load(f)

STOPWORDS = {
    "the","and","is","in","it","of","a","an","to","so","you",
    "they","that","this","for","with","on","as","be","are","by","or"
}

def find_concept(cid=None):
    if cid:
        for c in CONTENT:
            if c["id"] == cid: return c
    return CONTENT[0]

def tokenize(text):
    text = text.lower()
    text = re.sub(r"[^\w\s]", " ", text)
    return [w for w in text.split() if w and w not in STOPWORDS]

def keywords_from_summary(summary):
    toks, out = tokenize(summary), []
    for w in toks:
        if len(w) > 3 and w not in out:
            out.append(w)
    return out

def jaccard(a,b):
    sa, sb = set(a), set(b)
    if not sa and not sb: return 0
    return len(sa & sb) / len(sa | sb)

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/shared-data/<path:p>")
def shared(p):
    return send_from_directory("shared-data", p)

@app.route("/api/mode", methods=["POST"])
def api_mode():
    body = request.json or {}
    mode = body.get("mode")
    cid = body.get("concept_id")
    c = find_concept(cid)

    if mode == "greet":
        text = "hello! welcome to teach the tutor. please say learn, quiz, or teach back."
        voice = "matthew"

    elif mode == "learn":
        text = f"{c['title']}. {c['summary']}"
        voice = "matthew"

    elif mode == "quiz":
        text = f"{c['title']}. {c['sample_question']}"
        voice = "alicia"

    elif mode == "teach_back":
        text = f"please explain {c['title']} in your own words. prompt: {c['sample_question']}"
        voice = "ken"

    else:
        text = "mode not recognized"
        voice = "matthew"

    return jsonify({"ok": True, "text": text, "voice": voice, "concept": c})

@app.route("/api/respond", methods=["POST"])
def api_respond():
    body = request.json or {}
    mode = body.get("mode")
    cid = body.get("concept_id")
    user_text = (body.get("user_text") or "")
    c = find_concept(cid)

    summary = c["summary"]

    if mode == "quiz":
        keys = keywords_from_summary(summary)
        toks = tokenize(user_text)
        matches = sum(k in toks for k in keys)
        score = min(100, int((matches / (len(keys) or 1)) * 100))

        if score >= 60: fb = "good answer — important points covered."
        elif score >= 30: fb = "partial answer — try adding more details."
        else: fb = "not quite — focus on the main idea."

        return jsonify({"ok": True, "feedback": fb, "score": score, "voice": "alicia"})

    if mode == "teach_back":
        keys = keywords_from_summary(summary)
        toks = tokenize(user_text)
        kw = sum(k in toks for k in keys) / (len(keys) or 1)
        jac = jaccard(keys, toks)
        length = min(1, len(user_text.split())/25)
        score = int((0.5*kw + 0.3*jac + 0.2*length)*100)

        if score >= 75: fb = "great explanation! clear and complete."
        elif score >= 45: fb = "decent explanation — add a bit more detail."
        else: fb = "try again — focus more on key ideas."

        return jsonify({"ok": True, "feedback": fb, "score": score, "voice": "ken"})

    return jsonify({"ok": False}), 400

from urllib.parse import quote

@app.route("/api/tts", methods=["POST"])
def api_tts():
    body = request.json or {}
    text = body.get("text", "")
    voice = body.get("voice", "matthew")

    DEMO = "https://murf-ai-tts-demoserver.onrender.com/api/voice"

    encoded_text = quote(text)
    encoded_voice = quote(voice)

    url = f"{DEMO}?text={encoded_text}&voice={encoded_voice}"

    return jsonify({"ok": True, "url": url})



if __name__ == "__main__":
    app.run(debug=True)
