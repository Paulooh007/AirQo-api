const express = require("express");
const router = express.Router();
const joinController = require("../controllers/join");
const requestController = require("../controllers/request");
const inquiryController = require("../controllers/inquire");
const defaultsController = require("../controllers/defaults");
const organizationController = require("../controllers/create-organization");
const { check, oneOf, query, body, param } = require("express-validator");
const joinUtil = require("../utils/join");

const {
  setJWTAuth,
  authJWT,
  setLocalAuth,
  authLocal,
} = require("../services/auth");
const privileges = require("../utils/privileges");

const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;

const headers = (req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
  next();
};
router.use(headers);

//************************* users ***************************************************
router.post(
  "/loginUser",
  oneOf([
    query("tenant")
      .if(query("tenant").exists())
      .notEmpty()
      .withMessage("tenant cannot be empty if provided")
      .bail()
      .trim()
      .toLowerCase()
      .isIn(["kcca", "airqo"])
      .withMessage("the tenant value is not among the expected ones"),
  ]),
  oneOf([
    [
      body("userName").exists().withMessage("the userName must be provided"),
      body("password").exists().withMessage("the password must be provided"),
    ],
  ]),
  setLocalAuth,
  authLocal,
  joinController.login
);

router.post(
  "/emailLogin",
  oneOf([
    [
      body("email")
        .exists()
        .withMessage("the email must be provided")
        .bail()
        .isEmail()
        .withMessage("this is not a valid email address"),
    ],
  ]),
  joinController.loginInViaEmail
);

router.post(
  "/emailAuth",
  oneOf([
    [
      body("email")
        .exists()
        .withMessage("the email must be provided")
        .bail()
        .isEmail()
        .withMessage("this is not a valid email address"),
    ],
  ]),
  joinController.emailAuth
);

router.post("/verify", setJWTAuth, authJWT, joinController.verify);
router.get(
  "/",
  oneOf([
    query("tenant")
      .exists()
      .withMessage("tenant should be provided")
      .bail()
      .trim()
      .toLowerCase()
      .isIn(["kcca", "airqo"])
      .withMessage("the tenant value is not among the expected ones"),
  ]),
  setJWTAuth,
  authJWT,
  joinController.list
);
router.post(
  "/registerUser",
  oneOf([
    query("tenant")
      .exists()
      .withMessage("tenant should be provided")
      .bail()
      .trim()
      .toLowerCase()
      .isIn(["kcca", "airqo"])
      .withMessage("the tenant value is not among the expected ones"),
  ]),
  joinController.register
);
router.get(
  "/email/confirm/",
  oneOf([
    query("tenant")
      .exists()
      .withMessage("tenant should be provided")
      .bail()
      .trim()
      .toLowerCase()
      .isIn(["kcca", "airqo"])
      .withMessage("the tenant value is not among the expected ones"),
  ]),
  setJWTAuth,
  authJWT,
  joinController.confirmEmail
);
router.put(
  "/updatePasswordViaEmail",
  setJWTAuth,
  joinController.updateForgottenPassword
);
router.put(
  "/updatePassword",
  oneOf([
    query("tenant")
      .exists()
      .withMessage("tenant should be provided")
      .bail()
      .trim()
      .toLowerCase()
      .isIn(["kcca", "airqo"])
      .withMessage("the tenant value is not among the expected ones"),
  ]),
  setJWTAuth,
  authJWT,
  joinController.updateKnownPassword
);
router.post(
  "/forgotPassword",
  oneOf([
    query("tenant")
      .exists()
      .withMessage("tenant should be provided")
      .bail()
      .trim()
      .toLowerCase()
      .isIn(["kcca", "airqo"])
      .withMessage("the tenant value is not among the expected ones"),
  ]),
  joinController.forgot
);
router.put(
  "/",
  oneOf([
    query("tenant")
      .exists()
      .withMessage("tenant should be provided")
      .bail()
      .trim()
      .toLowerCase()
      .isIn(["kcca", "airqo"])
      .withMessage("the tenant value is not among the expected ones"),
  ]),
  setJWTAuth,
  authJWT,
  joinController.update
);
router.delete(
  "/",
  oneOf([
    query("tenant")
      .exists()
      .withMessage("tenant should be provided")
      .bail()
      .trim()
      .toLowerCase()
      .isIn(["kcca", "airqo"])
      .withMessage("the tenant value is not among the expected ones"),
  ]),
  setJWTAuth,
  authJWT,
  joinController.delete
);

