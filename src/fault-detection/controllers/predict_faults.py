import json
from time import monotonic
from flask import jsonify, Blueprint, request,make_response, Flask
import pandas
from models import classification
from routes import api
from pymongo import MongoClient
from dotenv import load_dotenv, find_dotenv 
import os



fault_detection = Blueprint('fault_detection', __name__)
load_dotenv(find_dotenv())
MONGO_URI = os.environ.get("MONGO_URI")
client = MongoClient(MONGO_URI)

@fault_detection.route(api.route['predict-faults'], methods=['POST'])
def predict_faults():
    request_data = request.get_json()

    raw_values = request_data.get('raw_values')

    cat = classification.Classification()
    try:
        pred = cat.predict_faults(raw_values)
    except Exception as e:
        return jsonify({"error": str(e)})

    resp = {
    "datetime": request_data.get('datetime'),
    "values": pred.to_dict("records")
    }
    return resp


@fault_detection.route(api.route['get-faults'], methods=['GET'])
def get_faults():
    # client.fault_detection.predicted_faults.update_many({}, { "$rename": { "values": "readings" } })
    pred = client.fault_detection.predicted_faults
    
    recent_faults = list(pred.find({},{"_id": 0}).limit(1))
    try:
        return jsonify(recent_faults)
    except Exception as e:
        return jsonify({"error": str(e)})

    
