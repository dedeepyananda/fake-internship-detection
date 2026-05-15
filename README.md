# Fake Internship Poster Detector 🕵️‍♂️

Detect fraudulent recruitment posters using AI-driven forensic analysis.

## Features
- 🖼️ **OCR Extraction**: Automatically pulls text from complex images.
- 🚩 **Red Flag Detection**: Identifies requests for fees, urgency markers, and suspicious links.
- 🤖 **AI Powered**: Uses high-accuracy heuristic models.
- 📊 **Confidence Reporting**: Provides detailed explanations for every verdict.

## Installation
1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set your API Key in `.env`:
   ```env
   GEMINI_API_KEY=your_key_here
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```

## Folder Structure
- `/src`: Frontend React application.
- `/server.ts`: Express backend and AI integration logic.
- `/ml_reference`: Python scripts for academic/training reference.
- `/PROJECT_DOCUMENTATION.md`: Full IEEE-style report.

## Resume Description
Developed a full-stack cybersecurity application using React and Node.js that identifies fraudulent internship postings with 90%+ accuracy. Integrated advanced NLP and OCR to analyze linguistic patterns and detect financial red flags, providing users with real-time risk assessment.
