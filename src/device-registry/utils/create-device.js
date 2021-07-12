"use strict";
const HTTPStatus = require("http-status");
const DeviceSchema = require("../models/Device");
const EventSchema = require("../models/Event");
const { getModelByTenant } = require("./multitenancy");
const axios = require("axios");
const { logObject, logElement, logText } = require("./log");
const deleteChannel = require("./delete-channel");
var { transform } = require("node-json-transform");
const Cryptr = require("cryptr");
const constants = require("../config/constants");
const mongoose = require("mongoose");
const cryptr = new Cryptr(constants.KEY_ENCRYPTION_KEY);
const generateFilter = require("./generate-filter");
const { utillErrors } = require("./errors");
const jsonify = require("./jsonify");
const isEmpty = require("is-empty");
const log4js = require("log4js");
const logger = log4js.getLogger("create-device-util");
const qs = require("qs");
const { logger_v2 } = require("../utils/errors");

const registerDeviceUtil = {
  create: async (request) => {
    try {
      if (request.query.tenant !== "airqo") {
        return {
          success: false,
          message: "creation is not yet possible for this organisation",
        };
      }
      let responseFromCreateOnThingspeak = await registerDeviceUtil.createOnThingSpeak(
        request
      );

      logger.info(
        `responseFromCreateOnThingspeak -- ${JSON.stringify(
          responseFromCreateOnThingspeak
        )}`
      );

      let enrichmentDataForDeviceCreation = responseFromCreateOnThingspeak.data
        ? responseFromCreateOnThingspeak.data
        : {};
      logger.info(
        `enrichmentDataForDeviceCreation -- ${JSON.stringify(
          enrichmentDataForDeviceCreation
        )}`
      );

      if (!isEmpty(enrichmentDataForDeviceCreation)) {
        let modifiedRequest = request;
        modifiedRequest["body"] = {
          ...request.body,
          ...enrichmentDataForDeviceCreation,
        };

        let responseFromCreateDeviceOnPlatform = await registerDeviceUtil.createOnPlatform(
          modifiedRequest
        );

        if (responseFromCreateDeviceOnPlatform.success) {
          logger.info(
            `successfully create the device --  ${JSON.stringify(
              responseFromCreateDeviceOnPlatform.data
            )}`
          );
          return {
            success: true,
            message: responseFromCreateDeviceOnPlatform.message,
            data: responseFromCreateDeviceOnPlatform.data,
          };
        }

        if (!responseFromCreateDeviceOnPlatform.success) {
          let deleteRequest = {};
          deleteRequest["query"] = {};
          deleteRequest["query"]["device_number"] =
            enrichmentDataForDeviceCreation.device_number;
          logger.info(`deleteRequest -- ${JSON.stringify(deleteRequest)}`);
          let responseFromDeleteDeviceFromThingspeak = await registerDeviceUtil.deleteOnThingspeak(
            deleteRequest
          );

          logger.info(
            ` responseFromDeleteDeviceFromThingspeak -- ${JSON.stringify(
              responseFromDeleteDeviceFromThingspeak
            )}`
          );

          if (responseFromDeleteDeviceFromThingspeak.success) {
            let error = responseFromCreateDeviceOnPlatform.error
              ? responseFromCreateDeviceOnPlatform.error
              : "";
            logger.error(
              `creation operation failed -- successfully undid the successfull operations -- ${error}`
            );
            return {
              success: false,
              message:
                "creation operation failed -- successfully undid the successfull operations",
              error,
            };
          }

          if (!responseFromDeleteDeviceFromThingspeak.success) {
            let error = responseFromDeleteDeviceFromThingspeak.error
              ? responseFromDeleteDeviceFromThingspeak.error
              : "";
            logger.error(
              `creation operation failed -- also failed to undo the successfull operations --${error}`
            );
            return {
              success: false,
              message:
                "creation operation failed -- also failed to undo the successfull operations",
              error,
            };
          }
        }
      }

      if (isEmpty(enrichmentDataForDeviceCreation)) {
        let error = responseFromCreateOnThingspeak.error
          ? responseFromCreateOnThingspeak.error
          : "";
        logger.error(
          `unable to generate enrichment data for the device -- ${error}`
        );
        return {
          success: false,
          message: "unable to generate enrichment data for the device",
          error,
        };
      }
    } catch (error) {
      logger.error(`create -- ${error.message}`);
      return {
        success: false,
        message: "server error",
        error: error.message,
      };
    }
  },
  update: async (request) => {
    try {
      /***
       * get the current state of item on Thingspeak??
       * update on thingspeak
       * then update on platform
       * if update refuses on platform, then revert changes on thingspeak or just inform
       * if reverting is hard, then just log the operation accordingly
       * after everthing, just return appropriate response to requester
       */

      /**
       * for updating on ThingSpeak, we need the device_number
       */
      logger.info(`in the update util....`);
      const { device_number } = request.query;
      let modifiedRequest = request;
      if (isEmpty(device_number)) {
        logger.info(`the device_number is not present`);
        let responseFromListDevice = await registerDeviceUtil.list(request);
        logger.info(
          `responseFromListDevice -- ${JSON.stringify(responseFromListDevice)}`
        );
        let device_number = responseFromListDevice
          ? responseFromListDevice.data[0].device_number
          : null;
        logger.info(`device_number -- ${device_number}`);
        modifiedRequest["query"]["device_number"] = device_number;
      }
      logger.info(`the modifiedRequest -- ${modifiedRequest} `);
      logObject("the UNmodifiedRequest ", jsonify(request));
      let responseFromUpdateDeviceOnThingspeak = await registerDeviceUtil.updateOnThingspeak(
        modifiedRequest
      );
      logger.info(
        `responseFromUpdateDeviceOnThingspeak -- ${JSON.stringify(
          responseFromUpdateDeviceOnThingspeak
        )}`
      );
      if (responseFromUpdateDeviceOnThingspeak.success) {
        let responseFromUpdateDeviceOnPlatform = await registerDeviceUtil.updateOnPlatform(
          request
        );
        logger.info(
          `responseFromUpdateDeviceOnPlatform -- ${JSON.stringify(
            responseFromUpdateDeviceOnPlatform
          )}`
        );
        if (responseFromUpdateDeviceOnPlatform.success) {
          return {
            success: true,
            message: responseFromUpdateDeviceOnPlatform.message,
            data: responseFromUpdateDeviceOnPlatform.data,
          };
        }
        if (!responseFromUpdateDeviceOnPlatform.success) {
          let error = responseFromUpdateDeviceOnPlatform.error
            ? responseFromUpdateDeviceOnPlatform.error
            : "";
          return {
            success: false,
            message: responseFromUpdateDeviceOnPlatform.message,
            error,
          };
        }
      }

      if (!responseFromUpdateDeviceOnThingspeak.success) {
        let error = responseFromUpdateDeviceOnThingspeak.error
          ? responseFromUpdateDeviceOnThingspeak.error
          : "";
        return {
          success: false,
          message: responseFromUpdateDeviceOnThingspeak.message,
          error,
        };
      }
    } catch (e) {
      logger.error(`update -- ${e.message}`);
      return {
        success: false,
        message: "",
        error: e.message,
      };
    }
  },
  delete: async (request) => {
    try {
      /**
       * delete the device from thingspeak
       * if the device is not on thingspeak but is present on platform, then go ahead and just do soft delete
       * then delete it from the platform
       * if the operation fails on the platform, please inform user
       * After everything, just inform the user through a response
       *
       */
    } catch (e) {
      logger.error(`delete -- ${e.message}`);
      return {
        success: false,
        message: "server error --delete -- create-device util",
        error: e.message,
      };
    }
  },
  list: async (request) => {
    try {
      let { tenant } = request.query;
      const limit = parseInt(request.query.limit, 0);
      const skip = parseInt(request.query.skip, 0);
      let filter = {};
      let responseFromFilter = generateFilter.devices(request);
      logElement(
        "is responseFromFilter in util a success?",
        responseFromFilter.success
      );

      logObject("the filter", responseFromFilter.data);

      if (responseFromFilter.success == true) {
        logObject("the filter", responseFromFilter.data);
        filter = responseFromFilter.data;
      }

      if (responseFromFilter.success == false) {
        let error = responseFromFilter.error ? responseFromFilter.error : "";
        return {
          success: false,
          message: responseFromFilter.message,
          error,
        };
      }

      let responseFromListDevice = await getModelByTenant(
        tenant,
        "device",
        DeviceSchema
      ).list({
        filter,
        limit,
        skip,
      });

      logElement(
        "is responseFromListDevice in util a success",
        !responseFromListDevice.success
      );

      if (responseFromListDevice.success == false) {
        let error = responseFromListDevice.error
          ? responseFromListDevice.error
          : "";

        return {
          success: false,
          message: responseFromListDevice.message,
          error,
        };
      } else {
        let message = !isEmpty(responseFromListDevice)
          ? "successfully listed the device(s)"
          : "no device(s) data available for this request";
        return {
          success: true,
          message: message,
          data: responseFromListDevice,
        };
      }
    } catch (e) {
      logger.error(`error for list devices util -- ${e.message}`);
      return {
        success: false,
        message: "list devices util - server error",
        error: e.message,
      };
    }
  },
  clear: (request) => {
    return {
      success: false,
      message: "coming soon...",
    };
  },

  createOnClarity: (request) => {
    return {
      message: "coming soon",
      success: false,
    };
  },

  createOnPlatform: async (request) => {
    try {
      const { tenant } = request.query;
      const { body } = request;

      const responseFromRegisterDevice = await getModelByTenant(
        tenant,
        "device",
        DeviceSchema
      ).register(body);

      logger.info(
        `the responseFromRegisterDevice --${JSON.stringify(
          responseFromRegisterDevice
        )} `
      );

      if (responseFromRegisterDevice.success == true) {
        return {
          success: true,
          data: responseFromRegisterDevice.data,
          message: responseFromRegisterDevice.message,
        };
      }

      if (responseFromRegisterDevice.success == false) {
        let error = responseFromRegisterDevice.error
          ? responseFromRegisterDevice.error
          : "";

        return {
          success: false,
          message: responseFromRegisterDevice.message,
          error,
        };
      }
    } catch (error) {
      logger.error("server error - createOnPlatform util");
      utillErrors.tryCatchErrors(error, "server error - createOnPlatform util");
    }
  },

  createOnThingSpeak: async (request) => {
    try {
      const baseURL = constants.CREATE_THING_URL;
      const { body } = request;
      const data = body;
      const map = constants.DEVICE_THINGSPEAK_MAPPINGS;
      const context = constants.THINGSPEAK_FIELD_DESCRIPTIONS;
      logger.info(`the context -- ${JSON.stringify(context)}`);
      const responseFromTransformRequestBody = await registerDeviceUtil.transform(
        {
          data,
          map,
          context,
        }
      );
      logger.info(
        `responseFromTransformRequestBody -- ${JSON.stringify(
          responseFromTransformRequestBody
        )}`
      );
      let transformedBody = responseFromTransformRequestBody.success
        ? responseFromTransformRequestBody.data
        : {};

      if (isEmpty(transformedBody)) {
        return {
          success: false,
          message: responseFromTransformRequestBody.message,
        };
      }
      // return await
      const response = await axios.post(baseURL, transformedBody);

      if (isEmpty(response)) {
        return {
          success: false,
          message: "unable to create the device on thingspeak",
        };
      }

      let writeKey = response.data.api_keys[0].write_flag
        ? response.data.api_keys[0].api_key
        : "";
      let readKey = !response.data.api_keys[1].write_flag
        ? response.data.api_keys[1].api_key
        : "";

      let newChannel = {
        device_number: `${response.data.id}`,
        writeKey: writeKey,
        readKey: readKey,
      };

      return {
        success: true,
        message: "successfully created the device on thingspeak",
        data: newChannel,
      };
    } catch (error) {
      logger.error(` createOnThingSpeak -- ${error.message}`);
      utillErrors.tryCatchErrors(
        error,
        "server error - createOnThingSpeak util"
      );
    }
  },

  updateOnThingspeak: async (request) => {
    try {
      logger.info(
        `  updateOnThingspeak's request -- ${JSON.stringify(request)}`
      );
      const { device_number } = request.query;
      const { body } = request;
      const config = {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      };
      const data = body;
      const map = constants.DEVICE_THINGSPEAK_MAPPINGS;
      const context = constants.THINGSPEAK_FIELD_DESCRIPTIONS;
      logger.info(`the context -- ${JSON.stringify(context)}`);
      const responseFromTransformRequestBody = await registerDeviceUtil.transform(
        {
          data,
          map,
        }
      );
      logger.info(
        `responseFromTransformRequestBody -- ${JSON.stringify(
          responseFromTransformRequestBody
        )}`
      );
      let transformedBody = responseFromTransformRequestBody.success
        ? responseFromTransformRequestBody.data
        : {};

      logger.info(`transformedBody -- ${JSON.stringify(transformedBody)}`);
      if (isEmpty(transformedBody)) {
        return {
          success: false,
          message: responseFromTransformRequestBody.message,
        };
      }
      const response = await axios.put(
        constants.UPDATE_THING(device_number),
        qs.stringify(transformedBody),
        config
      );
      if (isEmpty(response)) {
        return {
          success: false,
          message: "unable to update the device_number on thingspeak",
        };
      }
      logger.info(`successfully updated the device on thingspeak`);
      return {
        success: true,
        message: "successfully updated the device on thingspeak",
        data: response.data,
      };
    } catch (error) {
      logger.error(`updateOnThingspeak util -- ${error.message}`);
      utillErrors.tryCatchErrors(
        error,
        "server error - updateOnThingspeak util"
      );
    }
  },
  updateOnClarity: (request) => {
    return {
      success: false,
      message: "coming soon...",
      error: "not yet integrated with the clarity system",
    };
  },
  updateOnPlatform: async (request) => {
    try {
      const { id, device_number, name, tenant } = request.query;
      const { body } = request;
      logObject("The request", request);
      let update = body;
      let filter = {};
      let responseFromFilter = generateFilter.devices(request);
      logElement(
        "is responseFromFilter in util a success?",
        responseFromFilter.success
      );
      logger.info(`the filter ${JSON.stringify(responseFromFilter.data)}`);
      if (responseFromFilter.success == true) {
        logObject("the filter", responseFromFilter.data);
        filter = responseFromFilter.data;
      }

      if (responseFromFilter.success == false) {
        let error = responseFromFilter.error ? responseFromFilter.error : "";
        logger.error(
          `responseFromFilter.error in create-device util--${responseFromFilter.error}`
        );
        return {
          success: false,
          message: responseFromFilter.message,
          error,
        };
      }
      let responseFromModifyDevice = await getModelByTenant(
        tenant,
        "device",
        DeviceSchema
      ).modify({ filter, update });

      if (responseFromModifyDevice.success == true) {
        return {
          success: true,
          message: responseFromModifyDevice.message,
          data: responseFromModifyDevice.data,
        };
      }

      if (responseFromModifyDevice.success == false) {
        let error = responseFromModifyDevice.error
          ? responseFromModifyDevice.error
          : "";
        return {
          success: false,
          message: responseFromModifyDevice.message,
          error,
        };
      }
    } catch (error) {
      logger.error(`updateOnPlatform util -- ${error.message}`);
      utillErrors.tryCatchErrors(error, "server error - updateOnPlatform util");
    }
  },
  deleteOnThingspeak: async (request) => {
    try {
      let device_number = parseInt(request.query.device_number, 10);
      logger.info(`the device_number -- ${device_number}`);
      let response = await axios.delete(
        constants.DELETE_THING_URL(device_number)
      );
      if (isEmpty(response)) {
        return {
          success: false,
          message: "unable to remove device_number",
        };
      }
      logger.info(
        `successfully deleted the device on thingspeak -- ${response.data}`
      );
      return {
        success: true,
        message: "successfully deleted the device on thingspeak",
        data: response.data,
      };
    } catch (error) {
      logger.error(`deleteOnThingspeak -- ${error.message}`);
      utillErrors.tryCatchErrors(error, "server error - updateOnPlatform util");
    }
  },
  deleteOnPlatform: async (request) => {
    try {
      const { tenant } = request.query;
      logger.info(
        `the requesting coming into deleteOnPlatform util --${request}`
      );
      let filter = {};
      let responseFromFilter = generateFilter.devices(request);
      if (responseFromFilter.success == true) {
        logger.info(`the filter ${JSON.stringify(responseFromFilter.data)}`);
        filter = responseFromFilter.data;
      }

      if (responseFromFilter.success == false) {
        let error = responseFromFilter.error ? responseFromFilter.error : "";
        logger.error(
          `responseFromFilter.error in create-device util--${responseFromFilter.error}`
        );
        return {
          success: false,
          message: responseFromFilter.message,
          error,
        };
      }
      let responseFromRemoveDevice = await getModelByTenant(
        tenant,
        "device",
        DeviceSchema
      ).remove({ filter });

      logger.info(
        `responseFromRemoveDevice --- ${JSON.stringify(
          responseFromRemoveDevice
        )}`
      );
      if (responseFromRemoveDevice.success == true) {
        return {
          success: true,
          message: responseFromRemoveDevice.message,
          data: responseFromRemoveDevice.data,
        };
      }

      if (responseFromRemoveDevice.success == false) {
        let error = responseFromRemoveDevice.error
          ? responseFromRemoveDevice.error
          : "";
        return {
          success: false,
          message: responseFromRemoveDevice.message,
          error,
        };
      }
    } catch (error) {
      logger.error(`updateOnPlatform util -- ${error.message}`);
      utillErrors.badRequest("updateOnPlatform util", error.message);
    }
  },
  deleteOnclarity: (request) => {
    return {
      success: false,
      message: "coming soon",
      error: "not yet integrated with the clarity system",
    };
  },

  decryptKey: (encryptedKey) => {
    try {
      let decryptedKey = cryptr.decrypt(encryptedKey);
      if (decryptedKey) {
        return {
          success: true,
          message: "successfully decrypted the key",
          data: decryptedKey,
        };
      }
      return {
        success: false,
        message: "unable to retrieve the decrypted key",
      };
    } catch (error) {
      return {
        success: false,
        message: "unable to decrypt the key",
        error: error.message,
      };
    }
  },
  transform: ({ data = {}, map = {}, context = {} } = {}) => {
    try {
      const result = transform(data, map, context);
      if (!isEmpty(result)) {
        return {
          success: true,
          message: "successfully transformed the json request",
          data: result,
        };
      } else {
        logger.warn(
          `the request body for the external system is empty after transformation`
        );
        return {
          success: true,
          message:
            "the request body for the external system is empty after transformation",
          data: result,
        };
      }
    } catch (error) {
      logger.error(`transform -- ${error.message}`);
      return {
        success: false,
        message: "server error - trasform util",
        error: error.message,
      };
    }
  },
};

