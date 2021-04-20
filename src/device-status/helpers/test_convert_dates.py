import pytest
from datetime import datetime
import sys
sys.path.append('./')
from helpers.convert_dates import str_to_date, date_to_str, convert_GMT_time_to_EAT_local_time, convert_to_date

def test_str_to_date():
    my_date = str_to_date('2020-10-23T00:30:58.000000Z')
    assert my_date == datetime(2020, 10, 23, 0, 30, 58)

def test_date_to_str():
    my_string = date_to_str(datetime(2020, 10, 23, 0, 30, 58))
    assert my_string == '2020-10-23T00:30:58.000000Z'

def test_convert_GMT_time():
    pass 

def test_convert_to_date():
    pass

if __name__=='__main__':
    my_date = str_to_date('2020-10-23T00:30:58.000000Z')
    print(my_date)
    my_new_date = datetime(2020, 10, 23, 0, 30, 58)
    print(my_new_date)
    my_super_date = date_to_str(my_new_date)
    print(my_super_date)

    #assert my_date == my_new_date