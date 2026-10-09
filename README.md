# MediMitra

MediMitra is a voice-first healthcare information assistant based on the HackBIOS 2026 concept:
- Large, elderly-friendly controls
- Voice input + spoken replies using the browser Web Speech API
- 100+ diseases
- 100+ medicines
- Search and category filters
- Demo appointment booking
- Smooth animations and responsive UI
- Express backend with REST APIs
- No Firebase, no paid database, and no API key required

## Requirements
- Node.js 18+ recommended
- VS Code
- A modern browser such as Chrome or Edge

## Run
1. Open this folder in VS Code.
2. Open Terminal.
3. Run:
   npm install
4. Run:
   npm start
5. Open:
   http://localhost:5000

For automatic server restart while developing:
   npm run dev

## API
GET  /api/health
GET  /api/stats
GET  /api/diseases
GET  /api/diseases/:id
GET  /api/medicines
GET  /api/medicines/:id
GET  /api/search?q=diabetes
POST /api/chat
GET  /api/appointments
POST /api/appointments
DELETE /api/appointments/:id

## Important
This is an educational hackathon prototype. It does not diagnose, prescribe, or replace a doctor.
Medicine records intentionally do not contain dosing instructions. Users should verify medicines with a qualified clinician/pharmacist.
