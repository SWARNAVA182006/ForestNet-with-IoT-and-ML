import os
from inference_sdk import InferenceHTTPClient

# API Key provided by user
API_KEY = os.environ.get("ROBOFLOW_API_KEY", "RUswxuzEuA2Y46P0YYM8")

print("Testing InferenceHTTPClient with Roboflow Cloud API...")
client = InferenceHTTPClient(
    api_url="https://detect.roboflow.com",
    api_key=API_KEY,
)

# Test workflow call if possible or print client status
print("Client initialized successfully:", client)
