import pandas as pd
from pymongo import MongoClient
import requests

#MONGO_URI = os.getenv('MONGO_URI')

MONGO_URI = "mongodb://admin:airqo-250220-master@35.224.67.244:27017"
REQUEST_POST_BASE_URI_FOR_SAVING_EVENTS = 'http://localhost:3000/api/v1/devices/components/add/values?device=aq_01&component=aq_01_comp_23'

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

        result = get_device_name_for_specified_channel(channel_id['channelID'])

        device_name = result['value']
        device_components = get_device_components(device_name)

        pms5003_components = [device_component['name'] for device_component in device_components if device_component['description']=='pms5003']
        dht11_components = [device_component['name'] for device_component in device_components if device_component['description']=='DHT11']
        battery_voltage_component = [device_component['name'] for device_component in device_components if device_component['description']=='Lithium Ion 18650']
        #pms5003_components = [device_component['name'] for device_component in device_components if device_component['description']=='pms5003']

        for row in channel_hourly_data.head().itertuples():
            print(row.Index, row.date, row.delay)
            if pms5003_components: 
                pms_sensor_one_pm25 = pms5003_components[0]


                for component in pms5003_components:
                    print('------pms5003 components---')
                    print(component)
                    

                if dht11_components:
                    for component in dht11_components:
                        print('------dht11 components---')
                        print(component)
                
                if battery_voltage_component:
                    for component in battery_voltage_component:
                        print('------battery components---')
                        print(component)
                    ## call method that does
            '''
                        {
            
            '''
        
        

        
        ## call a function that does the mapping

        ## save values for each channel to db

    return result

def map_to_events_collection_format(value, raw_value, weight, frequency, calibrated_value,time, uncertainty_value,standard_deviation_value, measurement_quantity_kind, measurement_unit):
    request_body = {
                        "value":value, 
                        "raw": raw_value, 
                        "weight":weight,
                        "frequency": frequency,
                        "calibratedValue": calibrated_value, #need to add actual value
                        "time": time,
                        "uncertaintyValue":uncertainty_value, 
                        "standardDeviationValue":standard_deviation_value,
                        "measurement": {
                            "quantityKind": measurement_quantity_kind,
                            "measurementUnit": measurement_unit
                        }           
                    }

    return request_body



def map_bigquery_data_to_netmanager_events_collection(channel_data, channel_id):
    ## get the device name that corresponds to the channel ids
    channel_name = get_device_name_for_specified_channel(channel_id)
    if channel_name['value'] != 0:
        #do the mapping and call the api for saving component values
        channel_name_value = channel_name['value']
        
        
def save_events_data(request_body, request_uri):
    result = requests.post(request_uri,data = request_body)
    print(result)


def get_device_components(device_name):
    db = connect_mongo()
    result_list = list(db.components.find({'deviceID': device_name},{'deviceID':1,'name':1,'description':1, 'measurement':1,'_id': 0}))
    return   result_list


def get_all_device_channels():
    db = connect_mongo()
    channel_list = list(db.devices.find({},{'channelID':1,'_id':0}))   
    return channel_list


def get_device_name_for_specified_channel(channel_id):
    db = connect_mongo()
    result_list = list(db.devices.find({'channelID': channel_id}, {'name': 1, 'channelID': 1}))
    if result_list:
        result = result_list[0]
        if result:
            return {'value':result['name'], 'message':'successfuly found'}
        else:
            return {'value':0, 'message': 'name with channelid not found'}
    else:
            return {'value':0, 'message': 'name with channelid not found'}


if __name__ == "__main__":
    x = get_device_name_for_specified_channel(643676)
    print(x)
    #values = get_device_components(device_name)
    
    results = get_all_device_channels()
    for channel_id in results[0:3]:
        print(channel_id)
        print('----------')
        result = get_device_name_for_specified_channel(channel_id['channelID'])
        print('--device name -----')
        print(result)
        device_name = result['value']
        device_components = get_device_components(device_name)
        print(device_components)

        pms5003_components = [device_component['name'] for device_component in device_components if device_component['description']=='pms5003']
        dht11_components = [device_component['name'] for device_component in device_components if device_component['description']=='DHT11']
        battery_voltage_component = [device_component['name'] for device_component in device_components if device_component['description']=='Lithium Ion 18650']
        #pms5003_components = [device_component['name'] for device_component in device_components if device_component['description']=='pms5003']

        if pms5003_components: 
            for component in pms5003_components:
                print('------pms5003 components---')
                print(component)

                ## call method that does

                
        
        if dht11_components:
            for component in dht11_components:
                print('------dht11 components---')
                print(component)

        if battery_voltage_component:
            for component in battery_voltage_component:
                print('------battery components---')
                print(component)


        



    
    