const { logObject, logElement, logText } = require("./log");

const distance = {
  findNearestDevices: (devices, radius, latitude, longitude) => {
    try {
      let nearest_devices = [];

      devices.forEach((device) => {
        if (
          "latitude" in device &&
          "longitude" in device &&
          device["isActive"] == true &&
          device["isPrimaryInLocation"] == true
        ) {
          distanceBetweenDevices = distance.calculateDistance(
            latitude,
            longitude,
            device["latitude"],
            device["longitude"]
          );

          if (distanceBetweenDevices < radius) {
            device["distance"] = distance;
            nearest_devices.push(device);
          }
        }
      });

      return nearest_devices;
    } catch (error) {
      logElement("error", error);
    }
  },

  calculateDistance: (latitude1, longitude1, latitude2, longitude2) => {
    // getting distance between latitudes and longitudes
    const latitudeDisatnce = distance.degreesToRadians(latitude2 - latitude1);
    const longitudeDisatnce = distance.degreesToRadians(
      longitude2 - longitude1
    );

    // converting degrees to radians
    latitude1 = distance.degreesToRadians(latitude1);
    latitude2 = distance.degreesToRadians(latitude2);

    // Applying Haversine formula
    const haversine =
      Math.pow(Math.sin(latitudeDisatnce / 2), 2) +
      Math.pow(Math.sin(longitudeDisatnce / 2), 2) *
        Math.cos(latitude1) *
        Math.cos(latitude2);

    // Earth's radius in kilometers
    const radius = 6371;

    const c = 2 * Math.asin(Math.sqrt(haversine));
    return radius * c;
  },

  distanceBtnTwoPoints: (latitude1, longitude1, latitude2, longitude2) => {
    try {
      // getting distance between latitudes and longitudes
      const latitudeDisatnce = distance.degreesToRadians(latitude2 - latitude1);
      const longitudeDisatnce = distance.degreesToRadians(
        longitude2 - longitude1
      );

      // converting degrees to radians
      latitude1 = distance.degreesToRadians(latitude1);
      latitude2 = distance.degreesToRadians(latitude2);

      // Applying Haversine formula
      const haversine =
        Math.pow(Math.sin(latitudeDisatnce / 2), 2) +
        Math.pow(Math.sin(longitudeDisatnce / 2), 2) *
          Math.cos(latitude1) *
          Math.cos(latitude2);

      // Earth's radius in kilometers
      const radius = 6371;

      const c = 2 * Math.asin(Math.sqrt(haversine));
      return radius * c;
    } catch (error) {
      logElement(
        "the error for distanceBtnTwoPoints in the distance util",
        error.message
      );
    }
  },
  degreesToRadians: (degrees) => {
    try {
      const pi = Math.PI;
      return degrees * (pi / 180);
    } catch (error) {
      logElement(
        "the error for degreesToRadians in the distance util",
        error.message
      );
    }
  },

  radiansToDegrees: (radians) => {
    try {
      {
        const pi = Math.PI;
        return radians * (180 / pi);
      }
    } catch (error) {
      logElement(
        "the error for radiansToDegrees in the distance util",
        error.message
      );
    }
  },

  generateRandomNumbers: ({ min = 0, max = 6.28319, places = 3 } = {}) => {
    if (Number.isInteger(min) && Number.isInteger(max)) {
      if (places !== undefined) {
        new Error("Cannot specify decimal places with integers.");
      }
      return Math.floor(Math.random() * (max - min + 1)) + min;
    } else {
      if (Number.isNaN(Number.parseFloat(min))) {
        new Error("Minimum value is not a number.");
      }

      if (Number.isNaN(Number.parseFloat(max))) {
        new Error("Maximum value is not a number.");
      }

      if (Number.isInteger(places) === false) {
        new Error("Number of decimal places is not a number.");
      }

      if (places <= 0) {
        new Error("Number of decimal places must be at least 1.");
      }
      let value = Math.random() * (max - min + 1) + min;
      return Number.parseFloat(value).toFixed(places);
    }
  },

  createApproximateCoordinates: ({
    latitude = 0,
    longitude = 0,
    approximate_distance_in_km = 0.5,
  } = {}) => {
    const radiusOfEarth = 6378.1;
    const bearingInRadians = distance.generateRandomNumbers();
    const latitudeInRadians = distance.degreesToRadians(latitude);
    const longitudeInRadians = distance.degreesToRadians(longitude);

    let approximateLatitudeInRadians = Math.asin(
      Math.sin(latitudeInRadians) *
        Math.cos(approximate_distance_in_km / radiusOfEarth) +
        Math.cos(latitudeInRadians) *
          Math.sin(approximate_distance_in_km / radiusOfEarth) *
          Math.cos(bearingInRadians)
    );

    let approximateLongitudeInRadians =
      longitudeInRadians +
      Math.atan2(
        Math.sin(bearingInRadians) *
          Math.sin(approximate_distance_in_km / radiusOfEarth) *
          Math.cos(latitudeInRadians),
        Math.cos(approximate_distance_in_km / radiusOfEarth) -
          Math.sin(latitudeInRadians) * Math.sin(approximateLatitudeInRadians)
      );

    return {
      approximate_latitude: distance.radiansToDegrees(
        approximateLatitudeInRadians
      ),
      approximate_longitude: distance.radiansToDegrees(
        approximateLongitudeInRadians
      ),
      approximate_distance_in_km,
      bearing_in_radians: parseFloat(bearingInRadians),
      provided_latitude: parseFloat(latitude),
      provided_longitude: parseFloat(longitude),
    };
  },
};

module.exports = distance;
