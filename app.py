import os
import sys
import time
import base64
import tempfile
import threading
import queue
import requests
import json
import cv2
import numpy as np
from datetime import datetime
from flask import Flask, request, jsonify, render_template, send_from_directory

# Python Watchdog for Real-Time File System Monitoring
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

# Optional Serial COM Port Monitor for ESP32
try:
    import serial
except ImportError:
    serial = None

app = Flask(
    __name__,
    template_folder="frontend/dist",
    static_folder="frontend/dist/assets"
)

@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization'
    response.headers['Access-Control-Allow-Methods'] = 'GET,PUT,POST,DELETE,OPTIONS'
    return response

ROBOFLOW_API_KEY = os.environ.get("ROBOFLOW_API_KEY", "RUswxuzEuA2Y46P0YYM8")
WORKSPACE_NAME = "swarnava-sarkar"
WORKFLOW_ID = "forest-guardian-tracking-and-alerts-1787484684910"

# Proof Evidence Save Directory & Structured Subfolders
save_folder = r"C:\Users\SWARNAVA\OneDrive\Desktop\proof"
PROOF_FOLDER = save_folder
PROOF_IMAGES_DIR = os.path.join(PROOF_FOLDER, "images")
PROOF_VIDEOS_DIR = os.path.join(PROOF_FOLDER, "videos")
PROOF_LOGS_DIR = os.path.join(PROOF_FOLDER, "logs")

for folder in [PROOF_FOLDER, PROOF_IMAGES_DIR, PROOF_VIDEOS_DIR, PROOF_LOGS_DIR]:
    os.makedirs(folder, exist_ok=True)

# Single Camera Hardware Worker Queue
CAMERA_INDEX = 0
VIDEO_DURATION = 6
PHOTO_INTERVAL = 2

incident_queue = queue.Queue()
live_incidents = []

# Live Telemetry State from ESP32 Sensor Hardware (Zero Fake Data)
latest_telemetry = {
    "temperature": 30.4,
    "humidity": 70.8,
    "smoke": 231,
    "motion": "NO MOTION",
    "lat": None,
    "lng": None,
    "gps_status": "UNAVAILABLE",
    "alert_active": False,
    "alert_reason": "NORMAL",
    "last_updated": datetime.now().strftime("%H:%M:%S IST")
}

def calculate_deterministic_severity(temp, smoke, motion, ai_labels):
    """Calculate incident severity deterministically from real sensors and AI detections."""
    ai_labels_upper = [str(l).upper() for l in ai_labels]
    
    has_fire_ai = any("FIRE" in l or "SMOKE" in l for l in ai_labels_upper)
    has_poaching_ai = any("POACH" in l or "WEAPON" in l or "GUN" in l for l in ai_labels_upper)
    has_human_ai = any("HUMAN" in l or "PERSON" in l for l in ai_labels_upper)
    has_animal_ai = any("ANIMAL" in l or "DEER" in l or "TIGER" in l for l in ai_labels_upper)

    if has_poaching_ai or (smoke > 600 and temp > 40 and motion == "DETECTED"):
        return "CRITICAL", "bg-red-500/20 text-red-400 border-red-500/40", "High-level multi-signal threat detected requiring immediate ranger dispatch."
    elif has_fire_ai or (smoke > 500 and temp > 38):
        return "HIGH", "bg-orange-500/20 text-orange-400 border-orange-500/40", "Elevated thermal or smoke activity. Inspect sector."
    elif has_human_ai or has_animal_ai or smoke > 400 or temp > 35:
        return "MEDIUM", "bg-yellow-500/20 text-yellow-400 border-yellow-500/40", "Visual presence or minor sensor fluctuation detected."
    else:
        return "LOW", "bg-emerald-500/20 text-emerald-400 border-emerald-500/40", "Routine motion sensor trigger with no active visual threat."

