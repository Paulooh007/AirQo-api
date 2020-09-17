import pandas as pd
from pymongo import MongoClient
import requests
from datetime import datetime,timedelta
import os

MONGO_URI = os.getenv('MONGO_URI')


REQUEST_POST_BASE_URI_FOR_SAVING_EVENTS = 'http://localhost:3000/api/v1/devices/components/add/values?device=aq_01&component=aq_01_comp_23'

def connect_mongo():
    client = MongoClient(MONGO_URI)
    db = client['airqo_netmanager_staging']
    return db

def get_hourly_aggregated_channel_data(channel_id,entire_dataset,freq='H'):
    '''
    Get Hourly Aggregates using Mean of the Data for specified channel.
    '''
   
    channel_data = entire_dataset[entire_dataset['channel_id'] == channel_id]
    channel_data['created_at'] = pd.to_datetime(channel_data['created_at'])
    channel_data = channel_data.sort_values(by = 'created_at')[['created_at', 'pm2_5', 'pm10', 's2_pm2_5','s2_pm10', 'temperature','humidity', 'voltage']]
    channel_data['s1_s2_average_pm2_5'] = channel_data[['pm2_5', 's2_pm2_5']].mean(axis=1).round(2)
    channel_data['s1_s2_average_pm10'] = channel_data[['pm10', 's2_pm10']].mean(axis=1).round(2)

    time_indexed_channel_data = channel_data.set_index('created_at')
    #channel_data = channel_data.interpolate('time', limit_direction='both')

    channel_aggregated_data = time_indexed_channel_data.resample('H').mean().round(2)
    #channel_aggregated_data['channel_id'] = channel_id
    channel_aggregated_data.dropna(inplace=True)

    return channel_aggregated_data

def calibrate_pm25_values(raw_value):
    #predicted_values = 7.89053801 +  1.22337309 * actual_june_bam_x_values
    calibrated_value = 7.89053801 +  1.22337309 * raw_value
    return calibrated_value

