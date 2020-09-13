import pandas as pd
from pymongo import MongoClient

#MONGO_URI = os.getenv('MONGO_URI')

MONGO_URI = "mongodb://admin:airqo-250220-master@35.224.67.244:27017"

from pymongo import MongoClient

def connect_mongo():
    client = MongoClient(MONGO_URI)
    db = client['airqo_netmanager']
    return db

def get_hourly_aggregated_channel_data(channel_id,entire_dataset,freq='H'):
    '''
    Get Hourly Aggregates using Mean of the Data for specified channel.
    '''
   
    channel_data = entire_dataset[entire_dataset['channel_id'] == channel_id]
    channel_data['created_at'] = pd.to_datetime(channel_data['created_at'])
    channel_data = channel_data.sort_values(by = 'created_at')[['created_at', 'pm2_5', 'pm10', 's2_pm2_5','s2_pm10', 'voltage']]
    channel_data['s1_s2_average_pm2_5'] = channel_data[['pm2_5', 's2_pm2_5']].mean(axis=1).round(2)
    channel_data['s1_s2_average_pm10'] = channel_data[['pm10', 's2_pm10']].mean(axis=1).round(2)

    time_indexed_channel_data = channel_data.set_index('created_at')
    #channel_data = channel_data.interpolate('time', limit_direction='both')

    channel_aggregated_data = time_indexed_channel_data.resample('H').mean().round(2)
    channel_aggregated_data['channel_id'] = channel_id

    return channel_aggregated_data


def get_hourly_channel_data(filename):
    #channel_id = 

    df = pd.read_csv(filename)
    ## get the list of all the channels we have 
    all_channel_ids = get_all_device_channels()
    for channel in all_channel_ids:
        channel_id = channel['channelID']
         ## get data for each channel
        channel_hourly_data = get_hourly_aggregated_channel_data(channel_id, df)
        ## call a function that does the mapping

        ## save values for each channel to db

    return 


def map_bigquery_data_to_netmanager_events_collection(channel_data, channel_id):
    ## get the device name that corresponds to the channel ids
    channel_name = get_device_name_for_specified_channel(channel_id)
    if channel_name['value'] != 0:
        #do the mapping and call the api for saving component values
        channel_name_value = channel_name['value']
        BASE_API_URL='http://127.0.0.1:3000/api/v1/devices/components/add/values?device='+channel_name_value
       
        ''' 
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
        '''

def get_all_device_channels():
    db = connect_mongo()
    channel_list = list(db.devices.find({},{'channelID':1,'_id':0}))   
    return channel_list


def get_device_name_for_specified_channel(channel_id):
    db = connect_mongo()
    result = db.devices.find(
            {'channelID': {'$eq': channel_id}}, {'name': 1, 'channelID': 1})
    if result['name']:
        return {'value':result['name'], 'message':'successfuly found'}
    else:
        return {'value':0, 'message': 'name with channelid not found'}


if __name__ == "__main__":
    results = get_all_device_channels()
    for channel_id in results:
        print(channel_id)
        print('----------')
    