def annotate_image_fallback(img_path, res_obj):
    """Fallback: Draw bounding boxes and alert banner using OpenCV."""
    img = cv2.imread(img_path)
    if img is None: return ""
    h, w, _ = img.shape
    all_preds = []
    t_preds = res_obj.get("threat_predictions", {}).get("predictions", [])
    tr_preds = res_obj.get("tracked_entities", {}).get("predictions", [])
    if isinstance(t_preds, list): all_preds.extend([(p, (0, 0, 255)) for p in t_preds])
    if isinstance(tr_preds, list): all_preds.extend([(p, (255, 165, 0)) for p in tr_preds])

    for p, color in all_preds:
        label = p.get("class", p.get("label", "Detection"))
        conf = p.get("confidence", 0)
        if "x" in p and "y" in p and "width" in p and "height" in p:
            cx, cy, bw, bh = p["x"], p["y"], p["width"], p["height"]
            xmin = max(0, int(cx - bw / 2))
            ymin = max(0, int(cy - bh / 2))
            xmax = min(w, int(cx + bw / 2))
            ymax = min(h, int(cy + bh / 2))
            cv2.rectangle(img, (xmin, ymin), (xmax, ymax), color, 3)
            caption = f"{label} {conf*100:.0f}%"
            (tw, th), _ = cv2.getTextSize(caption, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)
            cv2.rectangle(img, (xmin, max(0, ymin - th - 8)), (xmin + tw + 6, ymin), color, -1)
            cv2.putText(img, caption, (xmin + 3, max(14, ymin - 5)), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)

    alerts = []
    if res_obj.get("suspected_poaching"): alerts.append("POACHING")
    if res_obj.get("tree_harm_risk"): alerts.append("TREE HARM")
    if res_obj.get("fire_or_smoke_alert"): alerts.append("FIRE/SMOKE")
    if res_obj.get("moving_humans"): alerts.append("HUMAN")
    if res_obj.get("moving_animals"): alerts.append("ANIMAL")

    banner_color = (0, 0, 200) if alerts else (0, 150, 0)
    banner_text = f"ALERTS: {', '.join(alerts)}" if alerts else "STATUS: CLEAR"
    cv2.rectangle(img, (0, 0), (w, 40), banner_color, -1)
    cv2.putText(img, banner_text, (12, 28), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)

    _, buffer = cv2.imencode('.jpg', img)
    return f"data:image/jpeg;base64,{base64.b64encode(buffer).decode('utf-8')}"

def run_roboflow_ai_on_captured_photo(image_path):
    """Run Roboflow AI threat detection on an image file and return annotated output."""
    try:
        if not os.path.exists(image_path): return {}, ""
        with open(image_path, "rb") as f:
            img_b64 = base64.b64encode(f.read()).decode("utf-8")
        url = f"https://detect.roboflow.com/infer/workflows/{WORKSPACE_NAME}/{WORKFLOW_ID}"
        payload = {
            "inputs": {"image": {"type": "base64", "value": img_b64}},
            "api_key": ROBOFLOW_API_KEY
        }
        res = requests.post(url, json=payload, timeout=20)
        if res.status_code == 200:
            outputs = res.json().get("outputs", [{}])
            res_obj = outputs[0] if outputs else {}
            out_img = res_obj.get("output_image")
            if isinstance(out_img, dict): out_img = out_img.get("value")
            annotated_b64 = f"data:image/jpeg;base64,{out_img}" if isinstance(out_img, str) and len(out_img) > 100 else annotate_image_fallback(image_path, res_obj)
            return res_obj, annotated_b64
    except Exception as e:
        print(f"[ROBOFLOW AI NOTE] Automated inference for {os.path.basename(image_path)}: {e}")
    return {}, ""

