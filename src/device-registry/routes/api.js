const express = require("express");
const router = express.Router();
const deviceController = require("../controllers/create-device");
const siteController = require("../controllers/manage-site");
const middlewareConfig = require("../config/router.middleware");
const validate = require("express-validation");
const componentController = require("../controllers/create-component");
const eventController = require("../controllers/create-event");
const { upload, uploads } = require("../utils/create-photo");
const photoController = require("../controllers/create-photo");
const { checkTenancy } = require("../utils/validators/auth");
const { validateRequestQuery } = require("../utils/validators/requestQuery");
const { validateRequestBody } = require("../utils/validators/requestBody");

middlewareConfig(router);

/******************* create device ***************************/
router.get("/", deviceController.list);
router.post("/", deviceController.create);
router.delete("/", deviceController.delete);
router.put("/", deviceController.update);
router.post("/soft", deviceController.createOnPlatformOnly);
router.delete("/soft", deviceController.deleteOnPlatformOnly);
router.put("/soft", deviceController.updateOnPlatformOnly);
router.get(
  "/by/nearest-coordinates",
  deviceController.listAllByNearestCoordinates
);

/****************** manage site *************************/
router.post(
  "/ts/activity/recall",
  checkTenancy,
  validateRequestQuery(["deviceName"]),
  siteController.recallDevice
);
router.post(
  "/ts/activity/deploy",
  checkTenancy,
  validateRequestQuery(["deviceName"]),
  validateRequestBody(siteController.deploymentFields),
  siteController.deployDevice
);
router.post(
  "/ts/activity/maintain",
  checkTenancy,
  validateRequestQuery(["deviceName"]),
  validateRequestBody(siteController.maintenanceField),
  siteController.maintainDevice
);
router.get("/ts/activity", siteController.getActivities);
router.put("/ts/activity/update", siteController.updateActivity);
router.delete("/ts/activity/delete", siteController.deleteActivity);

/******************** create photos *********************/
router.delete("/photos", photoController.delete);
router.post(
  "/upload-images",
  upload.array("image"),
  photoController.uploadMany
);

/******************* create component **************************/
router.get("/components", componentController.list);
router.post("/components", componentController.create);
router.delete("/components", componentController.delete);
router.put("/components", componentController.update);

/******************* create event *******************************/
router.post("/events/add", eventController.createEvents);
router.get("/events", eventController.getEvents);
router.post("/events/transmit", eventController.transmitEvents);
router.delete("/events/clear", eventController.clearEvents);

module.exports = router;
