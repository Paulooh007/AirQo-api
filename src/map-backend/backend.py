from gpmodel import gpmodel
from interpolate import interp, lonlat, getgrid
from getresponse import getresponse
from flask import Flask, jsonify, request, render_template
import numpy as np
from bokeh.embed import file_html
from bokeh.resources import CDN
import time
import threading
import os
from flask_cors import CORS
import time

backend = Flask(__name__)
CORS(backend)

def run_models(init = False):
    global mean_interp, var_interp, last_updated
    
    while True:
        print("* * * * * Updating GP model * * * * *")
        predmeans, predvars, Xtest = gpmodel()
        temp_interp = interp(predmeans, predvars, Xtest)
        print("* * * * * Updating interpolator * * * * *")
        mean_interp, var_interp = temp_interp
        print("* * * * * Sleeping for 1 hour * * * * *")
        t = time.localtime()
        last_updated = time.strftime("%H:%M:%S", t)
        if init == True:
            print("* * * * * Initial Setup Complete * * * * *")
            break
        else:
            time.sleep(3600)     
 
run_models(init = True)
threading.Thread(target=run_models, name="interpolator").start()        

@backend.route('/api',methods=['GET', 'POST'])
def main():        
    response = getresponse(request, mean_interp, var_interp)        
    return jsonify(response)

@backend.route('/status',methods=['GET'])
def status(): 
    response = [str(element) for element in threading.enumerate()]
    response.append("<Last updated: {}>".format(last_updated))
    return jsonify(response)

if __name__ == "__main__":
 backend.run(host='0.0.0.0',port=int(os.environ.get('PORT', 5000)))