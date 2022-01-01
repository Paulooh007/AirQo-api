import os
from pathlib import Path

import urllib3
from dotenv import load_dotenv

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

BASE_DIR = Path(__file__).resolve().parent
dotenv_path = os.path.join(BASE_DIR, '.env')
load_dotenv(dotenv_path)


class Config:
    CLARITY_API_KEY = os.getenv("CLARITY_API_KEY")
    CLARITY_API_BASE_URL = os.getenv("CLARITY_API_BASE_URL")

    TENANT = os.getenv("TENANT")
    POST_EVENTS_BODY_SIZE = os.getenv("POST_EVENTS_BODY_SIZE", 10)
    POST_WEATHER_BODY_SIZE = os.getenv("POST_EVENTS_BODY_SIZE", 10)

    TAHMO_BASE_URL = os.getenv("TAHMO_API_BASE_URL")
    TAHMO_API_MAX_PERIOD = os.getenv("TAHMO_API_MAX_PERIOD")
    TAHMO_API_KEY = os.getenv("TAHMO_API_CREDENTIALS_USERNAME")
    TAHMO_API_SECRET = os.getenv("TAHMO_API_CREDENTIALS_PASSWORD")

    BOOTSTRAP_SERVERS = os.getenv("BOOTSTRAP_SERVERS").split(",")
    SCHEMA_REGISTRY_URL = os.getenv("SCHEMA_REGISTRY_URL")
    WEATHER_MEASUREMENTS_TOPIC = os.getenv("WEATHER_MEASUREMENTS_TOPIC")

    def __init__(self):

        if self.TENANT.strip().lower() == "airqo":
            self.OUTPUT_TOPIC = os.getenv("AIRQO_OUTPUT_TOPIC")
        elif self.TENANT.strip().lower() == "kcca":
            self.OUTPUT_TOPIC = os.getenv("KCCA_OUTPUT_TOPIC")
        else:
            self.OUTPUT_TOPIC = os.getenv("OUTPUT_TOPIC")


class ProductionConfig(Config):
    AIRQO_BASE_URL = os.getenv("PROD_AIRQO_BASE_URL")
    AIRQO_API_KEY = os.getenv("PROD_AIRQO_API_KEY")


class StagingConfig(Config):
    AIRQO_BASE_URL = os.getenv("STAGE_AIRQO_BASE_URL")
    AIRQO_API_KEY = os.getenv("STAGE_AIRQO_API_KEY")


class DevelopmentConfig(Config):
    AIRQO_BASE_URL = "https://localhost:3000/api/v1/"
    AIRQO_API_KEY = ""


app_config = {
    "development": DevelopmentConfig(),
    "production": ProductionConfig(),
    "staging": StagingConfig()
}

environment = os.getenv("ENVIRONMENT")
print("ENVIRONMENT", environment or 'development', sep=" : ")

configuration = app_config.get(environment, DevelopmentConfig())
