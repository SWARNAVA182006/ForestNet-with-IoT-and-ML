import base64
import requests
import json

API_KEY = "RUswxuzEuA2Y46P0YYM8"
WORKSPACE_NAME = "swarnava-sarkar"
WORKFLOW_ID = "forest-guardian-tracking-and-alerts-1787484684910"
IMAGE_PATH = "test_image.jpg"

print("Testing direct REST POST workflow API call...")
with open(IMAGE_PATH, "rb") as f:
    img_b64 = base64.b64encode(f.read()).decode("utf-8")

url = f"https://detect.roboflow.com/infer/workflows/{WORKSPACE_NAME}/{WORKFLOW_ID}"
payload = {
    "inputs": {
        "image": {"type": "base64", "value": img_b64}
    },
    "api_key": API_KEY
}

resp = requests.post(url, json=payload, timeout=30)
print(f"Status Code: {resp.status_code}")
if resp.status_code == 200:
    data = resp.json()
    print("REST Success Output:")
    print(json.dumps(data, indent=2)[:500])
else:
    print("Error:", resp.text)