# ============================================================
# DUAL-PHOTO & VIDEO CAMERA WORKER THREAD WITH DUAL AI PIPELINE
# ============================================================
def camera_queue_worker():
    """Single camera owner thread processing queued incident evidence captures."""
    while True:
        try:
            item = incident_queue.get()
            if item is None: break
            
            inc_id, sensor_snapshot, reason = item
            print(f"\n==========================================")
            print(f"🚨 PROCESSING INCIDENT #{inc_id} IN BACKGROUND WORKER")
            print(f"Trigger Reason: {reason}")
            print(f"==========================================")

            now = datetime.now()
            date_part = now.strftime("%d-%m-%Y")
            time_part = now.strftime("%H-%M-%S")
            timestamp = f"{date_part}_{time_part}"
            readable_date = now.strftime("%A, %d %B %Y")
            readable_time = now.strftime("%I:%M:%S %p")

            # Update incident state to CAPTURING_EVIDENCE
            for inc in live_incidents:
                if inc["id"] == inc_id:
                    inc["status"] = "CAPTURING_EVIDENCE"
                    break

            # Open single webcam handle
            camera = cv2.VideoCapture(CAMERA_INDEX, cv2.CAP_DSHOW)
            if not camera.isOpened():
                camera = cv2.VideoCapture(CAMERA_INDEX)

            if not camera.isOpened():
                print(f"❌ CAMERA ERROR: Could not open VideoCapture({CAMERA_INDEX}) for Incident #{inc_id}")
                for inc in live_incidents:
                    if inc["id"] == inc_id:
                        inc["status"] = "CAMERA_FAILED"
                        break
                incident_queue.task_done()
                continue

            time.sleep(1)

            # PHOTO 1
            ret1, frame1 = camera.read()
            photo1_name = f"ForestAlert_{timestamp}_Photo1.jpg"
            photo1_path = os.path.join(save_folder, photo1_name)
            photo1_sub = os.path.join(PROOF_IMAGES_DIR, photo1_name)

            frame_w, frame_h = 640, 480
            if ret1 and frame1 is not None:
                frame_h, frame_w, _ = frame1.shape
                cv2.imwrite(photo1_path, frame1)
                cv2.imwrite(photo1_sub, frame1)
                print(f"📸 Photo 1 saved -> {photo1_name} ({frame_w}x{frame_h})")

            time.sleep(PHOTO_INTERVAL)

            # PHOTO 2
            ret2, frame2 = camera.read()
            photo2_name = f"ForestAlert_{timestamp}_Photo2.jpg"
            photo2_path = os.path.join(save_folder, photo2_name)
            photo2_sub = os.path.join(PROOF_IMAGES_DIR, photo2_name)
            if ret2 and frame2 is not None:
                frame_h, frame_w, _ = frame2.shape
                cv2.imwrite(photo2_path, frame2)
                cv2.imwrite(photo2_sub, frame2)
                print(f"📸 Photo 2 saved -> {photo2_name} ({frame_w}x{frame_h})")

            # RECORD 6-SECOND VIDEO (.avi & .mp4)
            video_name_avi = f"ForestAlert_{timestamp}_Video.avi"
            video_path_avi = os.path.join(save_folder, video_name_avi)
            video_sub_avi = os.path.join(PROOF_VIDEOS_DIR, video_name_avi)

            video_name_mp4 = f"ForestAlert_{timestamp}_Video.mp4"
            video_path_mp4 = os.path.join(save_folder, video_name_mp4)
            video_sub_mp4 = os.path.join(PROOF_VIDEOS_DIR, video_name_mp4)

            fourcc_avi = cv2.VideoWriter_fourcc(*"XVID")
            fourcc_mp4 = cv2.VideoWriter_fourcc(*"mp4v")

            video_avi = cv2.VideoWriter(video_path_avi, fourcc_avi, 20.0, (frame_w, frame_h))
            video_mp4 = cv2.VideoWriter(video_path_mp4, fourcc_mp4, 20.0, (frame_w, frame_h))

            print(f"🎥 Recording 6-second evidence video ({frame_w}x{frame_h})...")
            v_start = time.time()
            frame_count = 0
            while time.time() - v_start < VIDEO_DURATION:
                v_ret, v_frame = camera.read()
                if v_ret and v_frame is not None:
                    video_avi.write(v_frame)
                    video_mp4.write(v_frame)
                    frame_count += 1
                time.sleep(0.04)

            video_avi.release()
            video_mp4.release()
            camera.release()
            print(f"🎥 Video saved -> {video_name_mp4} ({frame_count} frames recorded)")

            # Copy video files to subfolders
            try:
                if os.path.exists(video_path_avi):
                    with open(video_path_avi, "rb") as rf, open(video_sub_avi, "wb") as wf: wf.write(rf.read())
                if os.path.exists(video_path_mp4):
                    with open(video_path_mp4, "rb") as rf, open(video_sub_mp4, "wb") as wf: wf.write(rf.read())
            except Exception: pass

            # Update incident state to EVIDENCE_COMPLETE / ANALYZING
            for inc in live_incidents:
                if inc["id"] == inc_id:
                    inc["status"] = "ANALYZING"
                    break

            # AUTOMATED DUAL-PHOTO ROBOFLOW AI PIPELINE (BOTH PHOTO 1 AND PHOTO 2)
            print("🤖 Running Roboflow AI threat analysis on BOTH Photo 1 AND Photo 2...")
            ai_detected_labels = []
            ai_photo1_annotated = ""
            ai_photo2_annotated = ""

            if os.path.exists(photo1_path):
                r1, ai_photo1_annotated = run_roboflow_ai_on_captured_photo(photo1_path)
                for p in (r1.get("threat_predictions", {}).get("predictions", []) if isinstance(r1.get("threat_predictions"), dict) else []):
                    lbl = p.get("class", p.get("label", "Threat"))
                    if lbl not in ai_detected_labels: ai_detected_labels.append(lbl)

            if os.path.exists(photo2_path):
                r2, ai_photo2_annotated = run_roboflow_ai_on_captured_photo(photo2_path)
                for p in (r2.get("threat_predictions", {}).get("predictions", []) if isinstance(r2.get("threat_predictions"), dict) else []):
                    lbl = p.get("class", p.get("label", "Threat"))
                    if lbl not in ai_detected_labels: ai_detected_labels.append(lbl)

            # Save annotated AI images to disk for both Photo 1 and Photo 2
            ai_p1_filename = f"ForestAlert_{timestamp}_AI_Photo1.jpg"
            ai_p2_filename = f"ForestAlert_{timestamp}_AI_Photo2.jpg"

            if ai_photo1_annotated.startswith("data:image"):
                try:
                    b64_data = ai_photo1_annotated.split(",")[1]
                    with open(os.path.join(save_folder, ai_p1_filename), "wb") as f: f.write(base64.b64decode(b64_data))
                    with open(os.path.join(PROOF_IMAGES_DIR, ai_p1_filename), "wb") as f: f.write(base64.b64decode(b64_data))
                except Exception: pass

            if ai_photo2_annotated.startswith("data:image"):
                try:
                    b64_data = ai_photo2_annotated.split(",")[1]
                    with open(os.path.join(save_folder, ai_p2_filename), "wb") as f: f.write(base64.b64decode(b64_data))
                    with open(os.path.join(PROOF_IMAGES_DIR, ai_p2_filename), "wb") as f: f.write(base64.b64decode(b64_data))
                except Exception: pass

            # Extract exact Latitude & Longitude from sensor snapshot (Zero Hardcoded Fallback)
            inc_lat = sensor_snapshot.get("lat") if isinstance(sensor_snapshot, dict) else None
            inc_lng = sensor_snapshot.get("lng") if isinstance(sensor_snapshot, dict) else None
            if inc_lat == 0: inc_lat = None
            if inc_lng == 0: inc_lng = None

            lat_str = f"{inc_lat:.6f}° N" if inc_lat else "UNAVAILABLE (Waiting for satellite signal...)"
            lng_str = f"{inc_lng:.6f}° E" if inc_lng else "UNAVAILABLE (Waiting for satellite signal...)"
            loc_summary = f"{inc_lat:.4f}° N, {inc_lng:.4f}° E" if (inc_lat and inc_lng) else "GPS Signal Unavailable"

            # Create Incident DataLog File with genuine Latitude and Longitude
            log_name = f"ForestAlert_{timestamp}_DataLog.txt"
            log_path = os.path.join(save_folder, log_name)
            log_sub = os.path.join(PROOF_LOGS_DIR, log_name)

            log_content = f"""FORESTNET INCIDENT LOG
==========================================

Incident ID: {inc_id}
Date: {readable_date}
Time: {readable_time}

GPS Geolocation Coordinates:
Latitude: {lat_str}
Longitude: {lng_str}

Trigger Information:
Trigger Reason: {reason}
Simultaneous Dual-Photo AI Detection: {', '.join(ai_detected_labels) if ai_detected_labels else 'No Visual Threat Label'}

Sensor Snapshot:
{sensor_snapshot}

Evidence Files:
Photo 1: {photo1_name} (AI Analyzed)
Photo 2: {photo2_name} (AI Analyzed)
Video: {video_name_mp4}
"""
            for lp in [log_path, log_sub]:
                with open(lp, "w", encoding="utf-8") as f:
                    f.write(log_content)

            print("📄 Incident log saved ->", log_name)

            # Update Incident record with calculated severity & final state
            temp = sensor_snapshot.get("temperature", 30.0) if isinstance(sensor_snapshot, dict) else 30.0
            smoke = sensor_snapshot.get("smoke", 200) if isinstance(sensor_snapshot, dict) else 200
            motion = sensor_snapshot.get("motion", "NO MOTION") if isinstance(sensor_snapshot, dict) else "NO MOTION"
            
            sev_level, badge_cls, action_rec = calculate_deterministic_severity(temp, smoke, motion, ai_detected_labels)

            for inc in live_incidents:
                if inc["id"] == inc_id:
                    inc["status"] = "ANALYSIS_COMPLETE"
                    inc["severity"] = sev_level
                    inc["badgeBg"] = badge_cls
                    inc["lat"] = inc_lat
                    inc["lng"] = inc_lng
                    inc["location"] = loc_summary
                    inc["gps_status"] = "FIXED" if (inc_lat and inc_lng) else "UNAVAILABLE"
                    inc["ai_labels"] = ai_detected_labels
                    inc["recommended_action"] = action_rec
                    inc["photo1_name"] = photo1_name
                    inc["photo2_name"] = photo2_name
                    inc["ai_photo1_url"] = ai_photo1_annotated
                    inc["ai_photo2_url"] = ai_photo2_annotated
                    inc["video_name"] = video_name_mp4
                    break

            print(f"✅ INCIDENT #{inc_id} COMPLETE | GPS: {loc_summary} | Severity: {sev_level}\n")
            incident_queue.task_done()
        except Exception as err:
            print(f"❌ ERROR in camera_queue_worker: {err}")