def get_hourly_channel_data(filename):
    #channel_id = 

    df = pd.read_csv(filename)
    ## get the list of all the channels we have 
    all_channel_ids = get_all_device_channels()
    for channel in all_channel_ids[10:20]:
        channel_id = channel['channelID']
         ## get data for each channel
        channel_hourly_data = get_hourly_aggregated_channel_data(channel_id, df)
        
        result = get_device_name_for_specified_channel(channel_id)

        device_name = result['value']
        print('*************************')
        print(device_name)
        
        device_components = get_device_components(device_name)

        print('count of components is: ' + str(len(device_components)))

        pms5003_components = [{'component_name':device_component['name']} for device_component in device_components if device_component['description']=='pms5003']
        dht11_components = [{'component_name':device_component['name']} for device_component in device_components if device_component['description']=='DHT11']
        battery_voltage_component = [{'component_name':device_component['name']} for device_component in device_components if device_component['description']=='Lithium Ion 18650']
        #pms5003_components = [device_component['name'] for device_component in device_components if device_component['description']=='pms5003']

        for row in channel_hourly_data.head(3).itertuples():            
            if pms5003_components: 
                pms_sensor_one = pms5003_components[0]
                raw_value =  row.pm2_5 
                value = row.pm2_5
                time = row.Index
                weight = 1
                frequency = 'hour'
                calibrated_value = calibrate_pm25_values(raw_value)
                uncertainty_value = calibrate_pm25_values(raw_value) #to update and call function that gets uncertainity
                standard_deviation_value = calibrated_value(raw_value)
                measurement_quantity_kind = 'PM 2.5'
                measurement_unit = 'µg/m3'
                sensor_one_pm25_obj = map_to_events_collection_format(value, raw_value, weight, frequency, calibrated_value,time, uncertainty_value,standard_deviation_value, measurement_quantity_kind, measurement_unit)
                
                update_events_measurements(pms_sensor_one['component_name'],device_name, sensor_one_pm25_obj)
                
                sensor_one_pm10 = row.pm10,
                pm10_measurement_quantity_kind = 'PM 10'
                sensor_one_pm10_obj = map_component_values_to_events_collection_format(sensor_one_pm10,sensor_one_pm10,weight, frequency,time, pm10_measurement_quantity_kind, measurement_unit )

                update_events_measurements(pms_sensor_one['component_name'],device_name, sensor_one_pm10_obj)
                #sensor two
                pms_sensor_two = pms5003_components[1]

                sensor_two_raw_value =  row.s2_pm2_5 
                sensor_two_value = row.s2_pm2_5
                sensor_two_calibrated_value = calibrate_pm25_values(sensor_two_raw_value)
                sensor_two_uncertainty_value = calibrate_pm25_values(sensor_two_raw_value) #to update and call function that gets uncertainity
                sensor_two_standard_deviation_value = calibrated_value(sensor_two_raw_value)
                
                sensor_two_pm25_obj = map_to_events_collection_format(sensor_two_value, sensor_two_raw_value, weight, frequency, sensor_two_calibrated_value,time, sensor_two_uncertainty_value,sensor_two_standard_deviation_value, measurement_quantity_kind, measurement_unit)
                
                update_events_measurements(pms_sensor_two['component_name'],device_name, sensor_two_pm25_obj)
                                  
                sensor_two_pm10 = row.s2_pm10,                
                sensor_two_pm10_obj = map_component_values_to_events_collection_format(sensor_two_pm10,sensor_two_pm10,weight, frequency,time, pm10_measurement_quantity_kind, measurement_unit )

                update_events_measurements(pms_sensor_two['component_name'],device_name, sensor_two_pm10_obj)

                if dht11_components:
                   
                    for component in dht11_components:
                        print('------dht11 components---') ##seems dht11 don't have humidity component
                        print(component)
                        if component['measurement']['quantityKind']=='External Temperature':
                            temperature_component = component
                            temperature_value = row.temperature,
                            temperature_measurement_quantity_kind = 'External Temperature'
                            temperature_measurement_unit = '°C'
                            temperature_sensor_obj = map_component_values_to_events_collection_format(temperature_value,temperature_value,weight, frequency,time, temperature_measurement_quantity_kind, temperature_measurement_unit )

                            update_events_measurements(temperature_component['component_name'],device_name, temperature_sensor_obj)

                        elif component['measurement']['quantityKind']=='External Humidity':
                            humidity_component = component                   
                            humidity_value = row.humidity,
                            humidity_measurement_quantity_kind = 'External Temperature'
                            humidity_measurement_unit = '%'
                            humidity_sensor_obj = map_component_values_to_events_collection_format(humidity_value,humidity_value,weight, frequency,time, humidity_measurement_quantity_kind, humidity_measurement_unit )

                            update_events_measurements(humidity_component['component_name'],device_name, humidity_sensor_obj)
                        else:
                            print('component' +  component['component_name']+ 'not inserted')

                
                if battery_voltage_component:
                    for component in battery_voltage_component:
                        print('------battery components---')
                        print(component)

                        if component['measurement']['quantityKind']== 'Battery Voltage':
                            battery_component = component
                            battery_value = row.voltage,
                            battery_measurement_quantity_kind = 'Battery Voltage'
                            battery_measurement_unit = 'V'
                            battery_sensor_obj = map_component_values_to_events_collection_format(battery_value,battery_value,weight, frequency,time, battery_measurement_quantity_kind, battery_measurement_unit )

                            update_events_measurements(battery_component['component_name'],device_name, battery_sensor_obj)

                        else:
                            print('component' +  component['component_name']+ 'not inserted')
                   
          
        
        

        
        ## call a function that does the mapping

        ## save values for each channel to db

    return 'operation migration finished.'

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

def map_component_values_to_events_collection_format(value, raw_value, weight, frequency, time, measurement_quantity_kind, measurement_unit):
    obj = {
                        "value":value, 
                        "raw": raw_value, 
                        "weight":weight,
                        "frequency": frequency,                        
                        "time": time,                        
                        "measurement": {
                            "quantityKind": measurement_quantity_kind,
                            "measurementUnit": measurement_unit
                        }           
                    }

    return obj



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


def update_events_measurements(component_name,device_name, value_object):
    """
     .
    """
    db = connect_mongo()
    results = list(db.events.find({"componentName":component_name} ))
    if len(results) > 0:
        for i in results:
            key = {'_id': i['_id']}                             
            db.events.update_one(
                key,
                { "$push": {"values": value_object }
                })   
    else:
        obj = {
            'componentName':component_name,
            'day': datetime.now(),
            'deviceName':device_name,
            'createdAt': datetime.now(),
            'first':datetime.now(), 
            'last':datetime.now(),
            'nValues':1,
            'updatedAt':datetime.now(),
            'values':[value_object]
        }
        db.events.insert_one(obj) 
        


if __name__ == "__main__":
    get_hourly_channel_data('jobs\Mar_sep11_2020.csv')
    '''
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
    '''


        



    
    