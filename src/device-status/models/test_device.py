import pytest
import sys
sys.path.append('./')
#import pymongo
import mongomock
from unittest.mock import patch 
from models.device import Device
import enum

objects = [
        {'name': 'test_1','channelID': 123,'locationID': 'loc_1','status': 'Active','power': 'Mains','isActive': True,'nextMaintenance': 'June'},
        {'name': 'test_1','channelID': 456,'locationID': 'loc_2','status': 'Active','power': 'Mains','isActive': True,'nextMaintenance': 'July'}
    ]

#def mock_connection():
#    client = mongomock.MongoClient()
#    db = client['db']
#    return db
    #devices = db.collection
    #devices.insert_many(objects)
    #count = devices.count_documents({})
    #print(count)
    #print(db.getCollectionNames())
    #documents = list(devices.find())
    #print(documents)


#@patch.object(Device.get_devices, 'db', return_value=mongomock.MongoClient())
@patch('pymongo.MongoClient')
def test_get_devices(mock_client):
    #with patch('pymongo.MongoClient', mongomock.MongoClient()):
    #mock_client.return_value = mongomock.MongoClient()
    mock_client.return_value= MockMongo()
    devices = mongomock.MongoClient().db.collection
    devices.insert_many(objects)
    device = Device()
    documents = device.get_devices('airqo')
    assert True
        #device = Device()
        #devices = mongomock.MongoClient().db.collection
        #devices.insert(objects)
        #documents = device.get_devices('airqo')
        #print(list(documents))
        #assert True


@patch('pymongo.MongoClient')
def test_get_device_power(mock_client):
    mock_client.return_value = mongomock.MongoClient()
    #mock_connect.return_value = mock_connection()
    devices = mongomock.MongoClient().db.collection
    #print(type(devices))
    devices.insert_many(objects)
    #count = devices.count()
    #print(count)
    device = Device()
    documents = device.get_device_power('airqo')
    assert True
    #print(list(documents))

@patch('pymongo.MongoClient')
def test_get_device_status(mock_client):
    mock_client.return_value = mongomock.MongoClient()
    device = Device()
    documents = device.get_device_status('airqo')
    assert True

if __name__=='__main__':
    #test_get_devices()
    test_get_device_power()
    #mock_connect()
    

