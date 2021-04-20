import pytest
import pymongo
import mongomock
from unittest.mock import patch 
from models.device import Device

@patch.object(pymongo.MongoClient, 'db_connection.connect_mongo', return_value=mongomock.MongoClient())
def test_get_devices():
    device= Device()
    pass

def test_get_device_power():
    device = Device()
    pass

def test_get_device_status():
    device = Device()
    pass

if __name__=='__main__':
    pass

