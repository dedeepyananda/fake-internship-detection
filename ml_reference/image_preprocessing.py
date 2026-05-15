import cv2
import numpy as np

def preprocess_for_ocr(image_path):
    """
    Applies image processing techniques to enhance text clarity for OCR.
    
    1. Grayscale: Simplifies the image to intensity values.
    2. Noise Reduction: Removes high-frequency 'speckles'.
    3. Thresholding: Converts to raw black and white (binarization).
    """
    
    # Load the image
    img = cv2.imread(image_path)

    # 1. Grayscale Conversion
    # Why? OCR engines work faster and more accurately on single-channel images.
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # 2. Noise Reduction (Gaussian Blur)
    # Why? Removes sensor noise and minor artifacts that OCR might mistake for dots/punctuation.
    # (5,5) is the kernel size; 0 lets OpenCV calculate the standard deviation.
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)

    # 3. Thresholding (Otsu's Binarization)
    # Why? It automatically finds the best threshold value to separate text from background.
    # It creates high contrast, making characters 'pop' against the white background.
    _, thresh = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    # 4. Optional: Dilation/Erosion
    # Why? Dilation can help 'thicken' thin fonts used in some posters.
    kernel = np.ones((2,2), np.uint8)
    processed = cv2.dilate(thresh, kernel, iterations=1)

    return processed

# Usage Example
# processed_img = preprocess_for_ocr('poster.jpg')
# cv2.imwrite('preprocessed_poster.png', processed_img)