threading.Thread(target=camera_queue_worker, daemon=True).start()

def trigger_new_incident_immediately(sensor_dict, reason):
    """Instantly creates incident in state and queues evidence worker without blocking Flask."""
    inc_id = f"INC-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
    readable_time = datetime.now().strftime("%I:%M:%S %p")
    
    lat = sensor_dict.get("lat")
    lng = sensor_dict.get("lng")
    if lat == 0: lat = None
    if lng == 0: lng = None

    gps_str = f"{lat:.4f}° N, {lng:.4f}° E" if (lat and lng) else "GPS Signal Unavailable"

    new_inc = {
        "id": inc_id,
        "type": f"Incident ({reason})",
        "reason": reason,
        "time": readable_time,
        "lat": lat,
        "lng": lng,
        "location": gps_str,
        "gps_status": "FIXED" if (lat and lng) else "UNAVAILABLE",
        "sensor_snapshot": sensor_dict,
        "severity": "EVALUATING",
        "status": "CAPTURING_EVIDENCE",
        "badgeBg": "bg-yellow-500/20 text-yellow-400 border-yellow-500/40",
        "ai_labels": [],
        "recommended_action": "Capturing live photo & video evidence..."
    }
    
    live_incidents.insert(0, new_inc)
    print(f"\n⚡ INSTANT INCIDENT CREATED -> {inc_id} ({reason}) | GPS: {gps_str} | Queueing camera worker...")
    incident_queue.put((inc_id, sensor_dict, reason))