router.post(
  "/newsletter/subscribe",
  oneOf([
    query("tenant")
      .if(query("tenant").exists())
      .notEmpty()
      .withMessage("tenant cannot be empty if provided")
      .bail()
      .trim()
      .toLowerCase()
      .isIn(["kcca", "airqo"])
      .withMessage("the tenant value is not among the expected ones"),
  ]),
  oneOf([
    [
      body("email")
        .exists()
        .withMessage("the email must be provided")
        .bail()
        .isEmail()
        .withMessage("this is not a valid email address")
        .trim(),
      body("tags")
        .optional()
        .notEmpty()
        .withMessage("the tags should not be empty if provided")
        .bail()
        .custom((value) => {
          return Array.isArray(value);
        })
        .withMessage("the tags should be an array"),
    ],
  ]),
  joinController.subscribeToNewsLetter
);

/************************* settings/defaults **********************************/
router.put(
  "/defaults",
  oneOf([
    query("tenant")
      .exists()
      .withMessage("tenant should be provided")
      .bail()
      .trim()
      .toLowerCase()
      .isIn(["kcca", "airqo"])
      .withMessage("the tenant value is not among the expected ones"),
  ]),
  oneOf([
    query("id")
      .exists()
      .withMessage(
        "the record's identifier is missing in request, consider using the id"
      )
      .bail()
      .trim()
      .isMongoId()
      .withMessage("id must be an object ID")
      .bail()
      .customSanitizer((value) => {
        return ObjectId(value);
      }),
  ]),
  oneOf([
    [
      body("pollutant")
        .if(body("pollutant").exists())
        .notEmpty()
        .trim()
        .isIn(["no2", "pm2_5", "pm10", "pm1"])
        .withMessage(
          "the pollutant value is not among the expected ones which include: no2, pm2_5, pm10, pm1"
        ),
      body("frequency")
        .if(body("frequency").exists())
        .notEmpty()
        .trim()
        .toLowerCase()
        .isIn(["daily", "hourly", "monthly", "diurnal"])
        .withMessage(
          "the frequency value is not among the expected ones which include: daily, hourly, diurnal and monthly"
        ),
      body("chartType")
        .if(body("chartType").exists())
        .notEmpty()
        .trim()
        .toLowerCase()
        .isIn(["bar", "line", "pie"])
        .withMessage(
          "the chartType value is not among the expected ones which include: bar, line and pie"
        ),
      body("startDate")
        .if(body("startDate").exists())
        .notEmpty()
        .trim()
        .toDate()
        .isISO8601({ strict: true, strictSeparator: true })
        .withMessage("startDate must be a valid datetime."),
      body("endDate")
        .if(body("endDate").exists())
        .notEmpty()
        .trim()
        .toDate()
        .isISO8601({ strict: true, strictSeparator: true })
        .withMessage("endDate must be a valid datetime."),
      body("user")
        .if(body("user").exists())
        .notEmpty()
        .trim()
        .isMongoId()
        .withMessage("the user must be an object ID")
        .bail()
        .customSanitizer((value) => {
          return ObjectId(value);
        }),
      body("airqloud")
        .if(body("airqloud").exists())
        .notEmpty()
        .trim()
        .isMongoId()
        .withMessage("the airqloud must be an object ID")
        .bail()
        .customSanitizer((value) => {
          return ObjectId(value);
        }),
      body("chartTitle").if(body("chartTitle").exists()).notEmpty().trim(),
      body("period")
        .if(body("period").exists())
        .notEmpty()
        .withMessage("period cannot be empty if provided")
        .bail()
        .custom((value) => {
          return typeof value === "object";
        })
        .withMessage("the period should be an object"),
      body("period.unitValue")
        .if(body("period.unitValue").exists())
        .notEmpty()
        .withMessage("period.unitValue cannot be empty if provided")
        .trim()
        .bail()
        .isFloat()
        .withMessage("period.unitValue must be a number"),
      body("chartSubTitle")
        .if(body("chartSubTitle").exists())
        .notEmpty()
        .trim(),
      body("chartTitle").if(body("chartTitle").exists()).notEmpty().trim(),
      body("sites")
        .if(body("sites").exists())
        .notEmpty()
        .custom((value) => {
          return Array.isArray(value);
        })
        .withMessage("the sites should be an array"),
      body("sites.*")
        .if(body("sites.*").exists())
        .notEmpty()
        .trim()
        .isMongoId()
        .withMessage("site must be an object ID"),
    ],
  ]),
  setJWTAuth,
  authJWT,
  defaultsController.update
);

