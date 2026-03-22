from flask import Flask, request, jsonify
from flask_cors import CORS
import cv2
import numpy as np
import base64
import os
import sys
import traceback
from pathlib import Path
from ultralytics import YOLO

app = Flask(__name__)
CORS(app)

_BASE = Path(__file__).resolve().parent
os.chdir(_BASE)

# Override with: export PPE_MODEL_PATH=/path/to/best.pt
MODEL_PATH = os.environ.get("PPE_MODEL_PATH") or "ppe_training/yolov11_ppe/weights/best.pt"
if not os.path.isfile(MODEL_PATH):
    print(f"⚠️ Warning: {MODEL_PATH} not found. Using default yolov11n.pt for testing.")
    MODEL_PATH = "yolo11n.pt"

try:
    model = YOLO(MODEL_PATH)
    print(f"✅ PPE YOLO Model Loaded Successfully: {MODEL_PATH}")
except Exception as e:
    print(f"❌ Error loading YOLO model: {e}")
    model = None


def _ppe_thresholds():
    """Separate min confidence; jacket false-positives more than helmet on webcam."""
    legacy = os.environ.get("PPE_CONF")
    helmet_default = legacy if legacy is not None else "0.55"
    helmet_min = float(os.environ.get("PPE_HELMET_CONF", helmet_default))
    jacket_min = float(os.environ.get("PPE_JACKET_CONF", "0.65"))
    # Run YOLO with at least the stricter of the two so NMS drops junk early (override if needed).
    infer_default = min(helmet_min, jacket_min) * 0.92
    infer = float(os.environ.get("PPE_INFER_CONF", str(round(infer_default, 3))))
    infer = min(infer, helmet_min, jacket_min)
    return infer, helmet_min, jacket_min


def _box_plausible_ppe(cls: int, xyxy, h_img: int, w_img: int) -> bool:
    """Kill background false positives: helmet must sit upper frame; vest in torso band."""
    x1, y1, x2, y2 = map(float, xyxy)
    h = max(h_img, 1)
    w = max(w_img, 1)
    cx = ((x1 + x2) / 2) / w
    cy = ((y1 + y2) / 2) / h
    bh = (y2 - y1) / h
    bw = (x2 - x1) / w

    if cls == 0:
        if cy > float(os.environ.get("PPE_HELMET_MAX_CY", "0.55")):
            return False
        if bh < float(os.environ.get("PPE_HELMET_MIN_H_FRAC", "0.028")):
            return False
        if bw < float(os.environ.get("PPE_HELMET_MIN_W_FRAC", "0.022")):
            return False
    elif cls == 1:
        if cy < float(os.environ.get("PPE_VEST_MIN_CY", "0.16")) or cy > float(os.environ.get("PPE_VEST_MAX_CY", "0.90")):
            return False
        if bh < float(os.environ.get("PPE_VEST_MIN_H_FRAC", "0.07")):
            return False
        if bw < float(os.environ.get("PPE_VEST_MIN_W_FRAC", "0.075")):
            return False
    return True


def _parse_face_box_px(data, w_img: int, h_img: int):
    """Client sends normalized top-left + size (same frame as snapshot). Returns xyxy pixels or None."""
    fb = data.get("face_box")
    if not fb or not isinstance(fb, dict):
        return None
    try:
        x = float(fb["x"])
        y = float(fb["y"])
        bw = float(fb["width"])
        bh = float(fb["height"])
    except (KeyError, TypeError, ValueError):
        return None
    if bw <= 0 or bh <= 0:
        return None
    x1 = max(0.0, x * w_img)
    y1 = max(0.0, y * h_img)
    x2 = min(float(w_img), (x + bw) * w_img)
    y2 = min(float(h_img), (y + bh) * h_img)
    if x2 <= x1 or y2 <= y1:
        return None
    return (x1, y1, x2, y2)


def _iou_xyxy(a, b) -> float:
    ax1, ay1, ax2, ay2 = map(float, a)
    bx1, by1, bx2, by2 = map(float, b)
    ix1 = max(ax1, bx1)
    iy1 = max(ay1, by1)
    ix2 = min(ax2, bx2)
    iy2 = min(ay2, by2)
    iw = max(0.0, ix2 - ix1)
    ih = max(0.0, iy2 - iy1)
    inter = iw * ih
    if inter <= 0:
        return 0.0
    aa = max(0.0, ax2 - ax1) * max(0.0, ay2 - ay1)
    ba = max(0.0, bx2 - bx1) * max(0.0, by2 - by1)
    union = aa + ba - inter
    return inter / union if union > 0 else 0.0


