# Fake Internship Poster Detector: ML Reference (Python)

This folder contains the conceptual implementation for an academic project using traditional ML.

## Workflow
1. **Image Preprocessing**: Using OpenCV (`cv2`) for grayscale, noise reduction, and thresholding (Otsu). See `image_preprocessing.py` for code.
2. **OCR**: Using `pytesseract` or similar to extract text from processed images.
2. **Preprocessing**: Tokenization, Stopword removal, Lemmatization.
3. **Feature Extraction**: TF-IDF Vectorization.
4. **Classification**: Random Forest or Multinomial Naive Bayes.

## Sample Python Implementation (ML Model)

```python
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report

# 1. Dataset Generation (Synthetic)
data = {
    'poster_text': [
        "Summer Internship at Google. Software Engineering role. Apply at google.com/careers",
        "URGENT: Earn 5000 per day. No interview. Pay 500 registration fee to start. Limited seats!",
        "Data Science Internship at Microsoft. Requires Python knowledge. Remote available.",
        "Guaranteed Placement! Immediate joining. Pay for certificate. Call 99999XXXXX now!",
        "Web Development internship at a startup. Unpaid but with massive learning opportunities.",
        "GOVERNMENT JOB! Direct selection. WhatsApp for more details. Processing fee 2000."
    ],
    'label': [0, 1, 0, 1, 0, 1] # 0: Real, 1: Fake
}

df = pd.DataFrame(data)

# 2. Preprocessing & Feature Extraction
tfidf = TfidfVectorizer(stop_words='english', max_features=1000)
X = tfidf.fit_transform(df['poster_text'])
y = df['label']

# 3. Training
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
model = RandomForestClassifier(n_estimators=100)
model.fit(X_train, y_train)

# 4. Evaluation
predictions = model.predict(X_test)
print(f"Accuracy: {accuracy_score(y_test, predictions)}")
print(classification_report(y_test, predictions))

# 5. Exporting for Backend
# import joblib
# joblib.dump(model, 'poster_detector_model.pkl')
# joblib.dump(tfidf, 'tfidf_vectorizer.pkl')
```

## Features Engineered for Fake Detection:
- **contains_fee**: Binary (1 if 'fee', 'pay', 'registration' present)
- **urgency_score**: Count of words like 'urgent', 'immediately', 'limited'
- **low_quality_domain**: Check if contact email is Gmail/Yahoo vs Corporate domain.
- **grammar_errors**: Frequency of spelling mistakes.
