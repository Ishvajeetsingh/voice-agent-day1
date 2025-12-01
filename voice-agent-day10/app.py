# app.py
from flask import Flask, render_template, request, jsonify
import os
import uuid
import json
from datetime import datetime

app = Flask(__name__)
SAVED_DIR = "saved_sessions"
if not os.path.exists(SAVED_DIR):
    os.makedirs(SAVED_DIR)

# simple endpoint to save session
@app.route("/save_session", methods=["POST"])
def save_session():
    data = request.json
    sid = data.get("session_id") or str(uuid.uuid4())
    filename = f"{SAVED_DIR}/{sid}.json"
    with open(filename, "w", encoding="utf-8") as f:
        json.dump({
            "saved_at": datetime.utcnow().isoformat()+"z",
            "session_id": sid,
            "data": data
        }, f, ensure_ascii=False, indent=2)
    return jsonify({"ok": True, "session_id": sid, "file": filename})

@app.route("/")
def index():
    return render_template("index.html")

if __name__ == "__main__":
    print("running improv battle server on http://127.0.0.1:5000")
    app.run(debug=True)