router.post(
  "/defaults",
  oneOf([
    query("tenant")
      .exists()
      .withMessage("tenant should be provided")
      .bail()
      .trim()
      .toLowerCase()
      .isIn(["kcca", "airqo"])
      .withMessage("the tenant value is not among the expected ones"),
  ]),
  oneOf([
    [
      body("pollutant")
        .exists()
        .withMessage("pollutant is missing in your request")
        .bail()
        .trim()
        .isIn(["no2", "pm2_5", "pm10", "pm1"])
        .withMessage(
          "the pollutant value is not among the expected ones which include: no2, pm2_5, pm10, pm1"
        ),
      body("frequency")
        .exists()
        .withMessage("frequency is missing in your request")
        .bail()
        .trim()
        .toLowerCase()
        .isIn(["daily", "hourly", "monthly", "diurnal"])
        .withMessage(
          "the frequency value is not among the expected ones which include: daily, hourly, diurnal and monthly"
        ),
      body("chartType")
        .exists()
        .withMessage("chartType is missing in your request")
        .bail()
        .trim()
        .toLowerCase()
        .isIn(["bar", "line", "pie"])
        .withMessage(
          "the chartType value is not among the expected ones which include: bar, line and pie"
        ),
      body("startDate")
        .exists()
        .withMessage("startDate is missing in your request")
        .bail()
        .trim()
        .toDate()
        .isISO8601({ strict: true, strictSeparator: true })
        .withMessage("startDate must be a valid datetime."),
      body("endDate")
        .exists()
        .withMessage("endDate is missing in your request")
        .bail()
        .trim()
        .toDate()
        .isISO8601({ strict: true, strictSeparator: true })
        .withMessage("endDate must be a valid datetime."),
      body("user")
        .exists()
        .withMessage("user is missing in your request")
        .bail()
        .trim()
        .isMongoId()
        .withMessage("the user must be an object ID")
        .bail()
        .customSanitizer((value) => {
          return ObjectId(value);
        }),
      body("airqloud")
        .exists()
        .withMessage("airqloud is missing in your request")
        .bail()
        .trim()
        .isMongoId()
        .withMessage("the airqloud must be an object ID")
        .bail()
        .customSanitizer((value) => {
          return ObjectId(value);
        }),
      body("chartTitle")
        .exists()
        .withMessage("chartTitle is missing in your request")
        .bail()
        .trim(),
      body("period")
        .exists()
        .withMessage("period is missing in your request")
        .bail()
        .custom((value) => {
          return typeof value === "object";
        })
        .bail()
        .withMessage("the period should be an object"),
      body("period.unit")
        .exists()
        .withMessage("period.unit is missing in your request"),
      body("period.unitValue")
        .exists()
        .withMessage("period.unitValue is missing in your request")
        .bail()
        .isFloat()
        .withMessage("period.unitValue must be a number"),
      body("period.label")
        .exists()
        .withMessage("period.label is missing in your request"),
      body("period.value")
        .exists()
        .withMessage("period.value is missing in your request"),
      body("chartSubTitle")
        .exists()
        .withMessage("chartSubTitle is missing in your request")
        .bail()
        .trim(),
      body("sites")
        .exists()
        .withMessage("sites is missing in your request")
        .bail()
        .custom((value) => {
          return Array.isArray(value);
        })
        .withMessage("the sites should be an array"),
      body("sites.*")
        .exists()
        .withMessage("No Sites included in your request")
        .bail()
        .trim()
        .isMongoId()
        .withMessage("site must be an object ID"),
    ],
  ]),
  setJWTAuth,
  authJWT,
  defaultsController.create
);

