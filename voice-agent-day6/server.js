// Simple Node.js Server for Fraud Alert Voice Agent
// Run with: node server.js

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Database endpoint (optional - for future API expansion)
app.get('/api/cases', (req, res) => {
    const cases = [
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
        }
    ];
    
    res.json(cases);
});

// Update case endpoint (optional)
app.post('/api/cases/:caseId', (req, res) => {
    const { caseId } = req.params;
    const { status, outcomeNote } = req.body;
    
    console.log(`Case ${caseId} updated:`, { status, outcomeNote });
    
    res.json({ success: true, caseId, status, outcomeNote });
});

// Serve index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`
    ╔═══════════════════════════════════════════════════════╗
    ║   SecureBank Fraud Detection Agent Server            ║
    ║   Running on http://localhost:${PORT}                  ║
    ║                                                       ║
    ║   Open your browser and navigate to:                 ║
    ║   http://localhost:${PORT}                            ║
    ╚═══════════════════════════════════════════════════════╝
    `);
});

module.exports = app;