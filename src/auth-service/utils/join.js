const UserSchema = require("../models/User");
const { getModelByTenant } = require("../utils/multitenancy");
const { logObject, logElement, logText } = require("../utils/log");
const mailer = require("../services/mailer");
const generatePassword = require("generate-password");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const isEmpty = require("is-empty");
const HTTPStatus = require("http-status");
const { getAuth, sendSignInLinkToEmail } = require("firebase-admin/auth");
const actionCodeSettings = require("../config/firebase-settings");
const httpStatus = require("http-status");
const validationsUtil = require("./validations");
const constants = require("../config/constants");
const createTokenUtil = require("../utils/create-token");
const log4js = require("log4js");
const logger = log4js.getLogger("join-util");

const UserModel = (tenant) => {
  try {
    let users = mongoose.model("users");
    return users;
  } catch (error) {
    let users = getModelByTenant(tenant, "user", UserSchema);
    return users;
  }
};

const join = {
  list: async (tenant, filter, limit, skip) => {
    try {
      let responseFromListUser = await UserModel(tenant).list({
        filter,
        limit,
        skip,
      });
      if (responseFromListUser.success == true) {
        return {
          success: true,
          message: responseFromListUser.message,
          data: responseFromListUser.data,
        };
      } else if ((responseFromListUser.success = false)) {
        if (responseFromListUser.error) {
          return {
            success: false,
            message: responseFromListUser.message,
            error: responseFromListUser.error,
          };
        } else {
          return {
            success: false,
            message: responseFromListUser.message,
          };
        }
      }
    } catch (e) {
      logElement("list users util", e.message);
      return {
        success: false,
        message: "list users util server error",
        error: e.message,
      };
    }
  },
  update: async (tenant, filter, update, type) => {
    try {
      let responseFromModifyUser = await UserModel(tenant.toLowerCase()).modify(
        {
          filter,
          update,
        }
      );
      if (responseFromModifyUser.success == true) {
        let user = responseFromModifyUser.data;
        let responseFromSendEmail = await mailer.update(
          user.email,
          user.firstName,
          user.lastName,
          type
        );

        if (responseFromSendEmail.success == true) {
          return {
            success: true,
            message: responseFromModifyUser.message,
            data: responseFromModifyUser.data,
          };
        } else if (responseFromSendEmail.success == false) {
          if (responseFromSendEmail.error) {
            return {
              success: false,
              message: responseFromSendEmail.message,
              error: responseFromSendEmail.error,
            };
          } else {
            return {
              success: false,
              message: responseFromSendEmail.message,
            };
          }
        }
      } else if (responseFromModifyUser.success == false) {
        if (responseFromModifyUser.error) {
          return {
            success: false,
            message: responseFromModifyUser.message,
            error: responseFromModifyUser.error,
          };
        } else {
          return {
            success: false,
            message: responseFromModifyUser.message,
          };
        }
      }
    } catch (e) {
      logElement("update users util", e.message);
      return {
        success: false,
        message: "util server error",
        error: e.message,
      };
    }
  },
  generateSignInWithEmailLink: async (request, callback) => {
    try {
      const { body, query } = request;
      const { email } = body;
      const { purpose } = query;

      return getAuth()
        .generateSignInWithEmailLink(email, actionCodeSettings)
        .then(async (link) => {
          let linkSegments = link.split("%").filter((segment) => segment);
          const indexBeforeCode = linkSegments.indexOf("26oobCode", 0);
          const indexOfCode = indexBeforeCode + 1;
          let emailLinkCode = linkSegments[indexOfCode].substring(2);

          await validationsUtil.checkEmailExistenceUsingKickbox(
            email,
            (value) => {
              if (value.success == false) {
                const errors = value.errors ? value.errors : "";
                callback({
                  success: false,
                  message: value.message,
                  errors,
                  status: value.status,
                });
              }
            }
          );

          let responseFromSendEmail = {};
          let token = 100000;
          if (email !== constants.EMAIL) {
            token = Math.floor(Math.random() * (999999 - 100000) + 100000);
          }
          if (purpose === "auth") {
            responseFromSendEmail = await mailer.authenticateEmail(
              email,
              token
            );
          }
          if (purpose === "login") {
            responseFromSendEmail = await mailer.signInWithEmailLink(
              email,
              token
            );
          }

          if (responseFromSendEmail.success === true) {
            callback({
              success: true,
              message: "process successful, check your email for token",
              status: httpStatus.OK,
              data: {
                link,
                token,
                email,
                emailLinkCode,
              },
            });
          }

          if (responseFromSendEmail.success === false) {
            callback({
              success: false,
              message: "email sending process unsuccessful",
              errors: responseFromSendEmail.errors,
              status: httpStatus.BAD_GATEWAY,
            });
          }
        })
        .catch((error) => {
          logObject("the error", error);
          let status = httpStatus.INTERNAL_SERVER_ERROR;

          if (error.code === "auth/invalid-email") {
            status = httpStatus.BAD_REQUEST;
          }
          callback({
            success: false,
            message: "unable to sign in using email link",
            status,
            errors: {
              message: error,
            },
          });
        });
    } catch (error) {
      callback({
        success: false,
        message: "Internal Server Error",
        status: httpStatus.INTERNAL_SERVER_ERROR,
        errors: {
          message: error.message,
        },
      });
    }
  },
  delete: async (tenant, filter) => {
    try {
      let responseFromRemoveUser = await UserModel(tenant.toLowerCase()).remove(
        {
          filter,
        }
      );
      if (responseFromRemoveUser.success == true) {
        return {
          success: true,
          message: responseFromRemoveUser.message,
          data: responseFromRemoveUser.data,
        };
      } else if (responseFromRemoveUser.success == false) {
        if (responseFromRemoveUser.error) {
          return {
            success: false,
            message: responseFromRemoveUser.message,
            error: responseFromRemoveUser.error,
          };
        } else {
          return {
            success: false,
            message: responseFromRemoveUser.message,
          };
        }
      }
    } catch (e) {
      logElement("delete users util", e.message);
      return {
        success: false,
        message: "util server error",
        error: e.message,
      };
    }
  },
  verify: async (req) => {
    try {
      /**
       * first find the user
       * Using userId and category, check for the token
       * then update the user
       * send the general welcome or request access email after the
       *
       * I think the password generation for user creation
       * should happen at the verification stage
       */
      const { query } = req;
      const { tenant, token, id } = query;
      const responseFromListUser = await join.list(tenant, { _id: id });

      if (responseFromListUser.success === true) {
        if (responseFromListUser.data.length === 1) {
          let request = {};
          request["userId"] = id;
          request["token"] = token;
          request["category"] = "user";

          const responseFromListToken = await createTokenUtil.list(request);

          if (responseFromListToken.success === true) {
            const filter = {
              _id: responseFromListUser.data._id,
            };
            const password = "";
            const update = {
              verified: true,
              password,
            };
            const responseFromUpdateUser = await join.update(
              tenant,
              filter,
              update,
              "verified"
            );
            if (responseFromUpdateUser.success === true) {
              return {
                success: true,
                message: "successfully verified the user",
                status: httpStatus.OK,
              };
            }

            if (responseFromUpdateUser.success === false) {
              return responseFromUpdateUser;
            }
          }
          if (responseFromListToken.success === false) {
            return responseFromListToken;
          }
        }
        if (responseFromListUser.data.length > 1) {
          return {
            success: false,
            message: "more than one user exists for this operation ",
            status: httpStatus.NOT_FOUND,
          };
        }
        if (responseFromListUser.data.length === 0) {
          return {
            success: false,
            message: "no user found for this operation ",
            status: httpStatus.NOT_FOUND,
          };
        }
      }

      if (responseFromListUser.success === false) {
        return responseFromListUser;
      }
    } catch (error) {
      return {
        success: false,
        message: "Internal Server Error",
        errors: {
          message: error.message,
        },
      };
    }
  },
  create: async (request) => {
    try {
      /***
       * create new user
       * create new token
       * send email with verification link
       *
       */
      let {
        tenant,
        firstName,
        lastName,
        email,
        organization,
        long_organization,
        privilege,
      } = request;
      let response = {};
      logText("...........create user util...................");
      /**
       * we shall take this generate password to the
       * verify logic and remove it from here
       */
      let responseFromGeneratePassword = join.createPassword(10);
      logObject("responseFromGeneratePassword", responseFromGeneratePassword);
      if (responseFromGeneratePassword.success === true) {
        const password = responseFromGeneratePassword.data;
        let createUserRequestBody = {
          firstName,
          lastName,
          email,
          organization,
          long_organization,
          privilege,
          userName: email,
          password,
        };

        const responseFromCreateUser = await UserModel(tenant).register(
          createUserRequestBody
        );

        if (responseFromCreateUser.success === true) {
          let createdUser = await responseFromCreateUser.data;
          logObject("created user in util", createdUser._doc);
          const id = createdUser._doc._id;
          const token = crypto.randomBytes(32).toString("hex");

          let createTokenRequestBody = {
            category: "user",
            userId: id,
            token,
          };

          const responseFromCreateToken = await createTokenUtil.create(
            createTokenRequestBody
          );

          if (responseFromCreateToken.success === true) {
            let responseFromSendEmail = await mailer.user(
              firstName,
              lastName,
              email,
              password,
              tenant,
              "verify",
              id,
              token
            );

            logObject("responseFromSendEmail", responseFromSendEmail);
            if (responseFromSendEmail.success === true) {
              return {
                success: true,
                message: "user successfully created",
                data: createdUser._doc,
              };
            } else if (responseFromSendEmail.success === false) {
              let status = responseFromSendEmail.status
                ? responseFromSendEmail.status
                : "";
              let error = responseFromSendEmail.error
                ? responseFromSendEmail.error
                : "";
              return {
                success: false,
                message: responseFromSendEmail.message,
                error,
                status,
              };
            }
          } else if (responseFromCreateToken.success === false) {
            return responseFromCreateToken;
          }
        } else if (responseFromCreateUser.success === false) {
          let error = responseFromCreateUser.error
            ? responseFromCreateUser.error
            : "";
          let status = responseFromCreateUser.status
            ? responseFromCreateUser.status
            : "";
          return {
            success: false,
            message: responseFromCreateUser.message,
            error,
            status,
          };
        }
      } else if (responseFromGeneratePassword.success === false) {
        let error = responseFromGeneratePassword.error
          ? responseFromGeneratePassword.error
          : "";
        let status = responseFromGeneratePassword.status
          ? responseFromGeneratePassword.status
          : "";
        logElement("error when password generation fails", error);
        return {
          success: false,
          message: responseFromGeneratePassword.message,
          error,
          status,
        };
      }
    } catch (e) {
      return {
        success: false,
        message: "Internal Server Error",
        error: { message: e.message },
        status: HTTPStatus.INTERNAL_SERVER_ERROR,
      };
    }
  },
  confirmEmail: (tenant, filter) => {
    try {
      let responseFromListUser = join.list({ filter });
      if (responseFromListUser.success == true) {
        let responseFromUpdateUser = this.update(tenant, filter, update);
        if (responseFromUpdateUser.success == true) {
          return {
            success: true,
            message: "remail successfully confirmed",
            data: responseFromUpdateUser.data,
          };
        } else if (responseFromUpdateUser.success == false) {
          if (responseFromUpdateUser.error) {
            return {
              success: false,
              message: responseFromUpdateUser.message,
              error: responseFromUpdateUser.error,
            };
          } else {
            return {
              success: false,
              message: responseFromUpdateUser.message,
            };
          }
        }
      } else if (responseFromListUser.success == false) {
        if (responseFromListUser.error) {
          return {
            success: false,
            message: responseFromListUser.message,
            error: responseFromListUser.error,
          };
        } else {
          return {
            success: false,
            message: responseFromListUser.message,
          };
        }
      }
    } catch (error) {
      logElement("confirm email util", error.message);
      return {
        success: false,
        message: "join util server error",
        error: error.message,
      };
    }
  },
  forgotPassword: async (tenant, filter) => {
    try {
      let responseFromGenerateResetToken = join.generateResetToken();
      logObject(
        "responseFromGenerateResetToken",
        responseFromGenerateResetToken
      );
      logObject("filter", filter);
      if (responseFromGenerateResetToken.success === true) {
        let token = responseFromGenerateResetToken.data;
        let update = {
          resetPasswordToken: token,
          resetPasswordExpires: Date.now() + 3600000,
        };
        let responseFromModifyUser = await UserModel(
          tenant.toLowerCase()
        ).modify({
          filter,
          update,
        });
        if (responseFromModifyUser.success === true) {
          let responseFromSendEmail = await mailer.forgot(
            filter.email,
            token,
            tenant
          );
          logObject("responseFromSendEmail", responseFromSendEmail);
          if (responseFromSendEmail.success === true) {
            return {
              success: true,
              message: "forgot email successfully sent",
            };
          }

          if (responseFromSendEmail.success === false) {
            if (responseFromSendEmail.error) {
              return {
                success: false,
                error: responseFromSendEmail.error,
                message: "unable to send the email request",
              };
            } else {
              return {
                success: false,
                message: responseFromSendEmail.message,
              };
            }
          }
        }

        if (responseFromModifyUser.success === false) {
          if (responseFromModifyUser.error) {
            return {
              success: false,
              error: responseFromModifyUser.error,
              message: responseFromModifyUser.message,
            };
          } else {
            return {
              success: false,
              message: responseFromModifyUser.message,
            };
          }
        }
      }

      if (responseFromGenerateResetToken.success === false) {
        if (responseFromGenerateResetToken.error) {
          return {
            success: false,
            error: responseFromGenerateResetToken.error,
            message: responseFromGenerateResetToken.message,
          };
        } else {
          return {
            success: false,
            message: responseFromGenerateResetToken.message,
          };
        }
      }
    } catch (e) {
      logElement("forgot password util", e.message);
      return {
        success: false,
        message: "util server error",
        error: e.message,
      };
    }
  },
  updateForgottenPassword: async (tenant, filter, update) => {
    try {
      let responseFromCheckTokenValidity = await join.isPasswordTokenValid(
        tenant.toLowerCase(),
        filter
      );
      logObject(
        "responseFromCheckTokenValidity",
        responseFromCheckTokenValidity
      );
      if (responseFromCheckTokenValidity.success == true) {
        let modifiedUpdate = {
          ...update,
          resetPasswordToken: null,
          resetPasswordExpires: null,
        };
        let responseFromUpdateUser = await join.update(
          tenant.toLowerCase(),
          filter,
          modifiedUpdate
        );
        logObject(
          "responseFromUpdateUser in update forgotten password",
          responseFromUpdateUser
        );
        if (responseFromUpdateUser.success == true) {
          return {
            success: true,
            message: responseFromUpdateUser.message,
            data: responseFromUpdateUser.data,
          };
        } else if (responseFromUpdateUser == false) {
          if (responseFromUpdateUser.error) {
            return {
              success: false,
              message: responseFromUpdateUser.message,
              error: responseFromUpdateUser.error,
            };
          } else {
            return {
              success: true,
              message: responseFromUpdateUser.message,
            };
          }
        }
      } else if (responseFromCheckTokenValidity.success == false) {
        if (responseFromCheckTokenValidity.error) {
          return {
            success: false,
            message: responseFromCheckTokenValidity.message,
            error: responseFromCheckTokenValidity.error,
          };
        } else {
          return {
            success: false,
            message: responseFromCheckTokenValidity.message,
          };
        }
      }
    } catch (error) {
      logElement("update forgotten password", error.message);
      return {
        success: false,
        message: "util server error",
        error: error.message,
      };
    }
  },
  updateKnownPassword: async (tenant, new_pwd, old_pwd, filter) => {
    try {
      logElement("the tenant", tenant);
      logElement("the old password", old_pwd);
      logElement("the new password ", new_pwd);
      logObject("the filter", filter);
      let responseFromComparePassword = await join.comparePasswords(
        filter,
        tenant,
        old_pwd
      );
      logObject("responseFromComparePassword", responseFromComparePassword);
      if (responseFromComparePassword.success == true) {
        let update = {
          password: new_pwd,
        };

        let responseFromUpdateUser = await join.update(tenant, filter, update);
        logObject("responseFromUpdateUser", responseFromUpdateUser);
        if (responseFromUpdateUser.success == true) {
          return {
            success: true,
            message: responseFromUpdateUser.message,
            data: responseFromUpdateUser.data,
          };
        } else if (responseFromUpdateUser.success == false) {
          if (responseFromUpdateUser.error) {
            return {
              success: false,
              message: responseFromUpdateUser.message,
              error: responseFromUpdateUser.error,
            };
          } else {
            return {
              success: false,
              message: responseFromUpdateUser.message,
            };
          }
        }
      } else if (responseFromComparePassword.success == false) {
        if (responseFromComparePassword.error) {
          return {
            success: false,
            message: responseFromComparePassword.message,
            error: responseFromComparePassword.error,
          };
        } else {
          return {
            success: false,
            message: responseFromComparePassword.message,
          };
        }
      }
    } catch (e) {
      logElement("update known password", e.message);
      return {
        success: false,
        message: "update known password util server error",
        error: e.message,
      };
    }
  },
  comparePasswords: async (filter, tenant, old_pwd) => {
    try {
      let user = await UserModel(tenant).findOne(filter).exec();
      if (!isEmpty(user)) {
        let responseFromBcrypt = await bcrypt.compare(
          old_pwd,
          user._doc.password
        );
        if (responseFromBcrypt == true) {
          return {
            success: true,
            message: "the passwords match",
          };
        } else if (responseFromBcrypt == false) {
          return {
            message:
              "either your old password is incorrect or the provided user does not exist",
            success: false,
          };
        }
      } else {
        return {
          success: false,
          message: "unable to find this user",
        };
      }
    } catch (error) {
      logElement("compare passwords util server error", error.message);
      return {
        success: false,
        message: "compare passwords utils server error",
        error: error.message,
      };
    }
  },
  generateResetToken: () => {
    try {
      const token = crypto.randomBytes(20).toString("hex");
      return {
        success: true,
        message: "token generated successfully",
        data: token,
      };
    } catch (error) {
      logElement("generate reset token util", error.message);
      return {
        success: false,
        message: "util server error",
        error: error.message,
      };
    }
  },
  isPasswordTokenValid: async (tenant, filter) => {
    try {
      let responseFromListUser = await UserModel(tenant.toLowerCase()).list({
        filter,
      });
      logObject("responseFromListUser", responseFromListUser);
      // logObject("the filter", filter);
      if (responseFromListUser.success == true) {
        if (isEmpty(responseFromListUser.data)) {
          return {
            success: false,
            message: "password reset link is invalid or has expired",
          };
        } else {
          return {
            success: true,
            message: responseFromListUser.message,
            data: responseFromListUser.data,
          };
        }
      } else if (responseFromListUser.success == false) {
        if (responseFromListUser.error) {
          return {
            success: false,
            message: responseFromListUser.message,
            error: responseFromListUser.error,
          };
        } else {
          return {
            success: false,
            message: responseFromListUser.message,
          };
        }
      }
    } catch (error) {
      logElement("is password token valid", error.message);
      return {
        success: false,
        message: "util server error",
        error: error.message,
      };
    }
  },
  createPassword: (length) => {
    try {
      let password = generatePassword.generate(
        constants.RANDOM_PASSWORD_CONFIGURATION(length)
      );
      return {
        success: true,
        message: "password generated",
        data: password,
      };
    } catch (e) {
      logElement("generate password util error message", e.message);
      return {
        success: false,
        message: "generate password util server error",
        error: e.message,
      };
    }
  },
};

module.exports = join;
