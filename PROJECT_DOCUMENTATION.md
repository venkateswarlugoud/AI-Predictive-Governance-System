# AI-Predictive-Governance-System - Complete Project Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [System Architecture](#system-architecture)
3. [Technology Stack](#technology-stack)
4. [Core Features](#core-features)
5. [Database Models](#database-models)
6. [API Endpoints](#api-endpoints)
7. [AI/ML Components](#aiml-components)
8. [Frontend Structure](#frontend-structure)
9. [Backend Services & Business Logic](#backend-services--business-logic)
10. [File Structure](#file-structure)
11. [Setup Instructions](#setup-instructions)
12. [Important Notes & Constraints](#important-notes--constraints)

---

## Project Overview

**AI-Predictive-Governance-System** is a government-grade, AI-assisted decision support system for municipal grievance management, analytics, and preventive governance. The system enables municipal authorities to automatically categorize and prioritize complaints, monitor trends, detect chronic risk areas (hotspots), detect sudden abnormal increases (spikes), and generate formal governance alerts.

### Key Objectives
- Automatically classify complaints using AI
- Automatically assign priority using AI + rules
- Store structured historical complaint data
- Analyze trends by category, ward, priority, and time
- Identify high-risk wards early (hotspots)
- Detect abnormal increases in complaints (spikes)
- Generate formal governance alerts
- Track acknowledgment and resolution by authorities
- Maintain explainable and auditable intelligence

### Philosophy
- **Decision-Support Tool**: Supports decisions; does NOT replace authorities
- **AI outputs are advisory**, not binding
- **Rule-based refinement** ensures transparency
- **All decisions are traceable** and auditable
- **Explainability and auditability** are core principles

---

## System Architecture

### High-Level Architecture
```
Frontend (React + Vite) - Port 5173
        |
        | REST APIs (JWT Authentication)
        |
Backend (Node.js + Express) - Port 5000
        |
        | HTTP
        |
AI Service (Python FastAPI) - Port 8000
        |
        |
MongoDB (Local or Atlas)
```

### Component Communication
- Frontend communicates with Backend via REST APIs
- Backend communicates with AI Service via HTTP POST requests
- Backend stores data in MongoDB using Mongoose ODM
- Authentication uses JWT tokens stored in HTTP-only cookies

---

## Technology Stack

### Frontend
- **React.js** (v19.1.0) - UI framework
- **Vite** (v7.0.4) - Build tool and dev server
- **React Router DOM** (v7.12.0) - Routing
- **Axios** (v1.13.2) - HTTP client
- **Chart.js** (v4.5.1) & **Recharts** (v3.6.0) - Data visualization
- **Tailwind CSS** (v4.1.11) - Styling

### Backend
- **Node.js** (v18+) - Runtime
- **Express.js** (v5.2.1) - Web framework
- **Mongoose** (v8.21.0) - MongoDB ODM
- **JWT** (jsonwebtoken v9.0.3) - Authentication
- **bcryptjs** (v3.0.2) - Password hashing
- **Axios** (v1.13.2) - HTTP client for AI service
- **Nodemailer** (v8.0.1) - Email notifications
- **Cloudinary** (v2.7.0) - Image storage (if needed)
- **Natural** (v8.1.0) - NLP utilities

### Database
- **MongoDB** - NoSQL database
- **Mongoose** - ODM for MongoDB

### AI/ML Service
- **Python** (v3.9+)
- **FastAPI** (v0.131.0) - Web framework
- **Sentence Transformers** (v5.2.3) - Embedding generation
- **scikit-learn** (v1.8.0) - Machine learning models
- **joblib** (v1.5.3) - Model serialization
- **pandas** (v3.0.1) - Data manipulation
- **numpy** (v2.4.2) - Numerical operations

---

## Core Features

### 1. Complaint Management
- **Citizen Features**:
  - Submit complaints with title, description, location, and ward
  - View own complaint status
  - Track complaint history
  
- **Admin Features**:
  - View all complaints
  - Update complaint status (New → In Progress → Resolved)
  - View complaint details

### 2. AI Intelligence
- **Automatic Category Prediction**:
  - Categories: Sanitation, Roads, Electricity, Water, Uncertain
  - Uses sentence transformer embeddings + classifier
  - Confidence threshold: < 0.65 returns "Uncertain"
  - Text normalization for robustness (handles typos, informal English)
  
- **Automatic Priority Prediction**:
  - Priorities: Low, Medium, High
  - Uses ML model with rule-based refinement
  - Confidence scores provided
  
- **Confidence Governance**:
  - Low confidence predictions require human review
  - Decision status tracking (AI_CONFIRMED, AI_SUGGESTED, REQUIRES_REVIEW, etc.)
  - Model version tracking for auditability

### 3. Analytics
- **Category Analytics**: Distribution of complaints by category
- **Priority Analytics**: Distribution by priority level
- **Monthly Trends**: Time-series analysis of complaints
- **Ward Trends**: Geographic analysis by ward
- **Repeat Analytics**: Analysis of recurring issues

### 4. Monitoring & Detection
- **Hotspot Detection**:
  - Identifies chronic risk areas (ward + category combinations)
  - Time window: Last 30 days
  - Minimum complaints: 10
  - Hotspot score threshold: 25
  - Score calculation: Sum(priorityWeight × complaintCount)
  - Priority weights: High=3, Medium=2, Low=1
  - Severity levels: Medium (25-34), High (35+)
  
- **Spike Detection**:
  - Detects abnormal increases in complaints
  - Current window: Last 7 days
  - Baseline window: Days 8-37 ago (30 days)
  - Spike multiplier threshold: 2.0x
  - Minimum baseline complaints: 5
  - Severity levels: Moderate (2.0-2.9x), Severe (3.0x+)

### 5. Governance & Alerts
- **Alert Generation**:
  - Automatically generated from hotspots (severity "High") and spikes (severity "Severe")
  - Duplicate prevention: 30-day window
  - Alert types: HOTSPOT_ALERT, SPIKE_ALERT
  - Human-readable descriptions (no technical jargon)
  
- **Alert Workflow**:
  - Status: Open → Acknowledged → Resolved
  - Acknowledgment tracking (who, when)
  - Resolution notes for administrative closure
  - Full audit trail

### 6. SLA & Escalation
- **SLA Tracking**: Service Level Agreement monitoring
- **Escalation Levels**: Automatic escalation based on complaint age and priority

### 7. Notifications
- **Email Notifications**:
  - Complaint acknowledgment
  - Status updates
  - Resolution confirmations
  - Rate limiting to prevent spam
  - SMTP configuration required

### 8. Similarity & Embeddings
- **Text Embedding**: Generate embeddings for complaint text
- **Similarity Detection**: Find similar complaints using cosine similarity
- **Duplicate Detection**: Identify potential duplicate complaints

---

## Database Models

### User Model
```javascript
{
  name: String (required),
  email: String (required, unique, lowercase),
  password: String (required, minlength: 6, hashed),
  role: String (enum: ["citizen", "admin"], default: "citizen"),
  timestamps: true
}
```

### Complaint Model
```javascript
{
  title: String (required),
  description: String (required),
  category: String (enum: ["Sanitation", "Roads", "Electricity", "Water", "Uncertain"], required, indexed),
  categoryConfidence: Number,
  categorySource: String (enum: ["AI", "RULE", "HUMAN"], default: "RULE"),
  categoryDecisionStatus: String (enum: ["AI_CONFIRMED", "AI_SUGGESTED", "REQUIRES_REVIEW", "FALLBACK_RULE", "INVALID_INPUT", "INVALID_CONFIDENCE"]),
  priority: String (enum: ["Low", "Medium", "High"], required, indexed),
  priorityConfidence: Number,
  prioritySource: String (enum: ["AI", "RULE", "HUMAN"], default: "RULE"),
  priorityDecisionStatus: String (enum: ["AI_CONFIRMED", "AI_SUGGESTED", "REQUIRES_REVIEW", "FALLBACK_RULE", "INVALID_INPUT", "INVALID_CONFIDENCE"]),
  aiModelVersion: String,
  location: String (required),
  ward: String (required, indexed),
  status: String (enum: ["New", "In Progress", "Resolved"], default: "New", indexed),
  user: ObjectId (ref: "User", required),
  complaintMonth: Number (auto-calculated),
  complaintYear: Number (auto-calculated),
  lastNotifiedAt: Date,
  apologySent: Boolean (default: false),
  timestamps: true
}
```

### Alert Model
```javascript
{
  alertType: String (enum: ["HOTSPOT_ALERT", "SPIKE_ALERT"], required, indexed),
  ward: String (required, indexed),
  category: String (required, indexed),
  severity: String (enum: ["High", "Severe", "Medium", "Moderate"], required),
  referenceScore: Number (required), // hotspotScore or spikeRatio
  description: String (required), // Human-readable
  status: String (enum: ["Open", "Acknowledged", "Resolved"], default: "Open", indexed),
  acknowledgedBy: ObjectId (ref: "User"),
  acknowledgedAt: Date,
  resolutionNote: String,
  resolvedAt: Date,
  timestamps: true
}
```

### Ward Model
- Stores ward information (city, ward name, etc.)
- Used for geographic organization

---

## API Endpoints

### Authentication (`/api/auth`)
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user

### Complaints (`/api/complaint`)
- `POST /api/complaint` - Create complaint (Citizen, Protected)
- `GET /api/complaint/my` - Get user's complaints (Citizen, Protected)
- `GET /api/complaint` - Get all complaints (Admin, Protected)
- `GET /api/complaint/:id` - Get complaint by ID (Admin, Protected)
- `PUT /api/complaint/:id` - Update complaint status (Admin, Protected)

### Analytics (`/api/analytics`)
- `GET /api/analytics/category` - Category distribution (Admin)
- `GET /api/analytics/priority` - Priority distribution (Admin)
- `GET /api/analytics/monthly` - Monthly trends (Admin)
- `GET /api/analytics/ward` - Ward trends (Admin)
- `GET /api/analytics/repeat` - Repeat analytics (Admin)

### Hotspots (`/api/hotspots`)
- `GET /api/hotspots` - Get all hotspots (Admin, Protected)

### Spikes (`/api/spikes`)
- `GET /api/spikes` - Get all spikes (Admin, Protected)

### Alerts (`/api/alerts`)
- `GET /api/alerts` - Get all alerts (Admin, Protected)
- `POST /api/alerts/generate` - Manually trigger alert generation (Admin, Protected)
- `PUT /api/alerts/:id/acknowledge` - Acknowledge alert (Admin, Protected)
- `PUT /api/alerts/:id/resolve` - Resolve alert (Admin, Protected)

### SLA (`/api/sla`)
- `GET /api/sla/summary` - Get SLA summary (Admin, Protected)
- `GET /api/sla/by-complaint/:id` - Get SLA for specific complaint (Admin, Protected)

### Escalation (`/api/escalation`)
- `GET /api/escalation/summary` - Get escalation summary (Admin, Protected)
- `GET /api/escalation/by-complaint/:id` - Get escalation for complaint (Admin, Protected)

### Embeddings (`/api/embeddings`)
- `POST /api/embeddings/embed` - Generate text embedding
- `POST /api/embeddings/similarity` - Calculate similarity between texts

### Wards (`/api/wards`)
- `GET /api/wards` - Get all wards
- `GET /api/cities` - Get all cities

### Notifications (`/api/notifications`)
- Notification-related endpoints (Admin)

### Debug (`/api/debug`)
- Debug endpoints for development

---

## AI/ML Components

### AI Service (FastAPI - Port 8000)

#### Endpoints:
- `POST /predict` - Predict category and priority for complaint text
  - Input: `{ "text": "complaint description" }`
  - Output: 
    ```json
    {
      "category": "Sanitation",
      "categoryConfidence": 0.85,
      "priority": "High",
      "priorityConfidence": 0.78,
      "decision": "AI_PREDICTED",
      "model_version": "1.0"
    }
    ```

- `POST /embed` - Generate text embedding
  - Input: `{ "text": "complaint text" }`
  - Output: `{ "embedding": [array of numbers] }`

- `POST /similarity` - Calculate similarity between two texts
  - Input: `{ "text1": "...", "text2": "..." }`
  - Output: 
    ```json
    {
      "similarityScore": 0.85,
      "level": "HIGHLY_SIMILAR" // or "RELATED" or "UNRELATED"
    }
    ```

### ML Models

#### Category Model (`ai/model/category_model.pkl`)
- **Type**: SemanticClassifier (sentence transformer + classifier)
- **Embedding Model**: all-MiniLM-L6-v2 (SentenceTransformer)
- **Classifier**: scikit-learn classifier (likely Naive Bayes or similar)
- **Classes**: ["Sanitation", "Roads", "Electricity", "Water", "Uncertain"]
- **Confidence Threshold**: 0.65 (below returns "Uncertain")

#### Priority Model (`ai/model/priority_model.pkl`)
- **Type**: SemanticClassifier
- **Classes**: ["Low", "Medium", "High"]
- **Uses same embedding model as category model**

### Text Processing
- **Text Normalization** (`ai/scripts/text_normalizer.py`):
  - Handles typos, informal English
  - Normalizes text for robustness
  - Used during both training and inference

### Training Scripts
- `ai/scripts/train_model.py` - Train category and priority models
- `ai/scripts/generate_dataset.py` - Generate training dataset
- `ai/scripts/semantic_classifier.py` - SemanticClassifier class definition

---

## Frontend Structure

### Pages (`client/src/pages/`)
- `LandingPage.jsx` - Landing/home page
- `LoginPage.jsx` - User login
- `RegisterPage.jsx` - User registration
- `Dashboard.jsx` - Citizen dashboard
- `CreateComplaint.jsx` - Submit new complaint
- `MyComplaints.jsx` - View own complaints
- `AdminDashboard.jsx` - Admin dashboard
- `HotspotsView.jsx` - View hotspots (Admin)
- `SpikesView.jsx` - View spikes (Admin)
- `AlertsListView.jsx` - List all alerts (Admin)
- `AlertDetailView.jsx` - Alert details (Admin)
- `ComplaintDetailView.jsx` - Complaint details (Admin)
- `ProfilePage.jsx` - User profile

### Components (`client/src/components/`)
- `Navbar.jsx` - Navigation bar
- `PrivateRoute.jsx` - Protected route wrapper
- `AdminRoute.jsx` - Admin-only route wrapper
- `ConfirmationModal.jsx` - Confirmation dialogs
- `ForgotPasswordModal.jsx` - Password reset modal

### Context (`client/src/context/`)
- `AuthContext.jsx` - Authentication state management

### API Services (`client/src/api/`)
- `axios.js` - Axios instance configuration
- `auth.js` - Authentication API calls
- `adminServices.js` - Admin API calls

### Routing (`client/src/App.jsx`)
- Public routes: `/`, `/login`, `/register`
- Citizen routes: `/dashboard`, `/complaint/create`, `/my-complaints`, `/profile`
- Admin routes: `/admin`, `/admin/hotspots`, `/admin/spikes`, `/admin/alerts`, `/admin/complaints/:id`

---

## Backend Services & Business Logic

### Core Services (`server/services/`)

#### `aiService.js`
- `predictComplaint(text)` - Calls AI service to predict category and priority
- Uses `AI_SERVICE_URL` environment variable

#### `confidenceGovernance.js`
- `evaluateConfidence(category, confidence)` - Applies confidence thresholds
- Determines decision status (AI_CONFIRMED, AI_SUGGESTED, REQUIRES_REVIEW, etc.)
- Returns source (AI, RULE, HUMAN) and decision status

#### `hotspotService.js`
- `identifyHotspots()` - Identifies chronic risk areas
- Uses MongoDB aggregation pipeline
- Calculates hotspot scores based on priority-weighted complaint counts
- Returns hotspots with severity levels

#### `spikeDetectionService.js`
- `detectSpikes()` - Detects abnormal increases
- Compares current 7-day window with 30-day baseline
- Calculates spike ratios
- Returns spikes with severity levels

#### `alertService.js`
- `generateAlerts()` - Generates alerts from hotspots and spikes
- `isDuplicateAlert()` - Prevents duplicate alerts within 30 days
- Creates alerts only for high-severity hotspots and severe spikes
- Generates human-readable descriptions

#### `slaService.js`
- `computeSlaForComplaint(complaint)` - Calculates SLA metrics
- Tracks service level agreement compliance

#### `escalationService.js`
- `deriveEscalationLevel(complaint)` - Determines escalation level
- Based on complaint age and priority

#### `notificationService.js`
- Email notification functions
- Rate limiting
- SMTP configuration and verification
- Email templates for acknowledgment, resolution, status updates

### Controllers (`server/controllers/`)

#### `complaintController.js`
- `createComplaint()` - Main complaint creation logic
  - Validates input
  - Calls AI service for prediction
  - Applies confidence governance
  - Creates complaint with governance metadata
  - Sends acknowledgment email
  
- `getAllComplaints()` - Admin view of all complaints
- `getMyComplaints()` - Citizen view of own complaints
- `getComplaintById()` - Get single complaint
- `updateComplaintStatus()` - Update complaint status (Admin)

#### `alertController.js`
- `getAllAlerts()` - Get all alerts
- `triggerAlertGeneration()` - Manually generate alerts
- `acknowledgeAlert()` - Acknowledge alert
- `resolveAlert()` - Resolve alert with notes

#### `analyticsController.js`
- Various analytics endpoints
- Category, priority, monthly, ward, repeat analytics

#### Other Controllers
- `hotspotController.js` - Hotspot endpoints
- `spikeController.js` - Spike endpoints
- `slaController.js` - SLA endpoints
- `escalationController.js` - Escalation endpoints
- `userController.js` - User management
- `wardController.js` - Ward management
- `notificationController.js` - Notification management

### Middleware (`server/middleware/`)
- `auth.js` - JWT authentication middleware (`protectRoute`)
- `roleMiddleware.js` - Role-based authorization (`adminOnly`)

### Models (`server/models/`)
- `Complaint.js` - Complaint schema
- `User.js` - User schema
- `Alert.js` - Alert schema
- `Ward.js` - Ward schema
- `Notification.js` - Notification schema

---

## File Structure

```
AI-Predictive-Governance-System/
│
├── client/                    # React Frontend
│   ├── src/
│   │   ├── api/              # API service functions
│   │   ├── components/       # Reusable components
│   │   ├── context/          # React context (Auth)
│   │   ├── pages/            # Page components
│   │   ├── App.jsx           # Main app component with routing
│   │   ├── main.jsx          # Entry point
│   │   └── index.css         # Global styles
│   ├── public/               # Static assets
│   ├── package.json
│   └── vite.config.js
│
├── server/                    # Node.js Backend
│   ├── config/
│   │   ├── db.js             # MongoDB connection
│   │   ├── cloudinary.js    # Cloudinary config
│   │   └── utils.js          # Utility functions
│   ├── controllers/          # Request handlers
│   ├── middleware/           # Auth & role middleware
│   ├── models/               # Mongoose schemas
│   ├── routes/               # Express routes
│   ├── services/             # Business logic services
│   ├── embeddings/           # Embedding-related code
│   ├── scripts/              # Seed scripts
│   ├── server.js             # Entry point
│   └── package.json
│
├── ai/                        # Python AI Service
│   ├── api/
│   │   └── app.py            # FastAPI application
│   ├── scripts/
│   │   ├── train_model.py   # Model training
│   │   ├── semantic_classifier.py  # Classifier class
│   │   ├── text_normalizer.py      # Text normalization
│   │   └── generate_dataset.py     # Dataset generation
│   ├── model/
│   │   ├── category_model.pkl     # Trained category model
│   │   └── priority_model.pkl     # Trained priority model
│   ├── data/
│   │   └── complaints.csv   # Training data
│   └── requirements.txt
│
├── README.md                  # Main project README
└── PROJECT_DOCUMENTATION.md   # This document
```

---

## Setup Instructions

### Prerequisites
1. Node.js (v18 or higher)
2. Python (v3.9 or higher)
3. MongoDB (local or Atlas)
4. Git

### Environment Variables
Create `.env` file at project root:
```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/municipal_governance
JWT_SECRET=replace_with_secure_secret
AI_SERVICE_URL=http://localhost:8000/predict
VITE_API_BASE_URL=http://localhost:5000

# SMTP Configuration (for email notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=your_email@gmail.com
```

### Backend Setup
```bash
cd server
npm install
npm run dev  # Starts on port 5000
```

### AI Service Setup
```bash
cd ai
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/macOS
source venv/bin/activate

pip install -r requirements.txt
python -m uvicorn api.app:app --reload --port 8000
```

### Frontend Setup
```bash
cd client
npm install
npm run dev  # Starts on port 5173
```

### Run Order
1. MongoDB (must be running)
2. AI Service (port 8000)
3. Backend Server (port 5000)
4. Frontend (port 5173)

---

## Important Notes & Constraints

### Phase-1 Status: FROZEN
- **DO NOT modify Phase-1 backend logic**
- **DO NOT change AI models**
- **DO NOT commit .env files**
- Use separate branch for Phase-2 features
- Stability > experimentation

### Governance Principles
- AI outputs are **advisory**, not binding
- All decisions are **traceable** and **auditable**
- Low confidence predictions require **human review**
- Rule-based refinement ensures **transparency**
- Model version tracking for **governance compliance**

### Security
- JWT-based authentication
- Role-based access control (Citizen vs Admin)
- Password hashing with bcrypt
- HTTP-only cookies for tokens
- No direct database exposure

### AI Service Integration
- Backend calls AI service via HTTP POST
- Timeout: 10 seconds
- Fallback to rule-based system if AI unavailable
- Confidence thresholds ensure quality

### Alert Generation Rules
- Hotspots: Only "High" severity generate alerts
- Spikes: Only "Severe" severity generate alerts
- Duplicate prevention: 30-day window
- Human-readable descriptions (no ML jargon)

### Notification System
- Email notifications for complaint events
- Rate limiting prevents spam
- SMTP configuration required at startup
- Verification on server start

### Data Models
- All models include timestamps
- Indexed fields for performance
- References between models (User, Complaint, Alert)
- Pre-save hooks for auto-calculation (complaintMonth, complaintYear)

---

## Key Algorithms & Logic

### Hotspot Score Calculation
```
hotspotScore = Σ(priorityWeight × complaintCount)
where:
  High priority weight = 3
  Medium priority weight = 2
  Low priority weight = 1

Threshold: hotspotScore >= 25
Severity: Medium (25-34), High (35+)
```

### Spike Detection
```
baselineWeeklyAvg = (baselineTotalCount × 7) / 30
spikeRatio = currentWeekCount / baselineWeeklyAvg

Threshold: spikeRatio >= 2.0 AND baselineWeeklyAvg >= 5
Severity: Moderate (2.0-2.9), Severe (3.0+)
```

### Confidence Governance
```
Category:
  - confidence >= 0.65: AI_CONFIRMED
  - confidence < 0.65: REQUIRES_REVIEW → "Uncertain"

Priority:
  - Uses ML prediction with rule-based refinement
  - Always returns valid priority (Low/Medium/High)
```

---

## Common Use Cases for Adding Features

When adding new features, consider:

1. **User Roles**: Is it for Citizen, Admin, or both?
2. **Authentication**: Does it need protection?
3. **Authorization**: What role permissions are needed?
4. **Database**: Do you need a new model or extend existing?
5. **AI Integration**: Does it need AI predictions?
6. **Notifications**: Should it trigger emails?
7. **Analytics**: Should it be tracked/analyzed?
8. **Audit Trail**: Does it need governance tracking?

### Example Feature Addition Flow:
1. Define feature requirements
2. Create/update database model if needed
3. Create service functions for business logic
4. Create controller functions for request handling
5. Create routes with proper middleware
6. Update frontend pages/components
7. Add API service functions in frontend
8. Test authentication and authorization
9. Test end-to-end flow

---

## Contact & Support

This documentation is designed to help ChatGPT understand the project structure and assist with feature additions. For questions about specific implementations, refer to the code comments and inline documentation.

---

**Last Updated**: Based on current codebase analysis
**Project Status**: Phase-1 Complete (Frozen), Phase-2 Ready for Development