router.get(
  "/defaults",
  oneOf([
    query("tenant")
      .exists()
      .withMessage("tenant should be provided")
      .bail()
      .trim()
      .toLowerCase()
      .isIn(["kcca", "airqo"])
      .withMessage("the tenant value is not among the expected ones"),
  ]),
  oneOf([
    [
      query("id")
        .if(query("id").exists())
        .notEmpty()
        .trim()
        .isMongoId()
        .withMessage("id must be an object ID")
        .bail()
        .customSanitizer((value) => {
          return ObjectId(value);
        }),
      query("user")
        .if(query("user").exists())
        .notEmpty()
        .trim()
        .isMongoId()
        .withMessage("user must be an object ID")
        .bail()
        .customSanitizer((value) => {
          return ObjectId(value);
        }),
      query("airqloud")
        .if(query("airqloud").exists())
        .notEmpty()
        .trim()
        .isMongoId()
        .withMessage("the airqloud must be an object ID")
        .bail()
        .customSanitizer((value) => {
          return ObjectId(value);
        }),
      query("site")
        .if(query("site").exists())
        .notEmpty()
        .trim()
        .isMongoId()
        .withMessage("the site must be an object ID")
        .bail()
        .customSanitizer((value) => {
          return ObjectId(value);
        }),
    ],
  ]),
  setJWTAuth,
  authJWT,
  defaultsController.list
);

router.delete(
  "/defaults",
  oneOf([
    query("tenant")
      .exists()
      .withMessage("tenant should be provided")
      .bail()
      .trim()
      .toLowerCase()
      .isIn(["kcca", "airqo"])
      .withMessage("the tenant value is not among the expected ones"),
  ]),
  oneOf([
    query("id")
      .exists()
      .withMessage(
        "the defaults identifier is missing in request, consider using the id"
      )
      .bail()
      .trim()
      .isMongoId()
      .withMessage("id must be an object ID")
      .bail()
      .customSanitizer((value) => {
        return ObjectId(value);
      }),
  ]),
  setJWTAuth,
  authJWT,
  defaultsController.delete
);