const preOperation = {
  transform_v0: (req, res) => {
    let {
      name,
      latitude,
      longitude,
      description,
      public_flag,
      readKey,
      writeKey,
      mobility,
      height,
      mountType,
      visibility,
      ISP,
      phoneNumber,
      device_manufacturer,
      product_name,
      powerType,
      locationID,
      host,
      isPrimaryInLocation,
      isUsedForCollocation,
      nextMaintenance,
      channelID,
      isActive,
      tags,
      elevation,
      pictures,
      siteName,
      locationName,
      photos,
    } = req.body;

    let deviceBody = {
      ...(!isEmpty(name) && { name: name }),
      ...(!isEmpty(readKey) && { readKey: readKey }),
      ...(!isEmpty(writeKey) && { writeKey: writeKey }),
      ...(!isEmpty(host) && { host: host }),
      ...(!isEmpty(isActive) && { isActive: isActive }),
      ...(!isEmpty(latitude) && { latitude: latitude }),
      ...(!isEmpty(longitude) && { longitude: longitude }),
      ...(!isEmpty(description) && { description: description }),
      ...(!isEmpty(visibility) && { visibility: visibility }),
      ...(!isEmpty(product_name) && { product_name: product_name }),
      ...(!isEmpty(powerType) && { powerType: powerType }),
      ...(!isEmpty(mountType) && { mountType: mountType }),
      ...(!isEmpty(device_manufacturer) && {
        device_manufacturer: device_manufacturer,
      }),
      ...(!isEmpty(phoneNumber) && { phoneNumber: phoneNumber }),
      ...(!isEmpty(channelID) && { channelID: channelID }),
      ...(!isEmpty(isPrimaryInLocation) && {
        isPrimaryInLocation: isPrimaryInLocation,
      }),
      ...(!isEmpty(isUsedForCollocation) && {
        isUsedForCollocation: isUsedForCollocation,
      }),
      ...(!isEmpty(ISP) && { ISP: ISP }),
      ...(!isEmpty(height) && { height: height }),
      ...(!isEmpty(mobility) && { mobility: mobility }),
      ...(!isEmpty(locationID) && { locationID: locationID }),
      ...(!isEmpty(nextMaintenance) && { nextMaintenance: nextMaintenance }),
      ...(!isEmpty(siteName) && { siteName }),
      ...(!isEmpty(locationName) && { locationName }),
      ...(!isEmpty(pictures) && { $addToSet: { pictures: pictures } }),
    };

    if (photos) {
      delete deviceBody.pictures;
      deviceBody = {
        ...deviceBody,
        ...(!isEmpty(photos) && {
          $pullAll: { pictures: photos },
        }),
      };
    }

    let options = {
      new: true,
      upsert: true,
    };

    let tsBody = {
      ...(!isEmpty(name) && { name: name }),
      ...(!isEmpty(elevation) && { elevation: elevation }),
      ...(!isEmpty(tags) && { tags: tags }),
      ...(!isEmpty(latitude) && { latitude: latitude }),
      ...(!isEmpty(longitude) && { longitude: longitude }),
      ...(!isEmpty(description) && { description: description }),
      ...(!isEmpty(visibility) && { public_flag: visibility }),
    };

    return { deviceBody, tsBody, options };
  },

  deviceMappings: {
    thingspeak: {
      name: "name",
      elevation: "elevation",
      tags: "tags",
      latitude: "latitude",
      longitude: "longitude",
      description: "description",
      public_flag: "visibility",
    },
    platform: {
      pictures: { $pullAll: { pictures: "remove_pictures" } },
      pictures: { $addToSet: { pictures: "add_pictures" } },
    },
    clarity: {},
  },
};

