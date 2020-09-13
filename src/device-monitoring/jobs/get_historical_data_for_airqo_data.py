import pandas as pd
from helpers import db_helpers


def get_hourly_channel_data(filename):
    #channel_id = 

    df = pd.read_csv(filename)

    df['time'] = pd.to_datetime(df['time'])
    df['time'] = df['time']
    df['s1_pm2_5'] = pd.to_numeric(df['s1_pm2_5'], errors='coerce')
    df['channel_id'] = pd.to_numeric(df['channel_id'], errors='coerce')
    df['s1_pm10'] = pd.to_numeric(df['s1_pm10'], errors='coerce')
    df['s2_pm2_5'] = pd.to_numeric(df['s2_pm2_5'], errors='coerce')
    df['s2_pm10'] = pd.to_numeric(df['s2_pm10'], errors='coerce')
    df['s1_s2_average_pm2_5'] = df[[
        's1_pm2_5', 's2_pm2_5']].mean(axis=1).round(2)
    df['s1_s2_average_pm10'] = df[['s1_pm10', 's2_pm10']].mean(axis=1).round(2)
    df['battery_voltage'] = pd.to_numeric(df['battery_voltage'], errors='coerce')
    time_indexed_data = df.set_index('time')
    final_hourly_data = time_indexed_data.resample('H').mean().round(2)

    ## get data for each channel e.g and loop through the data and call a function that 
    ## does the mapping


    ## save values for each channel to db

    return 


def map_bigquery_data_to_netmanager_events_collection(channel_data, channel_id):
    ## get the device name that corresponds to the channel ids
    channel_name = get_device_name_for_specified_channel(channel_id)
    if channel_name['value'] != 0:
        #do the mapping and call the api for saving component values
        channel_name_value = channel_name['value']
        BASE_API_URL='http://127.0.0.1:3000/api/v1/devices/components/add/values?device='+channel_name_value
        request_body = 
        
        
        api_url = '{0}{1}'.format(BASE_API_URL,'channels')
    { "values": [
{ "componentName": {
          "value": 22,
          "raw": 33,
          "weight": 2,
          "frequency": "hourly"
        }
}
], "timestamp":"2020-09-12T10:45:00.23Z"
}


def get_device_name_for_specified_channel(channel_id):
    db = db_helpers.connect_mongo()
    result = db.devices.find(
            {'channelID': {'$eq': channel_id}}, {'name': 1, 'channelID': 1})
    if result['name']:
        return {'value':result['name'], 'message':'successfuly found'}
    else:
        return {'value':0, 'message': 'name with channelid not found'}
    