//************************ candidates ***********************************************
router.post(
  "/candidates/register",
  oneOf([
    query("tenant")
      .exists()
      .withMessage("tenant should be provided")
      .bail()
      .trim()
      .toLowerCase()
      .isIn(["kcca", "airqo"])
      .withMessage("the tenant value is not among the expected ones"),
  ]),
  oneOf([
    body("email")
      .exists()
      .withMessage("the email should be provided")
      .bail()
      .isEmail()
      .withMessage("this is not a valid email address")
      .trim(),
  ]),
  requestController.create
);
router.get(
  "/candidates",
  oneOf([
    query("tenant")
      .exists()
      .withMessage("tenant should be provided")
      .bail()
      .trim()
      .toLowerCase()
      .isIn(["kcca", "airqo"])
      .withMessage("the tenant value is not among the expected ones"),
  ]),
  setJWTAuth,
  authJWT,
  requestController.list
);
router.post(
  "/candidates/confirm",
  oneOf([
    query("tenant")
      .exists()
      .withMessage("tenant should be provided")
      .bail()
      .trim()
      .toLowerCase()
      .isIn(["kcca", "airqo"])
      .withMessage("the tenant value is not among the expected ones"),
  ]),
  setJWTAuth,
  authJWT,
  requestController.confirm
);
router.delete(
  "/candidates",
  oneOf([
    query("tenant")
      .exists()
      .withMessage("tenant should be provided")
      .bail()
      .trim()
      .toLowerCase()
      .isIn(["kcca", "airqo"])
      .withMessage("the tenant value is not among the expected ones"),
  ]),
  oneOf([
    query("id")
      .exists()
      .withMessage(
        "the candidate identifier is missing in request, consider using the id"
      )
      .bail()
      .trim()
      .isMongoId()
      .withMessage("id must be an object ID")
      .bail()
      .customSanitizer((value) => {
        return ObjectId(value);
      }),
  ]),
  setJWTAuth,
  authJWT,
  requestController.delete
);
router.put(
  "/candidates",
  oneOf([
    query("tenant")
      .exists()
      .withMessage("tenant should be provided")
      .bail()
      .trim()
      .toLowerCase()
      .isIn(["kcca", "airqo"])
      .withMessage("the tenant value is not among the expected ones"),
  ]),
  oneOf([
    query("id")
      .exists()
      .withMessage(
        "the candidate identifier is missing in request, consider using the id"
      )
      .bail()
      .trim()
      .isMongoId()
      .withMessage("id must be an object ID")
      .bail()
      .customSanitizer((value) => {
        return ObjectId(value);
      }),
  ]),
  oneOf([
    [
      body("status")
        .if(body("status").exists())
        .notEmpty()
        .trim()
        .toLowerCase()
        .isIn(["pending", "rejected"])
        .withMessage(
          "the status value is not among the expected ones which include: rejected and pending"
        ),
    ],
  ]),
  setJWTAuth,
  authJWT,
  requestController.update
);

//************************ inquiries ***********************************************
router.post(
  "/inquiries/register",
  oneOf([
    query("tenant")
      .exists()
      .withMessage("tenant should be provided")
      .bail()
      .trim()
      .toLowerCase()
      .isIn(["kcca", "airqo"])
      .withMessage("the tenant value is not among the expected ones"),
  ]),
  oneOf([
    [
      body("email")
        .exists()
        .withMessage("the email should be provided")
        .bail()
        .trim()
        .isEmail()
        .withMessage("this is not a valid email address"),
      body("category")
        .exists()
        .withMessage("the category should be provided")
        .bail()
        .trim()
        .toLowerCase()
        .isIn([
          "general",
          "data",
          "feedback",
          "monitors",
          "partners",
          "researchers",
          "policy",
          "champions",
          "developers",
        ])
        .withMessage(
          "the category value is not among the expected ones which are: general, data, feedback, monitors, partners,researchers,policy,champions,developers"
        ),
      body("message")
        .exists()
        .withMessage("the message should be provided")
        .bail()
        .trim(),
      body("fullName")
        .exists()
        .withMessage("the fullName should be provided")
        .bail()
        .trim(),
    ],
  ]),
  inquiryController.create
);
router.get(
  "/inquiries",
  oneOf([
    query("tenant")
      .exists()
      .withMessage("tenant should be provided")
      .bail()
      .trim()
      .toLowerCase()
      .isIn(["kcca", "airqo"])
      .withMessage("the tenant value is not among the expected ones"),
  ]),
  setJWTAuth,
  authJWT,
  inquiryController.list
);

