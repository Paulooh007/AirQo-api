import pytest
frm datetime import datetime
import sys
sys.path.append('./')
from helpers.convert_dates import str_to_date, date_to_str, convert_GMT_time_to_EAT_local_time, convert_to_date

def test_str_to_date():
    pass

def test_date_to_str():
    pass

def test_convert_GMT_time():
    pass 

def test_convert_to_date():
    pass

if __name__=='__main__':
    my_date = str_to_date('2020-10-23T00:30:58.256Z')
    print(my_date)