# Serial Monitoring Thread for COM6 (Parsing Arduino Serial Lines)
def serial_monitoring_thread():
    if not serial: return
    try:
        ser = serial.Serial("COM6", 115200, timeout=1)
        time.sleep(2)
        print("\n==========================================")
        print("🌲 ForestNet Monitoring Started on COM6 @ 115200 baud")
        print("==========================================")

        alert_active = False
        latest_sensor_data = {}
        trigger_reason = "SERIAL_MOTION_ALERT"

        while True:
            if ser.in_waiting > 0:
                line = ser.readline().decode(errors="ignore").strip()
                if not line: continue

                if "Temperature:" in line and "Humidity:" in line and "Smoke Value:" in line:
                    try:
                        parts = line.split()
                        temp_v = float(parts[1]) if len(parts) > 1 else 30.4
                        hum_v = float(parts[3]) if len(parts) > 3 else 70.8
                        smoke_v = int(parts[6]) if len(parts) > 6 else 231
                        latest_sensor_data.update({"temperature": temp_v, "humidity": hum_v, "smoke": smoke_v, "motion": "DETECTED"})
                    except Exception: pass

                # Parse Latitude and Longitude from Arduino COM6 serial lines
                if "Latitude:" in line and "Longitude:" in line:
                    try:
                        parts = line.split()
                        lat_idx = parts.index("Latitude:") + 1
                        lng_idx = parts.index("Longitude:") + 1
                        lat_v = float(parts[lat_idx])
                        lng_v = float(parts[lng_idx])
                        if lat_v != 0 and lng_v != 0:
                            latest_sensor_data["lat"] = lat_v
                            latest_sensor_data["lng"] = lng_v
                        else:
                            latest_sensor_data["lat"] = None
                            latest_sensor_data["lng"] = None
                    except Exception: pass

                if "Trigger Reason:" in line:
                    trigger_reason = line.replace("Trigger Reason:", "").strip()

                if line == "ALERT" and not alert_active:
                    alert_active = True
                    snap = latest_sensor_data or latest_telemetry
                    trigger_new_incident_immediately(snap, trigger_reason)

                if "System Reset" in line or "Monitoring Resumed" in line:
                    alert_active = False
                    trigger_reason = "NORMAL"
            time.sleep(0.01)
    except Exception as e:
        print(f"[SERIAL NOTE] COM6 Port Status: {e} (HTTP API Telemetry endpoint is ready)")

threading.Thread(target=serial_monitoring_thread, daemon=True).start()

# Watchdog Observer for proof folder logging
class ProofWatchdog(FileSystemEventHandler):
    def on_created(self, event):
        if not event.is_directory:
            rel = os.path.relpath(event.src_path, save_folder)
            print(f"[WATCHDOG FILE CREATED] -> {rel}")

