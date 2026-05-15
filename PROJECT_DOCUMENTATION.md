# PROJECT DOCUMENTATION: Fake Internship Poster Detector

## 1. ABSTRACT
Educational and employment scams are on a steep rise. Fraudsters use social media platforms like Instagram, WhatsApp, and LinkedIn to circulate fake internship posters. These posters often lead to financial loss through "processing fees" or data theft. This project presents a "Fake Internship Poster Detector" that leverages Optical Character Recognition (OCR) and Natural Language Processing (NLP) to analyze poster content, recognize suspicious linguistic patterns, and classify the posters as Real or Fake with a confidence score.

## 2. PROBLEM STATEMENT
Current social media users lack quick tools to verify the legitimacy of attractive internship offers. Manual verification is time-consuming and often requires expert knowledge of common scam behaviors.

## 3. OBJECTIVES
- To build an automated system for extracting text from images using OCR.
- To detect "Red Flag" keywords (e.g., "Registration Fee", "Limited Seats").
- To provide a confidence score using AI-driven heuristic analysis.
- To educate users through detailed "Reasons for Verdict" reports.

## 4. SYSTEM ARCHITECTURE
```text
[User Client] -> [Image Upload] -> [Express Backend]
                                          |
                                [AI Engine (Gemini/NLP)]
                                          |
[Report/Result] <- [Classification] <- [Feature Extraction]
```

## 5. TECHNOLOGY STACK
- **Frontend**: React.js, Tailwind CSS, Motion (Animations)
- **Backend**: Node.js, Express.js
- **Database & Auth**: Firebase (Firestore, Google Authentication)
- **AI Engine**: Gemini 2.0 (Integrated Vision + NLP)
- **OCR**: Integrated Multi-modal processing

## 6. DATABASE SCHEMA (Firestore)
- `scans` (Collection):
  - `userId` (String): Reference to authenticated user.
  - `verdict` (Enum): FAKE | REAL.
  - `confidence` (Number): 0-100.
  - `explanation` (String): Short reasoning.
  - `imageUrl` (String): Base64 or Storage URL of the scanned poster.
  - `timestamp` (ServerTimestamp): Audit log entry time.
- **Financial Requests**: Phrases like "Refundable security deposit" or "Processing fee".
- **Urgency/Scarcity**: "Apply within 2 hours", "Only 5 seats left".
- **Suspicious Contact**: Use of generic emails (gmail.com vs company.com) or direct WhatsApp links.
- **Inconsistent Design**: Low-res logos, spelling errors, and "rainbow" color schemes.
- **Unrealistic Compensation**: Offering high stipends for zero experience/no interview.

## 7. DATASET EXPLAINER
Academic projects typically use a supervised dataset:
- `poster_text`: String
- `contains_fee`: Boolean
- `urgency_score`: Integer (Count of urgent words)
- `label`: [Fake=1, Real=0]

## 8. IMAGE PREPROCESSING WORKFLOW (OpenCV)
In traditional ML pipelines, image quality is enhanced before OCR:
1.  **Grayscale**: `cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)`. Removes color complexity.
2.  **Noise Reduction**: `cv2.GaussianBlur(gray, (5, 5), 0)`. Smooths out digital noise/artifacts.
3.  **Thresholding**: `cv2.threshold(..., cv2.THRESH_BINARY + cv2.THRESH_OTSU)`. Uses Otsu's method to create high-contrast B&W images, which is optimal for Tesseract/EasyOCR engines.

## 9. VIVA QUESTIONS & ANSWERS (VQA)

**Q1: What is the main challenge in this project?**
*A: OCR accuracy on high-graphic backgrounds and correctly distinguishing 'Urgency' as a marketing tactic vs. a scam tactic.*

**Q2: Which algorithm is best suited for text classification?**
*A: Random Forest for feature-heavy detection and Multinomial Naive Bayes for pure text-probability analysis.*

**Q4: Why is Image Preprocessing necessary for OCR?**
*A: Raw images often have variations in lighting, shadows, and digital noise. Preprocessing like Otsu’s Binarization ensures the OCR engine sees a high-contrast black-and-white image, significantly reducing 'Character Recognition Errors' (CRE).*

**Q5: What is Otsu's Method?**
*A: It is an algorithm used for automatic image thresholding. It calculates the optimal threshold value by minimizing intra-class variance between the black and white pixels.*

## 9. FUTURE SCOPE
- **Meta-data Analysis**: Checking image EXIF data for origin.
- **Browser Extension**: Real-time scanning while browsing LinkedIn/Twitter.
- **Community Cloud**: A global blacklist of fraudulent contact numbers found in posters.

## 12. DESIGN DIAGRAMS (Descriptions)
- **Flowchart**:
  - [Start] -> [Upload Poster] -> [Image Preprocessing (CV2)] -> [OCR Engine] -> [Keyword & Sentiment Analysis] -> [Confidence Scoring] -> [Verdict Output] -> [End].
- **System Architecture**:
  - A 3-tier architecture with a React Frontend, Node.js Business logic, and an AI Processing layer.
- **Sample Screenshots Description**:
  - *Home Page*: Clean, dark-themed dashboard with a large 'Upload' bento-box.
  - *Scanning State*: A glowing 'Neural Network' animation or progress bar.
  - *Result Page*: A split-screen view; Left side shows the original poster with 'Red Boxes' around suspicious links/fees; Right side shows the "Forensic Report" and Verdict.

## 13. ADVANTAGES & LIMITATIONS
- **Advantages**: Automates verification, protects vulnerable students, provides educational insights into scam tactics.
- **Limitations**: May struggle with handwritten posters; requires internet for AI analysis.

---
**Author**: Engineering Project Team
**Title**: Fake Internship Poster Detector using AI
**Year**: 2026
