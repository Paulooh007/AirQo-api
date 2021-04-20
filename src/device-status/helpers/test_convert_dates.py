import pytest
from datetime import datetime
import sys
sys.path.append('./')
from helpers.convert_dates import str_to_date, date_to_str, convert_GMT_time_to_EAT_local_time, convert_to_date

def test_str_to_date():
    my_date = str_to_date('2020-10-23T00:30:58.000000Z')
    assert my_date == datetime(2020, 10, 23, 0, 30, 58)

def test_str_on_empty_arg():
    with pytest.raises(TypeError):
        str_to_date()

def test_str_on_incorrect_arg():
    with pytest.raises(ValueError):
        str_to_date('Godzilla')

def test_str_on_wrong_arg_type():
     with pytest.raises(TypeError):
        str_to_date([1, 2, 3])

def test_str_on_too_many_args():
     with pytest.raises(TypeError):
        str_to_date('2020-10-23T00:30:58.000000Z', '2020-10-23T00:30:58.000000Z')

def test_date_to_str():
    my_string = date_to_str(datetime(2020, 10, 23, 0, 30, 58))
    assert my_string == '2020-10-23T00:30:58.000000Z'

def test_date_on_emp

def test_convert_GMT_time():
    eat_time = convert_GMT_time_to_EAT_local_time(datetime(2020, 10, 23, 0, 30, 58)) 
    assert eat_time == 'Fri, 23 Oct 2020 03:30 AM'

def test_convert_to_date():
    mydate = convert_to_date(datetime(2020, 10, 23))
    assert mydate == '2020-10-23'

if __name__=='__main__':
    str_to_date('2020-10-23T00:30:58.000000Z', '2020-10-23T00:30:58.000000Z')
