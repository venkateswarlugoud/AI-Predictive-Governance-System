/*
===============================================================================
 AI-DRIVEN PREDICTIVE MUNICIPAL GOVERNANCE SYSTEM
===============================================================================

A government-grade, AI-assisted decision support system for
municipal grievance management, analytics, and preventive governance.

This README is the COMPLETE and FINAL documentation.
===============================================================================
*/

/*
===============================================================================
 1. PROJECT INTRODUCTION
===============================================================================

Municipal grievance systems in many cities are reactive and manual.
Complaints are handled only after escalation, with limited intelligence
for early warning, trend analysis, or accountability.

This project implements an AI-assisted municipal governance system
that enables authorities to:

- Automatically categorize and prioritize complaints
- Monitor trends across wards and categories
- Detect chronic risk areas (hotspots)
- Detect sudden abnormal increases (spikes)
- Generate formal governance alerts
- Track administrative acknowledgment and resolution

This system is designed as a DECISION-SUPPORT tool,
not an autonomous decision-maker.

Explainability, auditability, and governance safety are core principles.
===============================================================================
*/

/*
===============================================================================
 2. PROBLEM STATEMENT
===============================================================================

Traditional municipal complaint systems suffer from:

- Manual complaint categorization
- Subjective prioritization
- No historical trend analysis
- No early warning for abnormal spikes
- No formal accountability workflow

This leads to:
- Repeated civic issues
- Poor resource allocation
- Delayed response
- Reactive governance

The absence of intelligence-driven planning prevents preventive action.
===============================================================================
*/

/*
===============================================================================
 3. PROJECT OBJECTIVES
===============================================================================

1. Automatically classify complaints using AI
2. Automatically assign priority using AI + rules
3. Store structured historical complaint data
4. Analyze trends by category, ward, priority, and time
5. Identify high-risk wards early (hotspots)
6. Detect abnormal increases in complaints (spikes)
7. Generate formal governance alerts
8. Track acknowledgment and resolution by authorities
9. Maintain explainable and auditable intelligence

===============================================================================
*/

/*
===============================================================================
 4. SYSTEM SCOPE & PHILOSOPHY
===============================================================================

- This system SUPPORTS decisions; it does NOT replace authorities
- AI outputs are advisory, not binding
- Rule-based refinement ensures transparency
- All decisions are traceable and auditable

Target usage:
- Smart city pilots
- Academic evaluation
- Demonstration of AI in public administration

Stability and explainability are prioritized over novelty.
===============================================================================
*/

/*
===============================================================================
 5. SYSTEM ARCHITECTURE (HIGH LEVEL)
===============================================================================

Frontend (React + Vite)
        |
        | REST APIs (JWT Authentication)
        |
Backend (Node.js + Express)
        |
        | HTTP
        |
AI Service (Python FastAPI)
        |
        |
MongoDB

Ports:
- Frontend : 5173
- Backend  : 5000
- AI       : 8000
===============================================================================
*/

/*
===============================================================================
 6. TECHNOLOGY STACK
===============================================================================

Frontend:
- React.js
- Vite
- Axios
- Chart.js / Recharts

Backend:
- Node.js
- Express.js
- JWT Authentication
- Role-based Authorization

Database:
- MongoDB
- Mongoose ODM

AI / ML:
- Python
- FastAPI
- TF-IDF Vectorization
- Naive Bayes Classification
- Rule-based refinement layer

===============================================================================
*/

/*
===============================================================================
 7. CORE FEATURES (PHASE-1 IMPLEMENTED)
===============================================================================

Complaint Management:
- Citizen complaint submission
- Status tracking
- Role-based access

AI Intelligence:
- Automatic category prediction
- Automatic priority prediction
- Confidence scores
- Explainable rule refinement

Analytics:
- Category analytics
- Priority analytics
- Monthly trends
- Ward trends

Monitoring:
- Hotspot detection (chronic risk areas)
- Spike detection (early warning)

Governance:
- Alert generation
- Alert acknowledgment
- Alert resolution workflow
- Administrative accountability

PHASE-1 STATUS:
FROZEN (NO BACKEND LOGIC CHANGES ALLOWED)
===============================================================================
*/

/*
===============================================================================
 8. USER ROLES
===============================================================================

Citizen:
- Submit complaints
- View own complaint status

Admin (Municipal Officer):
- View all complaints
- Monitor hotspots and spikes
- Analyze trends and forecasts
- Manage governance alerts
- Acknowledge and resolve alerts
===============================================================================
*/

/*
===============================================================================
 9. REPOSITORY STRUCTURE
===============================================================================

project-root/
│
├── client/        // React frontend
├── server/        // Node.js backend
├── ai/            // Python FastAPI AI service
├── .env.example
├── README.md

===============================================================================
*/

/*
===============================================================================
 10. PREREQUISITES (MANDATORY)
===============================================================================

1. Node.js (v18 or higher)
2. Python (v3.9 or higher)
3. MongoDB (local or Atlas)
4. Git

===============================================================================
*/

/*
===============================================================================
 11. ENVIRONMENT VARIABLES SETUP
===============================================================================

Create .env file at project root.

Command:
cp .env.example .env

Paste the following:

PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/municipal_governance
JWT_SECRET=replace_with_secure_secret
AI_SERVICE_URL=http://localhost:8000/predict
VITE_API_BASE_URL=http://localhost:5000

IMPORTANT:
- Do NOT commit .env
- Only commit .env.example

===============================================================================
*/

/*
===============================================================================
 12. BACKEND SETUP (NODE.JS)
===============================================================================

cd server
npm install

Explicit packages (reference):
npm install express mongoose cors dotenv jsonwebtoken axios
npm install --save-dev nodemon

Start backend:
npm run dev

Backend URL:
http://localhost:5000

===============================================================================
*/

/*
===============================================================================
 13. AI SERVICE SETUP (PYTHON FASTAPI)
===============================================================================

cd ai
python -m venv venv

Activate venv:

Windows:
venv\Scripts\activate

Linux/macOS:
source venv/bin/activate

Install dependencies:
pip install -r requirements.txt

pip install sentence-transformers


Start AI service:
python -m uvicorn api.app:app --reload --port 8000
pip install hf_xet(optional)


AI URL:
http://localhost:8000

===============================================================================
*/

/*
===============================================================================
 14. FRONTEND SETUP (REACT + VITE)
===============================================================================

cd client
npm install

Explicit packages (reference):
npm install axios react-router-dom chart.js react-chartjs-2

Start frontend:
npm run dev

Frontend URL:
http://localhost:5173

===============================================================================
*/

/*
===============================================================================
 15. RUN ORDER (IMPORTANT)
===============================================================================

1. MongoDB
2. AI Service (port 8000)
3. Backend Server (port 5000)
4. Frontend (port 5173)

===============================================================================
*/

/*
===============================================================================
 16. SECURITY & GOVERNANCE
===============================================================================

- JWT-based authentication
- Role-based access control
- No direct database exposure
- AI outputs are explainable
- Governance actions are auditable

===============================================================================
*/

/*
===============================================================================
 17. IMPORTANT RULES FOR TEAM MEMBERS
===============================================================================

- DO NOT modify Phase-1 backend logic
- DO NOT change AI models
- DO NOT commit .env
- Use separate branch for Phase-2
- Stability > experimentation

===============================================================================
*/

/*
===============================================================================
 END OF README
===============================================================================
*/
