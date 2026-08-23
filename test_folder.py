import os
import sys
import requests
import json
import base64
import numpy as np
import cv2
from pathlib import Path

# Ensure UTF-8 output encoding for Windows terminal
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

API_URL = "http://127.0.0.1:5000/detect"
SUPPORTED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}

def visualize_and_show(img_path, res, output_dir="detected_results", show_gui=True):
    os.makedirs(output_dir, exist_ok=True)
    
    if isinstance(res, list) and len(res) > 0:
        res_obj = res[0]
    elif isinstance(res, dict):
        res_obj = res
    else:
        return

    # Check if base64 annotated image is provided
    img = None
    output_img_val = res_obj.get("output_image")
    if isinstance(output_img_val, dict):
        output_img_val = output_img_val.get("value")

    if isinstance(output_img_val, str) and len(output_img_val) > 100:
        try:
            img_bytes = base64.b64decode(output_img_val)
            np_arr = np.frombuffer(img_bytes, np.uint8)
            img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        except Exception:
            img = None

    if img is None:
        img = cv2.imread(str(img_path))

    if img is None:
        return

    # Draw bounding boxes if predictions exist
    all_preds = []
    t_preds = res_obj.get("threat_predictions", {}).get("predictions", [])
    tr_preds = res_obj.get("tracked_entities", {}).get("predictions", [])
    if isinstance(t_preds, list):
        all_preds.extend([(p, (0, 0, 255), "THREAT") for p in t_preds]) # Red
    if isinstance(tr_preds, list):
        all_preds.extend([(p, (255, 165, 0), "ENTITY") for p in tr_preds]) # Orange

    for p, color, ptype in all_preds:
        label = p.get("class", p.get("label", "Object"))
        conf = p.get("confidence", 0)
        
        if "x" in p and "y" in p and "width" in p and "height" in p:
            cx, cy, bw, bh = p["x"], p["y"], p["width"], p["height"]
            xmin = max(0, int(cx - bw / 2))
            ymin = max(0, int(cy - bh / 2))
            xmax = min(img.shape[1], int(cx + bw / 2))
            ymax = min(img.shape[0], int(cy + bh / 2))
            
            cv2.rectangle(img, (xmin, ymin), (xmax, ymax), color, 2)
            caption = f"{label} {conf*100:.0f}%"
            (tw, th), _ = cv2.getTextSize(caption, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
            cv2.rectangle(img, (xmin, max(0, ymin - th - 6)), (xmin + tw + 4, ymin), color, -1)
            cv2.putText(img, caption, (xmin + 2, max(12, ymin - 4)), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)

    # Add header banner with Alert summary
    alerts = []
    if res_obj.get("suspected_poaching"): alerts.append("POACHING")
    if res_obj.get("tree_harm_risk"): alerts.append("TREE HARM")
    if res_obj.get("fire_or_smoke_alert"): alerts.append("FIRE/SMOKE")
    if res_obj.get("moving_humans"): alerts.append("HUMAN")
    if res_obj.get("moving_animals"): alerts.append("ANIMAL")

    banner_color = (0, 0, 200) if alerts else (0, 150, 0)
    banner_text = f"ALERTS: {', '.join(alerts)}" if alerts else "STATUS: CLEAR"
    cv2.rectangle(img, (0, 0), (img.shape[1], 35), banner_color, -1)
    cv2.putText(img, banner_text, (10, 24), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)

    # Save visualization to output folder
    out_file = Path(output_dir) / f"detected_{Path(img_path).name}"
    cv2.imwrite(str(out_file), img)
    print(f"  [SAVED DETECTED IMAGE]: {out_file}")

    if show_gui:
        cv2.imshow("Forest Guardian - Visual Detections (Press key or wait 2s)", img)
        cv2.waitKey(2000)

def print_image_predictions(img_name, data):
    print(f"\n[IMAGE] {img_name}")
    
    if isinstance(data, list) and len(data) > 0:
        res = data[0]
    elif isinstance(data, dict):
        res = data
    else:
        print("  Raw Output:", data)
        return

    poaching = res.get("suspected_poaching", False)
    tree_harm = res.get("tree_harm_risk", False)
    fire_smoke = res.get("fire_or_smoke_alert", False)
    humans = res.get("moving_humans", False)
    animals = res.get("moving_animals", False)

    alerts = []
    if poaching: alerts.append("Suspected Poaching")
    if tree_harm: alerts.append("Tree Harm Risk")
    if fire_smoke: alerts.append("Fire/Smoke Alert")
    if humans: alerts.append("Humans Detected")
    if animals: alerts.append("Animals Detected")

    if alerts:
        print("  [ALERTS TRIGGERED]:", ", ".join(alerts))
    else:
        print("  [STATUS]: Clear (No threat alerts triggered)")

    threat_preds = res.get("threat_predictions", {}).get("predictions", [])
    if threat_preds:
        print(f"  [Threat Objects Found ({len(threat_preds)})]:")
        for idx, p in enumerate(threat_preds, 1):
            lbl = p.get("class", p.get("label", "Object"))
            conf = p.get("confidence", 0)
            print(f"     {idx}. {lbl} (Confidence: {conf*100:.1f}%)")

    tracked = res.get("tracked_entities", {}).get("predictions", [])
    if tracked:
        print(f"  [Entities Tracked ({len(tracked)})]:")
        for idx, p in enumerate(tracked, 1):
            lbl = p.get("class", p.get("label", "Entity"))
            conf = p.get("confidence", 0)
            print(f"     {idx}. {lbl} (Confidence: {conf*100:.1f}%)")

def test_folder(folder_path, limit=5, show_gui=True):
    folder = Path(folder_path)
    if not folder.exists():
        print(f"Error: Folder '{folder_path}' does not exist.")
        return

    images = [f for f in folder.iterdir() if f.suffix.lower() in SUPPORTED_EXTENSIONS]
    if limit > 0 and len(images) > limit:
        print(f"Found {len(images)} images in '{folder_path}'. Testing first {limit} images...")
        images = images[:limit]
    else:
        print(f"Found {len(images)} images in '{folder_path}'")

    print("="*60)

    results = []

    for img_path in images:
        try:
            with open(img_path, "rb") as img_file:
                response = requests.post(API_URL, files={"image": img_file})

            if response.status_code == 200:
                data = response.json()
                print_image_predictions(img_path.name, data)
                visualize_and_show(img_path, data, show_gui=show_gui)
                results.append({
                    "filename": img_path.name,
                    "result": data
                })
            else:
                print(f"\n[ERROR] {img_path.name}: HTTP Status {response.status_code}")
        except Exception as e:
            print(f"\n[ERROR] {img_path.name}: {e}")

    cv2.destroyAllWindows()

    report_file = "batch_test_results.json"
    with open(report_file, "w") as f:
        json.dump(results, f, indent=2)

    print("\n" + "="*60)
    print(f"Completed testing {len(results)} images!")
    print(f"Annotated detection images saved to 'detected_results/' folder.")
    print(f"Full JSON results saved to '{report_file}'")

if __name__ == "__main__":
    path = sys.argv[1] if len(sys.argv) > 1 else r"C:\Users\SWARNAVA\OneDrive\Desktop\TESTING\merged_dataset\test\images"
    limit = int(sys.argv[2]) if len(sys.argv) > 2 else 5
    test_folder(path, limit, show_gui=True)
