// Database Module - Handles fraud cases storage and retrieval

class FraudDatabase {
    constructor() {
        this.cases = [
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
    }

    // Get all pending cases
    getAllCases() {
        return this.cases;
    }

    // Get case by ID
    getCaseById(caseId) {
        return this.cases.find(c => c.caseId.toLowerCase() === caseId.toLowerCase());
    }

    // Get case by user name (fuzzy match)
    getCaseByName(name) {
        const searchName = name.toLowerCase().trim();
        return this.cases.find(c => {
            const caseName = c.userName.toLowerCase();
            // Match full name or first/last name
            return caseName.includes(searchName) || 
                   searchName.includes(caseName) ||
                   caseName.split(' ').some(part => part.includes(searchName));
        });
    }

    // Get case by case number (e.g., "case one", "case 1", "first case")
    getCaseByCaseNumber(input) {
        const numberMap = {
            'one': 0, 'first': 0, '1': 0,
            'two': 1, 'second': 1, '2': 1,
            'three': 2, 'third': 2, '3': 2,
            'four': 3, 'fourth': 3, '4': 3
        };

        const searchInput = input.toLowerCase().trim();
        
        // Try to find number in the input
        for (const [key, index] of Object.entries(numberMap)) {
            if (searchInput.includes(key)) {
                return this.cases[index];
            }
        }

        return null;
    }

    // Smart search - tries name, case ID, and case number
    searchCase(query) {
        if (!query) return null;

        const cleanQuery = query.toLowerCase().trim();

        // Try case ID first
        let foundCase = this.getCaseById(cleanQuery);
        if (foundCase) return foundCase;

        // Try case number
        foundCase = this.getCaseByCaseNumber(cleanQuery);
        if (foundCase) return foundCase;

        // Try name match
        foundCase = this.getCaseByName(cleanQuery);
        if (foundCase) return foundCase;

        return null;
    }

    // Update case status
    updateCase(caseId, status, outcomeNote) {
        const caseIndex = this.cases.findIndex(c => c.caseId === caseId);
        if (caseIndex !== -1) {
            this.cases[caseIndex].status = status;
            this.cases[caseIndex].outcomeNote = outcomeNote;
            this.cases[caseIndex].updatedAt = new Date().toISOString();
            
            // Save to localStorage for persistence
            this.saveToStorage();
            
            return this.cases[caseIndex];
        }
        return null;
    }

    // Save to localStorage
    saveToStorage() {
        try {
            // Note: In a real implementation, this would save to a backend
            // For demo purposes, we're logging the update
            console.log('Database updated:', JSON.stringify(this.cases, null, 2));
        } catch (error) {
            console.error('Error saving to storage:', error);
        }
    }

    // Get case statistics
    getStatistics() {
        const stats = {
            total: this.cases.length,
            pending: 0,
            confirmedSafe: 0,
            confirmedFraud: 0,
            verificationFailed: 0
        };

        this.cases.forEach(c => {
            if (c.status === 'pending_review') stats.pending++;
            else if (c.status === 'confirmed_safe') stats.confirmedSafe++;
            else if (c.status === 'confirmed_fraud') stats.confirmedFraud++;
            else if (c.status === 'verification_failed') stats.verificationFailed++;
        });

        return stats;
    }

    // Export database as JSON (for demonstration)
    exportJSON() {
        return JSON.stringify(this.cases, null, 2);
    }
}

// Export for use in fraudAgent.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FraudDatabase;
}