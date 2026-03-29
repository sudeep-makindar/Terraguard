import cv2
from flask import Flask, Response
from flask_cors import CORS

app = Flask(__name__)
CORS(app)
cap = cv2.VideoCapture(0)

def gen():
    while True:
        ret, frame = cap.read()
        _, jpeg = cv2.imencode('.jpg', frame)
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' +
               jpeg.tobytes() + b'\r\n')

@app.route('/')
def video():
    return Response(gen(),
                    mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/snapshot')
def snapshot():
    ret, frame = cap.read()
    if not ret: return "Failed to grab frame", 500
    _, jpeg = cv2.imencode('.jpg', frame)
    return Response(jpeg.tobytes(), mimetype='image/jpeg')

app.run(host='0.0.0.0', port=5000)