router.delete(
  "/inquiries",
  oneOf([
    query("tenant")
      .exists()
      .withMessage("tenant should be provided")
      .bail()
      .trim()
      .toLowerCase()
      .isIn(["kcca", "airqo"])
      .withMessage("the tenant value is not among the expected ones"),
  ]),
  oneOf([
    query("id")
      .exists()
      .withMessage(
        "the candidate identifier is missing in request, consider using the id"
      )
      .bail()
      .trim()
      .isMongoId()
      .withMessage("id must be an object ID")
      .bail()
      .customSanitizer((value) => {
        return ObjectId(value);
      }),
  ]),
  setJWTAuth,
  authJWT,
  inquiryController.delete
);
router.put(
  "/inquiries",
  oneOf([
    query("tenant")
      .exists()
      .withMessage("tenant should be provided")
      .bail()
      .trim()
      .toLowerCase()
      .isIn(["kcca", "airqo"])
      .withMessage("the tenant value is not among the expected ones"),
  ]),
  oneOf([
    query("id")
      .exists()
      .withMessage(
        "the candidate identifier is missing in request, consider using the id"
      )
      .bail()
      .trim()
      .isMongoId()
      .withMessage("id must be an object ID")
      .bail()
      .customSanitizer((value) => {
        return ObjectId(value);
      }),
  ]),
  oneOf([
    [
      body("status")
        .if(body("status").exists())
        .notEmpty()
        .trim()
        .toLowerCase()
        .isIn(["pending", "rejected"])
        .withMessage(
          "the status value is not among the expected ones which include: rejected and pending"
        ),
    ],
  ]),
  setJWTAuth,
  authJWT,
  inquiryController.update
);

/**************** create organization use case ***********************/
router.delete(
  "/organizations",
  oneOf([
    query("tenant")
      .if(query("tenant").exists())
      .notEmpty()
      .withMessage("tenant cannot be empty if provided")
      .bail()
      .trim()
      .toLowerCase()
      .isIn(["kcca", "airqo"])
      .withMessage("the tenant value is not among the expected ones"),
  ]),
  oneOf([
    query("id")
      .exists()
      .withMessage(
        "the record's identifier is missing in request, consider using the id"
      )
      .bail()
      .trim()
      .isMongoId()
      .withMessage("id must be an object ID")
      .bail()
      .customSanitizer((value) => {
        return ObjectId(value);
      }),
  ]),
  setJWTAuth,
  authJWT,
  organizationController.delete
);

router.put(
  "/organizations",
  oneOf([
    query("tenant")
      .if(query("tenant").exists())
      .notEmpty()
      .withMessage("tenant cannot be empty if provided")
      .bail()
      .trim()
      .toLowerCase()
      .isIn(["kcca", "airqo"])
      .withMessage("the tenant value is not among the expected ones"),
  ]),
  oneOf([
    query("id")
      .exists()
      .withMessage(
        "the record's identifier is missing in request, consider using the id"
      )
      .bail()
      .trim()
      .isMongoId()
      .withMessage("id must be an object ID")
      .bail()
      .customSanitizer((value) => {
        return ObjectId(value);
      }),
  ]),
  oneOf([
    [
      body("email")
        .if(body("email").exists())
        .notEmpty()
        .withMessage("the email should not be empty")
        .bail()
        .isEmail()
        .withMessage("this is not a valid email address")
        .trim(),
      body("website")
        .if(body("website").exists())
        .notEmpty()
        .withMessage("the website should not be empty")
        .bail()
        .isURL()
        .withMessage("the website is not a valid URL")
        .trim(),
      body("isAlias")
        .if(body("isAlias").exists())
        .notEmpty()
        .withMessage("the isAlias should not be empty")
        .bail()
        .isBoolean()
        .withMessage("isAlias must be a Boolean")
        .trim(),
      body("isActive")
        .if(body("isActive").exists())
        .notEmpty()
        .withMessage("the isActive should not be empty")
        .bail()
        .isBoolean()
        .withMessage("isActive must be a Boolean")
        .trim(),
      body("status")
        .if(body("status").exists())
        .notEmpty()
        .withMessage("the status should not be empty")
        .bail()
        .toLowerCase()
        .isIn(["active", "inactive", "pending"])
        .withMessage(
          "the status value is not among the expected ones which include: active, inactive, pending"
        )
        .trim(),
      body("phoneNumber")
        .if(body("phoneNumber").exists())
        .notEmpty()
        .withMessage("the phoneNumber should not be empty")
        .bail()
        .isMobilePhone()
        .withMessage("the phoneNumber is not a valid one")
        .bail()
        .trim(),
      body("category")
        .if(body("category").exists())
        .notEmpty()
        .withMessage("the category should not be empty")
        .bail()
        .trim(),
      body("name")
        .if(body("name").exists())
        .notEmpty()
        .withMessage("the name should not be empty")
        .trim(),
      body("tenant")
        .if(body("tenant").exists())
        .notEmpty()
        .withMessage("the tenant cannot be empty if provided")
        .trim()
        .toLowerCase(),
    ],
  ]),
  setJWTAuth,
  authJWT,
  organizationController.update
);

