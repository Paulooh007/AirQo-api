base_url = '/api/v1'

route = {
    'root': '/',
    'predict-faults': f'{base_url}/predict-faults/catboost',
    'get-faults': f'{base_url}/get-faults',

}

# http://127.0.0.1:4001/api/v1/predict-faults/catboost