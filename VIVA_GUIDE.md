# Viva Voce Guide: Fake Internship Poster Detector

## Project Overview
**Q: Summarize your project in 2 minutes.**
A: My project is a cybersecurity tool designed to protect students from internship scams. It uses Computer Vision (OCR) to extract text from poster images and NLP to identify "predatory" linguistic markers. By analyzing factors like payment requests, urgent language, and suspicious contacts, it classifies posters as Fake or Real with a confidence score.

## Technical Architecture
**Q: Why did you use a Full-Stack approach instead of a static site?**
A: Because image processing and AI analysis require significant compute power and sensitive API keys. Using a backend (Node.js/Express) ensures that the API keys are hidden from the user and processing happens securely on the server.

**Q: Explain the OCR process used here.**
A: In our implementation, we use a Vision-Language Model (VLM). Unlike traditional OCR (like Tesseract) which only extracts raw text, VLMs understand the "spatial context"—they can see if a logo looks fake or if text is overlapping in a suspicious way.

## Machine Learning
**Q: What are the 'Red Flags' your model looks for?**
A: The primary features are:
1. **Financial Markers**: "Registration fee", "Processing charges".
2. **Scarcity Markers**: "Last few seats", "Apply now or miss out".
3. **Identity Markers**: Lack of professional email domains (@company.com).
4. **Compensation Markers**: High stipends for "No Skills Required".

**Q: How do you evaluate the accuracy of such a model?**
A: We use a Confusion Matrix. 
- **Precision**: How many detected "Fake" posters were actually fake.
- **Recall**: How many of the total fake posters were successfully caught by the system.
- **F1-Score**: The harmonic mean of both, which is crucial since the dataset might be imbalanced.

## Security & Ethics
**Q: Can this model be fooled?**
A: Yes, scammers can use "Adversarial Images" (slightly distorted text). Future enhancements would involve checking the URL domain reputation against a global blacklist.

**Q: What is the benefit of this project to society?**
A: It reduces the financial and emotional drain on students, helps them identify legitimate opportunities, and promotes a safer online recruitment environment.