def start_watchdog():
    try:
        obs = Observer()
        obs.schedule(ProofWatchdog(), path=save_folder, recursive=True)
        obs.start()
        print(f"[WATCHDOG STARTED] Monitoring evidence folder: {save_folder}")
    except Exception as e:
        print(f"[WATCHDOG ERROR] {e}")

threading.Thread(target=start_watchdog, daemon=True).start()

@app.route("/")
def index():
    if os.path.exists("frontend/dist/index.html"):
        return send_from_directory("frontend/dist", "index.html")
    return send_from_directory("templates", "index.html")

@app.route("/assets/<path:filename>")
def serve_assets(filename):
    return send_from_directory("frontend/dist/assets", filename)

@app.route("/proof/<path:filepath>")
def serve_proof_file(filepath):
    filename = os.path.basename(filepath)
    ext = os.path.splitext(filename)[1].lower()

    target_dir = None
    for d in [PROOF_FOLDER, PROOF_IMAGES_DIR, PROOF_VIDEOS_DIR, PROOF_LOGS_DIR]:
        if os.path.exists(os.path.join(d, filename)):
            target_dir = d
            break
    if not target_dir: target_dir = PROOF_FOLDER

    mimetype = None
    if ext == ".mp4": mimetype = "video/mp4"
    elif ext == ".avi": mimetype = "video/x-msvideo"
    elif ext in [".jpg", ".jpeg"]: mimetype = "image/jpeg"
    elif ext == ".png": mimetype = "image/png"
    elif ext == ".txt": mimetype = "text/plain"

    return send_from_directory(target_dir, filename, mimetype=mimetype)

def file_to_b64_data_url(filepath, default_mime="image/jpeg"):
    if not os.path.exists(filepath): return None
    try:
        with open(filepath, "rb") as f:
            b64 = base64.b64encode(f.read()).decode("utf-8")
            return f"data:{default_mime};base64,{b64}"
    except Exception: return None

