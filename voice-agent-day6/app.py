#!/usr/bin/env python3
"""
Flask Server for Fraud Alert Voice Agent
Run with: python app.py
"""

from flask import Flask, send_from_directory, jsonify, request
from flask_cors import CORS
import json
from datetime import datetime

app = Flask(__name__)
CORS(app)

# Sample fraud cases database
fraud_cases = [
    {
        "caseId": "FRD001",
        "userName": "John Doe",
        "securityIdentifier": "1993",
        "maskedCard": "**** 4242",
        "amount": "₹14,499",
        "merchant": "ABC INDUSTRIES",
        "location": "Mumbai, IN",
        "timestamp": "2025-01-19 14:23 PM",
        "transactionCategory": "e-commerce",
        "transactionSource": "alibaba.com",
        "securityQuestion": "What is your birth city?",
        "securityAnswer": "delhi",
        "status": "pending_review",
        "outcomeNote": None
    },
    {
        "caseId": "FRD002",
        "userName": "Sarah Johnson",
        "securityIdentifier": "1987",
        "maskedCard": "**** 8765",
        "amount": "₹45,230",
        "merchant": "LUXURY WATCHES INC",
        "location": "Dubai, UAE",
        "timestamp": "2025-01-20 09:15 AM",
        "transactionCategory": "luxury goods",
        "transactionSource": "luxurywatches.com",
        "securityQuestion": "What is your pet's name?",
        "securityAnswer": "buddy",
        "status": "pending_review",
        "outcomeNote": None
    },
    {
        "caseId": "FRD003",
        "userName": "Michael Chen",
        "securityIdentifier": "2001",
        "maskedCard": "**** 3456",
        "amount": "₹8,999",
        "merchant": "TECH GADGETS STORE",
        "location": "Singapore, SG",
        "timestamp": "2025-01-21 18:45 PM",
        "transactionCategory": "electronics",
        "transactionSource": "techstore.sg",
        "securityQuestion": "What is your mother's maiden name?",
        "securityAnswer": "wong",
        "status": "pending_review",
        "outcomeNote": None
    },
    {
        "caseId": "FRD004",
        "userName": "Emily Williams",
        "securityIdentifier": "1995",
        "maskedCard": "**** 9012",
        "amount": "₹125,000",
        "merchant": "INTERNATIONAL TRAVEL AGENCY",
        "location": "London, UK",
        "timestamp": "2025-01-22 11:30 AM",
        "transactionCategory": "travel",
        "transactionSource": "travelworld.co.uk",
        "securityQuestion": "What is your favorite color?",
        "securityAnswer": "blue",
        "status": "pending_review",
        "outcomeNote": None
    }
]

@app.route('/')
def index():
    """Serve the main HTML page"""
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    """Serve static files (CSS, JS)"""
    return send_from_directory('.', path)

@app.route('/api/cases', methods=['GET'])
def get_cases():
    """Get all fraud cases"""
    return jsonify(fraud_cases)

@app.route('/api/cases/<case_id>', methods=['GET'])
def get_case(case_id):
    """Get a specific fraud case"""
    case = next((c for c in fraud_cases if c['caseId'] == case_id), None)
    if case:
        return jsonify(case)
    return jsonify({"error": "Case not found"}), 404

@app.route('/api/cases/<case_id>', methods=['POST', 'PUT'])
def update_case(case_id):
    """Update a fraud case"""
    data = request.json
    case_index = next((i for i, c in enumerate(fraud_cases) if c['caseId'] == case_id), None)
    
    if case_index is not None:
        fraud_cases[case_index]['status'] = data.get('status', fraud_cases[case_index]['status'])
        fraud_cases[case_index]['outcomeNote'] = data.get('outcomeNote', fraud_cases[case_index]['outcomeNote'])
        fraud_cases[case_index]['updatedAt'] = datetime.now().isoformat()
        
        print(f"\n{'='*60}")
        print(f"CASE UPDATED: {case_id}")
        print(f"{'='*60}")
        print(json.dumps(fraud_cases[case_index], indent=2))
        print(f"{'='*60}\n")
        
        return jsonify({
            "success": True,
            "case": fraud_cases[case_index]
        })
    
    return jsonify({"error": "Case not found"}), 404

@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Get statistics about fraud cases"""
    stats = {
        "total": len(fraud_cases),
        "pending": sum(1 for c in fraud_cases if c['status'] == 'pending_review'),
        "confirmed_safe": sum(1 for c in fraud_cases if c['status'] == 'confirmed_safe'),
        "confirmed_fraud": sum(1 for c in fraud_cases if c['status'] == 'confirmed_fraud'),
        "verification_failed": sum(1 for c in fraud_cases if c['status'] == 'verification_failed')
    }
    return jsonify(stats)

if __name__ == '__main__':
    print("""
    ╔═══════════════════════════════════════════════════════╗
    ║   SecureBank Fraud Detection Agent Server            ║
    ║   Running on http://localhost:5000                    ║
    ║                                                       ║
    ║   Open your browser and navigate to:                 ║
    ║   http://localhost:5000                               ║
    ╚═══════════════════════════════════════════════════════╝
    """)
    app.run(debug=True, host='0.0.0.0', port=5000)