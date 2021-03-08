import os
import pandas as pd
import requests
from threading import Thread
import json
from device_registry import single_component_insertion
from helpers import date_to_str2
import numpy as np
from datetime import datetime, timedelta

CLARITY_API_KEY = os.getenv("CLARITY_API_KEY")
CLARITY_API_BASE_URL = os.getenv("CLARITY_API_BASE_URL")


def process_kcca_device_data():

    # get all kcca device measurements
    device_measurements_data = get_kcca_device_data()

    # print(device_measurements_data)

    # process all kcca device measurements
    process_kcca_data(device_measurements_data)


def get_kcca_device_data():

    """
    :return: current kcca device measurements
    """

    # get current date and time 5 minutes ago : %Y-%m-%dT%H:%M:%SZ
    # the cron job must be scheduled to run as the time interval stated here
    date = date_to_str2(datetime.now() - timedelta(hours=0, minutes=5))

    # get kcca devices
    device_codes = get_kcca_devices_codes()

    # compose a url to get device measurements for all the devices
    api_url = CLARITY_API_BASE_URL + "measurements?startTime=" + date + "&code="

    # api_url = CLARITY_API_BASE_URL + "measurements?code="

    for code in device_codes:
        api_url = api_url + code + ","

    api_url = api_url[:-1]


    # get the device measurements
    headers = {'x-api-key': CLARITY_API_KEY, 'Accept-Encoding': 'gzip'}
    results = requests.get(api_url, headers=headers)

    return results.json()


def get_kcca_devices_codes():
    """
    gets all kcca devices
    :return: list of device codes
    """
    headers = {'x-api-key': CLARITY_API_KEY, 'Accept-Encoding': 'gzip'}
    api_url = CLARITY_API_BASE_URL + "devices"
    results = requests.get(api_url, headers=headers)

    device_data = pd.DataFrame(results.json())

    device_codes = []

    for index, row in device_data.iterrows():
        device_codes.append(row['code'])

    return device_codes


def process_kcca_data(data):

    # create a dataframe to hold all the device measurements
    raw_data = pd.DataFrame(data)

    # divide the dataframe into chucks of ten
    chunks = np.array_split(raw_data, 10)

    threads = []

    # process each chuck on a separate thread
    for chunk in chunks:
        # print(chunk)
        thread = Thread(target=process_chunk, args=(chunk,))
        threads.append(thread)
        thread.start()

    # wait for all threads to terminate before ending the function
    for thread in threads:
        thread.join()


def process_chunk(chunk):

    # create a dataframe to hold the chunk
    data = pd.DataFrame(chunk)

    # create a to hold all threads
    threads = []

    # loop through the devices in the chunk
    for index, row in data.iterrows():

        # device_code = row["deviceCode"]
        # device_time = row["time"]
        location = row["location"]["coordinates"]

        data = dict({
            'frequency': "day",
            'time': row["time"],
            'device':  row["deviceCode"],
            'location': dict({
                "longitude": dict({"value":  location[0]}), "latitude": {"value": location[1]}})
        })

        # create a dataframe to hold the device components
        device_components = pd.Series(row["characteristics"])

        # loop through each component on the device
        for component_type in device_components.keys():

            CONVERSION_UNITS = dict({
                "temperature": "internalTemperature",
                "relHumid": "internalHumidity",
                "pm10ConcMass": "pm10",
                "pm2_5ConcMass": "pm2_5",
                "no2Conc": "no2",
                "pm1ConcMass": "pm1"

            })

            try:

                data[CONVERSION_UNITS[component_type]] = dict({
                    'value': device_components[component_type]["value"]
                })

            except Exception as ex:
                print(ex)
                continue

            if "calibratedValue" in device_components[component_type].keys():
                data[CONVERSION_UNITS[component_type]]['calibratedValue'] = device_components[component_type]["calibratedValue"]


        # post the component data to events table using a separate thread
        # :function: single_component_insertion(args=(component data, tenant))

        thread = Thread(target=single_component_insertion, args=(data, "kcca",))
        threads.append(thread)
        thread.start()

    # wait for all threads to terminate before ending the function
    for thread in threads:
        thread.join()


def get_kcca_devices():
    """
    gets all kcca devices
    :return: list of device codes
    """
    headers = {'x-api-key': CLARITY_API_KEY, 'Accept-Encoding': 'gzip'}
    api_url = CLARITY_API_BASE_URL + "devices"
    results = requests.get(api_url, headers=headers)

    device_data = pd.DataFrame(results.json())

    devices = []

    for index, row in device_data.iterrows():

        try:
            location = row['location']['coordinates']
            date = datetime.datetime.strptime(row['workingStartAt'], '%Y-%m-%dT%H:%M:%S.%fZ')
            # print(date)
            device = dict({
                "channelID": row['code'],
                "name": row['code'],
                "createdAt": row['workingStartAt'],
                "longitude": location[0],
                "latitude": location[1],
                "device_manufacturer": 'CLARITY',
                "isActive": True,
                "visibility": True,
                "owner": "KCCA",
                "description": "Particulate Matter and NO2 monitor",
                "product_name": "NODE - S"
            })

        except Exception as ex:
            print(ex)
            continue

        devices.append(device)

    return json.dumps(devices)


if __name__ == "__main__":
    process_kcca_device_data()
