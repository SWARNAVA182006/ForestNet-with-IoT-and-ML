# ForestNet-with-IoT-and-ML

🌲 **ForestNet** is an intelligent, real-time IoT forest monitoring & threat intelligence application combining ESP32 telemetry sensors, automated dual-photo camera captures, and deep-learning Roboflow ML object detection.

## 🚀 Key Features
- **ESP32 IoT Sensor Telemetry**: Continuous monitoring of temperature (DHT22), humidity, smoke levels (MQ-2), PIR motion detection, and NEO-6M GPS satellite geolocation.
- **Non-Blocking Flask Backend (`app.py`)**: Thread-safe single camera owner worker queue with instant HTTP POST telemetry responses (<5 ms latency).
- **Automated Dual-Photo AI Threat Pipeline**: Automatically sends captured evidence photos (Photo 1 & Photo 2 +2s delay) to Roboflow AI for spatial threat classification and bounding box annotations.
- **6-Second Evidence Video Recording**: Records playable evidence video clips (`.mp4`) upon alert triggers.
- **Interactive React Dashboard**: Modern UI with real-time Leaflet satellite map pinpointing, live telemetry gauges, and evidence lightbox console.

## 📁 Repository Structure
- `app.py`: Main Flask backend entry point & camera hardware worker queue
- `ForestNet_ESP32.ino`: Arduino ESP32 firmware source code for sensors & Wi-Fi JSON uploads
- `frontend/`: React + Vite + Tailwind CSS dashboard application

## 🛠️ Installation & Setup

### Backend (Python Flask)
```bash
pip install flask opencv-python watchdog requests numpy
python app.py
```

### Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```
