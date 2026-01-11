AI-Based Municipal Grievance Management System

This project is a B.Tech CSE final year project focused on developing an AI-ready municipal grievance management system. The system enables citizens to submit complaints related to municipal services and allows municipal authorities to monitor, manage, and resolve these complaints efficiently.

The application is developed using a full-stack architecture with a React frontend and a Node.js backend. It includes secure authentication, role-based access control, and a structured grievance workflow. The system is designed to support future AI-based prediction and analysis.

------------------------------------------------------------

Project Overview

Municipal corporations face challenges in managing large volumes of public complaints related to roads, garbage collection, water supply, sanitation, drainage, and street lighting. Existing systems are mostly reactive, time-consuming, and lack intelligent analysis.

This project provides a digital platform where:

1. Citizens can submit municipal complaints online
2. Citizens can track the status of their complaints
3. Municipal administrators can view and manage all complaints
4. Complaint data can be analyzed later for predictive governance

------------------------------------------------------------

Key Features

Citizen Features

1. Secure registration and login
2. Submit municipal complaints
3. View status of submitted complaints

Municipal Admin Features

1. View all complaints
2. Update complaint status
3. Monitor grievance resolution

System Features

1. JWT-based authentication
2. Role-based access control
3. RESTful API architecture
4. MongoDB Atlas cloud database
5. Scalable design for AI integration

------------------------------------------------------------

Technology Stack

Frontend Technologies

1. React (Vite)
2. Axios
3. Custom CSS

Backend Technologies

1. Node.js
2. Express.js
3. MongoDB Atlas
4. JWT Authentication

Tools and Platforms

1. Git and GitHub
2. Postman
3. MongoDB Atlas
4. Cloudinary (optional for image uploads)

------------------------------------------------------------

Project Structure

AI-Predictive-Governance-System
client   -> Frontend (React + Vite)
server   -> Backend (Node.js + Express)

------------------------------------------------------------

Setup Instructions

Prerequisites

1. Node.js version 18 or above
2. npm
3. Git
4. MongoDB Atlas account
5. Internet connection

------------------------------------------------------------

Backend Setup

Step 1: Clone the repository and navigate to the server folder

git clone <repository-url>
cd AI-Predictive-Governance-System/server

Step 2: Install backend dependencies

npm install

Step 3: Environment configuration

Create a file named .env inside the server folder and add the following variables:

PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

Important notes:

1. Do not commit the .env file to GitHub
2. Each team member must create their own .env file

Step 4: MongoDB Atlas configuration

1. Open MongoDB Atlas
2. Go to Network Access
3. Add IP address: 0.0.0.0/0
4. Save the changes

This allows access from all IP addresses and is acceptable for academic projects.

Step 5: Start the backend server

npm start

If configured correctly, the server will display:

Database Connected
Server is running on PORT: 5000

------------------------------------------------------------

Frontend Setup

Step 6: Navigate to the client folder

cd ../client

Step 7: Install frontend dependencies

npm install

Step 8: Start the frontend development server

npm run dev

The frontend application will be available at:

http://localhost:5173

------------------------------------------------------------

Frontend and Backend Integration

The frontend communicates with the backend using Axios.

The API base URL is configured in the file:

client/src/api/axios.js

The base URL used is:

http://localhost:5000/api

Ensure the following:

1. Backend server is running before starting frontend
2. Ports are configured correctly

------------------------------------------------------------

Authentication and Authorization

1. Users authenticate using email and password
2. A JWT token is generated on successful login
3. The token is stored in browser localStorage
4. Protected APIs require a valid token
5. Role-based access control is enforced

User Roles

1. citizen
   - Can create complaints
   - Can view own complaints

2. admin
   - Can view all complaints
   - Can update complaint status

------------------------------------------------------------

API Testing

1. APIs are tested using Postman
2. A structured Postman collection is maintained
3. Tested endpoints include:

1. Register
2. Login
3. Check authentication
4. Create complaint
5. Get my complaints
6. Get all complaints (admin)
7. Update complaint status (admin)

------------------------------------------------------------

Common Issues and Solutions

1. Login or registration not working
   Check .env configuration and MongoDB Atlas IP access

2. JWT authorization errors
   Verify JWT_SECRET value

3. API not reachable
   Ensure backend server is running

4. Axios import error in frontend
   Run npm install axios inside client folder

------------------------------------------------------------

Current Project Status

1. Backend APIs implemented and tested
2. Authentication and authorization completed
3. Role-based access control implemented
4. Frontend UI implemented and integrated
5. AI prediction module planned for next phase

------------------------------------------------------------

Future Scope

1. AI-based complaint hotspot prediction
2. Area-wise grievance trend analysis
3. Automated prioritization of complaints
4. Resource planning for municipalities

------------------------------------------------------------

Team Information

This project is developed as part of a B.Tech CSE final year project by a team of four members.

------------------------------------------------------------

License

This project is intended strictly for academic and educational purposes only.
