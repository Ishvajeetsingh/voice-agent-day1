from flask import Flask, request, jsonify, render_template, send_from_directory
import json
import os
from datetime import datetime
from flask_cors import CORS

app = Flask(__name__, static_folder="static", template_folder="templates")
CORS(app)

DATA_FILE = "wellness_log.json"

def read_logs():
    if not os.path.exists(DATA_FILE):
        return []
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        try:
            return json.load(f)
        except:
            return []

def write_logs(logs):
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(logs, f, indent=2)

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/history", methods=["GET"])
def history():
    logs = read_logs()
    last = logs[-1] if logs else None
    return jsonify({"last": last, "count": len(logs)})

@app.route("/api/checkin", methods=["POST"])
def checkin():
    data = request.json or {}
    entry = {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "mood": data.get("mood", ""),
        "energy": data.get("energy", ""),
        "stress": data.get("stress", ""),
        "objectives": data.get("objectives", []),
        "summary": data.get("summary", "")
    }
    logs = read_logs()
    logs.append(entry)
    write_logs(logs)
    return jsonify({"ok": True, "entry": entry})

@app.route("/static/<path:path>")
def static_files(path):
    return send_from_directory("static", path)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