router.get(
  "/organizations",
  oneOf([
    query("tenant")
      .if(query("tenant").exists())
      .notEmpty()
      .withMessage("tenant cannot be empty if provided")
      .bail()
      .trim()
      .toLowerCase()
      .isIn(["kcca", "airqo"])
      .withMessage("the tenant value is not among the expected ones"),
  ]),
  setJWTAuth,
  authJWT,
  organizationController.list
);

router.post(
  "/organizations",
  oneOf([
    query("tenant")
      .if(query("tenant").exists())
      .notEmpty()
      .withMessage("tenant cannot be empty if provided")
      .bail()
      .trim()
      .toLowerCase()
      .isIn(["kcca", "airqo"])
      .withMessage("the tenant value is not among the expected ones"),
  ]),
  oneOf([
    [
      body("email")
        .exists()
        .withMessage("the organization's email address is required")
        .bail()
        .isEmail()
        .withMessage("This is not a valid email address")
        .trim(),
      body("website")
        .exists()
        .withMessage("the organization's website is required")
        .bail()
        .isURL()
        .withMessage("the website is not a valid URL")
        .trim(),
      body("isAlias")
        .exists()
        .withMessage("isAlias is required")
        .bail()
        .isBoolean()
        .withMessage("isAlias must be a Boolean")
        .trim(),
      body("isActive")
        .if(body("isActive").exists())
        .notEmpty()
        .withMessage("the isActive should not be empty")
        .bail()
        .isBoolean()
        .withMessage("isActive must be a Boolean")
        .trim(),
      body("status")
        .if(body("status").exists())
        .notEmpty()
        .withMessage("the status should not be empty")
        .bail()
        .toLowerCase()
        .isIn(["active", "inactive", "pending"])
        .withMessage(
          "the status value is not among the expected ones which include: active, inactive, pending"
        )
        .trim(),
      body("phoneNumber")
        .exists()
        .withMessage("the organization's phoneNumber is required")
        .bail()
        .isMobilePhone()
        .withMessage("the phoneNumber is not a valid one")
        .bail()
        .trim(),
      body("category")
        .exists()
        .withMessage("the organization's category is required")
        .bail()
        .toLowerCase()
        .isIn([
          "business",
          "research",
          "policy",
          "awareness",
          "school",
          "others",
        ])
        .withMessage(
          "the status value is not among the expected ones which include: business, research, policy, awareness, school, others"
        )
        .trim(),
      body("name")
        .exists()
        .withMessage("the organization's name is required")
        .trim(),
      body("tenant")
        .if(body("tenant").exists())
        .notEmpty()
        .withMessage("the tenant cannot be empty if provided")
        .trim()
        .toLowerCase(),
    ],
  ]),
  setJWTAuth,
  authJWT,
  organizationController.create
);

router.post(
  "/organizations/tenant",
  oneOf([
    query("tenant")
      .if(query("tenant").exists())
      .notEmpty()
      .withMessage("tenant cannot be empty if provided")
      .bail()
      .trim()
      .toLowerCase()
      .isIn(["kcca", "airqo"])
      .withMessage("the tenant value is not among the expected ones"),
  ]),
  oneOf([
    [
      body("email")
        .exists()
        .withMessage("the organization's email address is required")
        .bail()
        .isEmail()
        .withMessage("This is not a valid email address")
        .trim(),
    ],
  ]),
  setJWTAuth,
  authJWT,
  organizationController.getTenantFromEmail
);

module.exports = router;