/**********************************older code **************************** */
const createOnThingSpeak = async (
  req,
  res,
  baseUrl,
  prepBodyTS,
  channel,
  device,
  deviceBody,
  tenant
) => {
  await axios
    .post(baseUrl, prepBodyTS)
    .then(async (response) => {
      channel = response.data.id;
      logText("device successfully created on TS.");
      let writeKey = response.data.api_keys[0].write_flag
        ? response.data.api_keys[0].api_key
        : "";
      let readKey = !response.data.api_keys[1].write_flag
        ? response.data.api_keys[1].api_key
        : "";
      let prepBodyDeviceModel = {
        ...deviceBody,
        channelID: `${response.data.id}`,
        writeKey: writeKey,
        readKey: readKey,
      };
      logText("adding the device to the platform...");
      await createDevice(tenant, prepBodyDeviceModel, req, res);
    })
    .catch(async (e) => {
      logElement(
        "unable to create device on the platform, attempting to delete it from TS",
        e.message
      );
      let error = e.message;
      await deleteChannel(channel, device, error, req, res);
    });
};

const createOnClarity = (tenant, req, res) => {
  return res.status(HTTPStatus.TEMPORARY_REDIRECT).json({
    message: `temporary redirect, device creation for this organisation (${tenant}) not yet enabled/integrated`,
    success: false,
  });
};

const createDevice = async (tenant, prepBodyDeviceModel, req, res) => {
  const device = await getModelByTenant(
    tenant,
    "device",
    DeviceSchema
  ).createDevice(prepBodyDeviceModel);
  logElement("DB addition response", device);
  return res.status(HTTPStatus.CREATED).json({
    success: true,
    message: "successfully created the device",
    device,
  });
};

module.exports = {
  createDevice,
  createOnThingSpeak,
  createOnClarity,
  registerDeviceUtil,
};