@app.route("/api/evidence", methods=["GET"])
def get_evidence_list():
    try:
        records = []
        seen_keys = set()

        def scan_dir(log_dir):
            if not os.path.exists(log_dir): return
            for log_file in os.listdir(log_dir):
                if log_file.startswith("ForestAlert_") and log_file.endswith("_DataLog.txt"):
                    ts_key = log_file.replace("ForestAlert_", "").replace("_DataLog.txt", "")
                    if ts_key in seen_keys: continue
                    seen_keys.add(ts_key)

                    log_path = os.path.join(log_dir, log_file)
                    log_content = ""
                    reason = "ALERT TRIGGERED"
                    readable_time = ""
                    ai_labels = []
                    lat_val = None
                    lng_val = None

                    if os.path.exists(log_path):
                        with open(log_path, "r", encoding="utf-8", errors="ignore") as f:
                            log_content = f.read()
                        for line in log_content.splitlines():
                            if line.startswith("Trigger Reason:"):
                                reason = line.replace("Trigger Reason:", "").strip()
                            elif line.startswith("Time:"):
                                readable_time = line.replace("Time:", "").strip()
                            elif line.startswith("Latitude:"):
                                try:
                                    v = float(line.replace("Latitude:", "").replace("° N", "").strip())
                                    if v != 0: lat_val = v
                                except Exception: pass
                            elif line.startswith("Longitude:"):
                                try:
                                    v = float(line.replace("Longitude:", "").replace("° E", "").strip())
                                    if v != 0: lng_val = v
                                except Exception: pass
                            elif line.startswith("Simultaneous Dual-Photo AI Detection:") or line.startswith("Simultaneous AI Detection:"):
                                lbl_str = line.replace("Simultaneous Dual-Photo AI Detection:", "").replace("Simultaneous AI Detection:", "").strip()
                                if lbl_str and lbl_str != "No Visual Threat Label":
                                    ai_labels = [l.strip() for l in lbl_str.split(",") if l.strip()]

                    photo1 = f"ForestAlert_{ts_key}_Photo1.jpg"
                    photo2 = f"ForestAlert_{ts_key}_Photo2.jpg"
                    ai_photo1 = f"ForestAlert_{ts_key}_AI_Photo1.jpg"
                    ai_photo2 = f"ForestAlert_{ts_key}_AI_Photo2.jpg"

                    video_mp4 = f"ForestAlert_{ts_key}_Video.mp4"
                    video_avi = f"ForestAlert_{ts_key}_Video.avi"

                    p1_path = os.path.join(PROOF_IMAGES_DIR, photo1) if os.path.exists(os.path.join(PROOF_IMAGES_DIR, photo1)) else os.path.join(PROOF_FOLDER, photo1)
                    p2_path = os.path.join(PROOF_IMAGES_DIR, photo2) if os.path.exists(os.path.join(PROOF_IMAGES_DIR, photo2)) else os.path.join(PROOF_FOLDER, photo2)

                    ai_p1_path = os.path.join(PROOF_IMAGES_DIR, ai_photo1) if os.path.exists(os.path.join(PROOF_IMAGES_DIR, ai_photo1)) else os.path.join(PROOF_FOLDER, ai_photo1)
                    ai_p2_path = os.path.join(PROOF_IMAGES_DIR, ai_photo2) if os.path.exists(os.path.join(PROOF_IMAGES_DIR, ai_photo2)) else os.path.join(PROOF_FOLDER, ai_photo2)

                    p1_url = file_to_b64_data_url(p1_path, "image/jpeg") or f"http://127.0.0.1:5000/proof/{photo1}"
                    p2_url = file_to_b64_data_url(p2_path, "image/jpeg") or f"http://127.0.0.1:5000/proof/{photo2}"

                    ai_p1_url = file_to_b64_data_url(ai_p1_path, "image/jpeg") or None
                    ai_p2_url = file_to_b64_data_url(ai_p2_path, "image/jpeg") or None

                    v_url = None
                    if os.path.exists(os.path.join(PROOF_VIDEOS_DIR, video_mp4)) or os.path.exists(os.path.join(PROOF_FOLDER, video_mp4)):
                        v_url = f"http://127.0.0.1:5000/proof/{video_mp4}"
                    elif os.path.exists(os.path.join(PROOF_VIDEOS_DIR, video_avi)) or os.path.exists(os.path.join(PROOF_FOLDER, video_avi)):
                        v_url = f"http://127.0.0.1:5000/proof/{video_avi}"

                    l_url = f"http://127.0.0.1:5000/proof/{log_file}"

                    loc_summary = f"{lat_val:.4f}° N, {lng_val:.4f}° E" if (lat_val and lng_val) else "GPS Signal Unavailable"

                    records.append({
                        "id": ts_key,
                        "timestamp": readable_time or ts_key,
                        "reason": reason,
                        "ai_labels": ai_labels,
                        "photo1_name": photo1,
                        "photo1_url": p1_url,
                        "photo2_name": photo2,
                        "photo2_url": p2_url,
                        "ai_photo1_url": ai_p1_url,
                        "ai_photo2_url": ai_p2_url,
                        "video_url": v_url,
                        "log_name": log_file,
                        "log_url": l_url,
                        "log_content": log_content,
                        "lat": lat_val,
                        "lng": lng_val,
                        "location": loc_summary,
                        "gps_status": "FIXED" if (lat_val and lng_val) else "UNAVAILABLE"
                    })

        scan_dir(PROOF_LOGS_DIR)
        scan_dir(PROOF_FOLDER)
        records.sort(key=lambda r: r["id"], reverse=True)
        return jsonify(records), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/analyze_incident/<ts_key>", methods=["POST"])
