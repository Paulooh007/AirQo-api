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
    eat_time = convert_GMT_time_to_EAT_local_time(datetime(2020, 10, 23, 0, 30, 58)) 
    assert eat_time == 'Fri, 23 Oct 2020 03:30 AM'

def test_convert_to_date():
    pass

if __name__=='__main__':
    gmt_datetime = datetime(2020, 10, 23, 0, 30, 58)
    eat_datetime = convert_GMT_time_to_EAT_local_time(gmt_datetime)
    print(eat_datetime)
    print(type(eat_datetime))