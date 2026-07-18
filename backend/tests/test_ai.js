const aiController = require('../controllers/ai_controller');
require('dotenv').config();

// Mock req and res objects
const mockReq = {
    body: { query: 'What is a stack?' },
    user: { id: '00000000-0000-0000-0000-000000000000' } // dummy UUID
};

const mockRes = {
    status: function(code) {
        this.statusCode = code;
        return this;
    },
    json: function(data) {
        console.log('Response Status:', this.statusCode || 200);
        console.log('Response Body:', data);
    }
};

// Run the doubt solver directly to see the full stack trace of any exceptions
async function runTest() {
    console.log('Executing live Doubt Solver controller debug test...');
    try {
        await aiController.solveDoubt(mockReq, mockRes);
    } catch (err) {
        console.error('CRITICAL UNCAUGHT EXCEPTION:', err);
    }
}

runTest();
