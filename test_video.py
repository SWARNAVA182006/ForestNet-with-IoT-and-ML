import os
import sys
import cv2
import requests
import json
import base64
import numpy as np
from pathlib import Path

# Ensure UTF-8 encoding for Windows terminal
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

API_URL = "http://127.0.0.1:5000/detect"

def process_video(video_path, output_video_path=None, sample_rate=2, show_gui=False):
    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        print(f"Error: Could not open video file '{video_path}'")
        return

    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    if not output_video_path:
        os.makedirs("detected_videos", exist_ok=True)
        output_video_path = os.path.join("detected_videos", f"detected_{Path(video_path).stem}.mp4")

    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out_writer = cv2.VideoWriter(str(output_video_path), fourcc, fps, (width, height))

    print(f"\nProcessing Video: {Path(video_path).name}")
    print(f"  Resolution: {width}x{height} | Total Frames: {total_frames} | FPS: {fps:.1f}")
    print("="*60)

    frame_idx = 0
    cached_res = None

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        frame_idx += 1

        # Send frames to workflow at sample_rate interval
        if frame_idx % sample_rate == 0 or cached_res is None:
            _, buffer = cv2.imencode(".jpg", frame)
            try:
                response = requests.post(API_URL, files={"image": ("frame.jpg", buffer.tobytes(), "image/jpeg")})
                if response.status_code == 200:
                    cached_res = response.json()
            except Exception as e:
                pass

        # Draw detection overlays
        if cached_res:
            res_obj = cached_res[0] if isinstance(cached_res, list) and len(cached_res) > 0 else cached_res
            
            all_preds = []
            t_preds = res_obj.get("threat_predictions", {}).get("predictions", [])
            tr_preds = res_obj.get("tracked_entities", {}).get("predictions", [])
            if isinstance(t_preds, list): all_preds.extend([(p, (0, 0, 255)) for p in t_preds]) # Red
            if isinstance(tr_preds, list): all_preds.extend([(p, (255, 165, 0)) for p in tr_preds]) # Orange

            for p, color in all_preds:
                label = p.get("class", p.get("label", "Detection"))
                conf = p.get("confidence", 0)
                if "x" in p and "y" in p and "width" in p and "height" in p:
                    cx, cy, bw, bh = p["x"], p["y"], p["width"], p["height"]
                    xmin = max(0, int(cx - bw / 2))
                    ymin = max(0, int(cy - bh / 2))
                    xmax = min(width, int(cx + bw / 2))
                    ymax = min(height, int(cy + bh / 2))
                    
                    cv2.rectangle(frame, (xmin, ymin), (xmax, ymax), color, 2)
                    caption = f"{label} {conf*100:.0f}%"
                    (tw, th), _ = cv2.getTextSize(caption, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
                    cv2.rectangle(frame, (xmin, max(0, ymin - th - 6)), (xmin + tw + 4, ymin), color, -1)
                    cv2.putText(frame, caption, (xmin + 2, max(12, ymin - 4)), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)

            # Draw Alert Banner across top of video
            alerts = []
            if res_obj.get("suspected_poaching"): alerts.append("POACHING")
            if res_obj.get("tree_harm_risk"): alerts.append("TREE HARM")
            if res_obj.get("fire_or_smoke_alert"): alerts.append("FIRE/SMOKE")
            if res_obj.get("moving_humans"): alerts.append("HUMAN MOVING")
            if res_obj.get("moving_animals"): alerts.append("ANIMAL MOVING")

            banner_color = (0, 0, 200) if alerts else (0, 150, 0)
            banner_text = f"ALERTS: {', '.join(alerts)}" if alerts else "STATUS: CLEAR"
            cv2.rectangle(frame, (0, 0), (width, 35), banner_color, -1)
            cv2.putText(frame, banner_text, (10, 24), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)

        out_writer.write(frame)

        if show_gui:
            cv2.imshow("Forest Guardian Video Analyzer", frame)
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break

        if frame_idx % 20 == 0:
            print(f"  Processed {frame_idx}/{total_frames} frames ({frame_idx/total_frames*100:.1f}%)")

    cap.release()
    out_writer.release()
    if show_gui:
        cv2.destroyAllWindows()
    print(f"\nFinished! Video saved to: {output_video_path}")

if __name__ == "__main__":
    vpath = sys.argv[1] if len(sys.argv) > 1 else r"C:\Users\SWARNAVA\OneDrive\Desktop\new_testing\test.mp4"
    show_gui = "--gui" in sys.argv
    process_video(vpath, show_gui=show_gui)
