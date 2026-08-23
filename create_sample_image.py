import numpy as np
import cv2

# Create a sample green 640x480 image simulating a forest scene
img = np.zeros((480, 640, 3), dtype=np.uint8)
img[:, :] = (34, 139, 34) # Forest green BGR

# Save to disk
cv2.imwrite("test_image.jpg", img)
print("Saved test_image.jpg successfully.")