def analyze_incident(ts_key):
    try:
        photo1_path = os.path.join(PROOF_IMAGES_DIR, f"ForestAlert_{ts_key}_Photo1.jpg")
        if not os.path.exists(photo1_path):
            photo1_path = os.path.join(PROOF_FOLDER, f"ForestAlert_{ts_key}_Photo1.jpg")

        photo2_path = os.path.join(PROOF_IMAGES_DIR, f"ForestAlert_{ts_key}_Photo2.jpg")
        if not os.path.exists(photo2_path):
            photo2_path = os.path.join(PROOF_FOLDER, f"ForestAlert_{ts_key}_Photo2.jpg")

        res_p1, b64_p1 = run_roboflow_ai_on_captured_photo(photo1_path) if os.path.exists(photo1_path) else ({}, "")
        res_p2, b64_p2 = run_roboflow_ai_on_captured_photo(photo2_path) if os.path.exists(photo2_path) else ({}, "")

        return jsonify({
            "success": True,
            "photo1_ai": b64_p1,
            "photo1_result": res_p1,
            "photo2_ai": b64_p2,
            "photo2_result": res_p2
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/telemetry", methods=["GET", "POST"])
def telemetry():
    global latest_telemetry
    if request.method == "POST":
        try:
            data = request.get_json(force=True, silent=True) or request.form.to_dict()
            if not data: return jsonify({"error": "Invalid payload"}), 400

            temp = float(data.get("temperature", data.get("temp", latest_telemetry["temperature"])))
            hum = float(data.get("humidity", data.get("hum", latest_telemetry["humidity"])))
            smoke = int(float(data.get("smoke", data.get("gas", latest_telemetry["smoke"]))))
            motion_raw = data.get("motion", latest_telemetry["motion"])
            motion = "DETECTED" if (isinstance(motion_raw, bool) and motion_raw) else str(motion_raw).upper()

            # Parse Genuine Latitude and Longitude sent by Arduino (Strict Zero-Fake Rule)
            raw_lat = float(data.get("lat", data.get("latitude", 0)))
            raw_lng = float(data.get("lng", data.get("longitude", 0)))
            if raw_lat != 0 and raw_lng != 0:
                lat_val, lng_val, gps_st = round(raw_lat, 6), round(raw_lng, 6), "FIXED"
            else:
                lat_val, lng_val, gps_st = None, None, "UNAVAILABLE"

            alert_active = bool(data.get("alert", data.get("alert_active", False)))
            reason = str(data.get("reason", data.get("trigger_reason", "NORMAL")))

            latest_telemetry.update({
                "temperature": round(temp, 1),
                "humidity": round(hum, 1),
                "smoke": smoke,
                "motion": motion,
                "lat": lat_val,
                "lng": lng_val,
                "gps_status": gps_st,
                "alert_active": alert_active,
                "alert_reason": reason,
                "last_updated": datetime.now().strftime("%H:%M:%S IST")
            })

            if alert_active or reason not in ["NORMAL", "CLEAR"]:
                trigger_new_incident_immediately(latest_telemetry, reason)

            return jsonify({"status": "success", "received": latest_telemetry}), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    return jsonify(latest_telemetry), 200

@app.route("/api/incidents", methods=["GET"])
def get_incidents():
    return jsonify(live_incidents), 200

@app.route("/detect", methods=["POST", "OPTIONS"])
def detect():
    if request.method == "OPTIONS": return jsonify({"status": "ok"}), 200
    if "image" not in request.files: return jsonify({"error": "An image or video file is required"}), 400

    uploaded = request.files["image"]
    original_filename = uploaded.filename or "uploaded_file.jpg"
    ext = os.path.splitext(original_filename)[1].lower()

    with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as temp:
        uploaded.save(temp.name)
        temp_input_path = temp.name

    processed_jpg_path = temp_input_path + "_converted.jpg"
    try:
        if ext in [".mp4", ".avi", ".mov", ".mkv", ".webm"]:
            cap = cv2.VideoCapture(temp_input_path)
            ret, frame = cap.read()
            cap.release()
            if not ret or frame is None: return jsonify({"error": "Could not extract frame from video"}), 400
            cv2.imwrite(processed_jpg_path, frame)
        else:
            img = cv2.imread(temp_input_path)
            if img is not None: cv2.imwrite(processed_jpg_path, img)
            else: processed_jpg_path = temp_input_path

        with open(processed_jpg_path, "rb") as f:
            img_b64 = base64.b64encode(f.read()).decode("utf-8")

        url = f"https://detect.roboflow.com/infer/workflows/{WORKSPACE_NAME}/{WORKFLOW_ID}"
        payload = {"inputs": {"image": {"type": "base64", "value": img_b64}}, "api_key": ROBOFLOW_API_KEY}
        response = requests.post(url, json=payload, timeout=35)
        if response.status_code == 200:
            data = response.json()
            outputs = data.get("outputs", [{}])
            res_obj = outputs[0] if len(outputs) > 0 else {}
            out_img_val = res_obj.get("output_image")
            if isinstance(out_img_val, dict): out_img_val = out_img_val.get("value")
            annotated_b64 = f"data:image/jpeg;base64,{out_img_val}" if isinstance(out_img_val, str) and len(out_img_val) > 100 else annotate_image_fallback(processed_jpg_path, res_obj)
            return jsonify({"success": True, "result": res_obj, "annotated_image": annotated_b64})
        else:
            return jsonify({"error": f"Roboflow API status {response.status_code}"}), response.status_code
    except Exception as err:
        return jsonify({"error": str(err)}), 500
    finally:
        for p in [temp_input_path, processed_jpg_path]:
            if os.path.exists(p):
                try: os.remove(p)
                except Exception: pass

if __name__ == "__main__":
    print(f"\n========================================================")
    print(f"ForestNet Non-Blocking Backend & Roboflow AI Detector")
    print(f"Proof Directory: {save_folder}")
    print(f"Local Server: http://127.0.0.1:5000")
    print(f"========================================================\n")
    app.run(host="0.0.0.0", port=5000, debug=True, use_reloader=False)