def _helmet_vs_face_ok(h_xyxy, face_xyxy) -> bool:
    """
    Bare heads are often mis-detected as helmet with a box coincident with the face.
    Real helmets usually extend noticeably above the hairline / face detector box.
    """
    hy1 = float(h_xyxy[1])
    fy1 = float(face_xyxy[1])
    fy2 = float(face_xyxy[3])
    face_h = max(fy2 - fy1, 1e-6)
    iou = _iou_xyxy(h_xyxy, face_xyxy)
    extend_above = fy1 - hy1
    min_ext = float(os.environ.get("PPE_HELMET_MIN_EXTEND_ABOVE_FACE_FRAC", "0.10")) * face_h
    iou_reject = float(os.environ.get("PPE_HELMET_FACE_IOU_REJECT", "0.18"))
    if iou >= iou_reject and extend_above < min_ext:
        return False
    return True


def _jacket_vs_face_ok(j_xyxy, face_xyxy) -> bool:
    """Vest should sit on torso, not on the face; reject face-sized 'jacket' boxes."""
    fx1, fy1, fx2, fy2 = map(float, face_xyxy)
    face_h = max(fy2 - fy1, 1e-6)
    iou = _iou_xyxy(j_xyxy, face_xyxy)
    if iou >= float(os.environ.get("PPE_VEST_FACE_IOU_REJECT", "0.35")):
        return False
    jcy = (float(j_xyxy[1]) + float(j_xyxy[3])) / 2
    # Torso / vest: box center should sit below the chin (face box bottom)
    margin = float(os.environ.get("PPE_VEST_CENTER_BELOW_CHIN_FRAC", "0.06")) * face_h
    if jcy < fy2 + margin:
        return False
    return True


if model is not None:
    _i, _h, _j = _ppe_thresholds()
    _mf = os.environ.get("PPE_MIN_BOX_AREA_FRAC", "0.002")
    print(f"   PPE gates: infer≥{_i}, helmet≥{_h}, jacket≥{_j}, min_box_area_frac={_mf}")


@app.route('/verify_helmet', methods=['POST'])
def verify_helmet():
    if model is None:
        return jsonify({"error": "Model missing", "helmet": False}), 503
        
    try:
        data = request.json
        if not data or 'image' not in data:
            return jsonify({"error": "No image provided", "helmet": False}), 400
            
        # Decode base64 frame shot from React
        img_data = base64.b64decode(data['image'])
        nparr = np.frombuffer(img_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            return jsonify({"error": "Invalid image format", "helmet": False}), 400

        infer_conf, helmet_min, jacket_min = _ppe_thresholds()
        results = model(img, conf=infer_conf, iou=float(os.environ.get("PPE_IOU", "0.5")), verbose=False)[0]

        h_img, w_img = img.shape[:2]
        img_area = max(h_img * w_img, 1)
        min_area_frac = float(os.environ.get("PPE_MIN_BOX_AREA_FRAC", "0.002"))
        face_px = _parse_face_box_px(data, w_img, h_img)

        passed = []  # {cls, det_conf, xyxy, label_text}

        for box in results.boxes:
            cls = int(box.cls[0].item())
            det_conf = float(box.conf[0].item())
            xyxy = box.xyxy[0].tolist()

            if cls not in (0, 1):
                continue
            if cls == 0 and det_conf < helmet_min:
                continue
            if cls == 1 and det_conf < jacket_min:
                continue

            bw = max(float(xyxy[2]) - float(xyxy[0]), 0.0)
            bh = max(float(xyxy[3]) - float(xyxy[1]), 0.0)
            if (bw * bh) / img_area < min_area_frac:
                continue
            if not _box_plausible_ppe(cls, xyxy, h_img, w_img):
                continue

            if face_px is not None:
                if cls == 0 and not _helmet_vs_face_ok(xyxy, face_px):
                    continue
                if cls == 1 and not _jacket_vs_face_ok(xyxy, face_px):
                    continue

            label_text = results.names.get(cls, str(cls)) if isinstance(results.names, dict) else results.names[cls]
            passed.append(
                {"cls": cls, "det_conf": det_conf, "xyxy": xyxy, "label_text": label_text}
            )

        def _best(c):
            same = [p for p in passed if p["cls"] == c]
            return max(same, key=lambda p: p["det_conf"]) if same else None

        bh = _best(0)
        bj = _best(1)
        helmet_detected = bh is not None
        vest_detected = bj is not None

        detected_objects = []
        for p in (bh, bj):
            if p is None:
                continue
            xyxy = p["xyxy"]
            cls = p["cls"]
            detected_objects.append(
                {
                    "box": [float(xyxy[0]), float(xyxy[1]), float(xyxy[2]), float(xyxy[3])],
                    "label": p["label_text"],
                    "score": p["det_conf"],
                    "class_id": cls,
                }
            )

        return jsonify({
            "helmet": helmet_detected,
            "vest": vest_detected,
            "detections": detected_objects,
            "status": "success",
        })
        
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e), "helmet": False}), 500

if __name__ == '__main__':
    print("🚀 Booting up Vikaas PPE Diagnostic Endpoint (Ultralytics YOLOv11) on Port 5000...")
    app.run(port=5000, debug=True, use_reloader=False)
