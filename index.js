var webdriver = require('selenium-webdriver');
var By = require('selenium-webdriver').By;
var until = require('selenium-webdriver').until;
var phantomjs = require('selenium-webdriver/phantomjs');
var Service, Characteristic;

var url = "https://www.alarm.com/login.aspx"

module.exports = function(homebridge) {

  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;

  homebridge.registerAccessory("homebridge-alarmdotcom", "Alarmdotcom", AlarmcomAccessory);
}

function AlarmcomAccessory(log, config) {

  this.log = log;
  this.name = config["name"];
  this.username = config["username"];
  this.password = config["password"];

  this.service = new Service.SecuritySystem(this.name);

  this.service
    .getCharacteristic(Characteristic.SecuritySystemCurrentState)
    .on('get', this.getState.bind(this));

  this.service
    .getCharacteristic(Characteristic.SecuritySystemTargetState)
    .on('get', this.getState.bind(this))
    .on('set', this.setState.bind(this));
}

AlarmcomAccessory.prototype.getState = function(callback) {

  var statusResult = new Object();

	try {

    var driver = new phantomjs.Driver();

		driver.get('https://www.alarm.com/login?m=no_session&ReturnUrl=/web/Security/SystemSummary.aspx');
		driver.findElement(By.name('ctl00$ContentPlaceHolder1$loginform$txtUserName')).sendKeys(this.username);
		driver.findElement(By.name('txtPassword')).sendKeys(this.password);
		driver.findElement(By.name('ctl00$ContentPlaceHolder1$loginform$signInButton')).click();

		this.log('Logged in to alarm.com');

    return driver.getTitle().then(function(title) {

      driver.findElement(By.id('ctl00_phBody_ArmingStateWidget_imgState')).then(function(statusElement) {

        statusElement.getAttribute('src').then(function(srcName) {

          if(srcName === "https://www.alarm.com/web/webimages/widgets/disarmed_text.png?2") {
            statusResult.message = "disarmed";
            statusResult.status = Characteristic.SecuritySystemCurrentState.DISARMED;
          } else if(srcName === "https://www.alarm.com/web/webimages/widgets/armed_stay_text.png?2") {
            statusResult.message = "stay_armed";
            statusResult.status = Characteristic.SecuritySystemCurrentState.STAY_ARM;
          } else if(srcName === "https://www.alarm.com/web/webimages/widgets/armed_away_text.png?2") {
            statusResult.message = "away_armed";
            statusResult.status = Characteristic.SecuritySystemCurrentState.AWAY_ARM;
          }

          driver.quit();

          statusResult.success = true;
        });

      }, function(error) {

        this.log("Can't find state element");

        statusResult.message = "Can't find the state element";
        statusResult.success = false;

        driver.quit();
      });

      return statusResult;

		}, 1000).then(function(result) {

      this.log(result);

			callback(null, result.status);
		}.bind(this));
	}
	catch(exception) {

    statusResult.message = exception.message;
    statusResult.success = false;

		console.log(statusResult);

		callback(statusResult);
	}
}

AlarmcomAccessory.prototype.setState = function(state, callback) {

  var statusResult = new Object();

	try {

		var driver = new phantomjs.Driver();

		driver.get('https://www.alarm.com/login?m=no_session&ReturnUrl=/web/Security/SystemSummary.aspx');
		driver.findElement(By.name('ctl00$ContentPlaceHolder1$loginform$txtUserName')).sendKeys(this.username);
		driver.findElement(By.name('txtPassword')).sendKeys(this.password);
		driver.findElement(By.name('ctl00$ContentPlaceHolder1$loginform$signInButton')).click();

    return driver.getTitle().then(function(title) {

      this.log('Logged in to alarm.com');
      this.log("attempting to set state::" + state);

      // Determine the element to click based on state

      var setStateElementId;
      var confirmStateElemendId = null;

      if(state === Characteristic.SecuritySystemTargetState.DISARM) {

        setStateElementId = 'ctl00_phBody_ArmingStateWidget_btnDisarm';
      }
      else if(state === Characteristic.SecuritySystemTargetState.STAY_ARM) {

        setStateElementId = 'ctl00_phBody_ArmingStateWidget_btnArmStay';
        confirmStateElemendId = 'ctl00_phBody_ArmingStateWidget_btnArmOptionStay'
      }
      else if(state === Characteristic.SecuritySystemTargetState.AWAY_ARM) {

        setStateElementId = 'ctl00_phBody_ArmingStateWidget_btnArmAway';
        confirmStateElemendId = 'ctl00_phBody_ArmingStateWidget_btnArmOptionAway'
      }

      driver.findElement(By.id(setStateElementId)).then(function(statusElement) {

        statusElement.click().then(function(clickedStatusElement) {

          if(state === Characteristic.SecuritySystemTargetState.DISARM) {

            statusResult.message = "state set to disarmed";
            statusResult.success = true;
            statusResult.status = Characteristic.SecuritySystemCurrentState.DISARMED

            driver.quit();

            return statusResult;
          } else if(state !== Characteristic.SecuritySystemTargetState.DISARM && confirmStateElemendId !== null) {

            driver.wait(until.elementLocated(By.id(confirmStateElemendId)), 1000).then(function(confirmElement) {

              confirmElement.click().then(function(clickedConfirmElement) {

                statusResult.message = "state set to " + state;
                statusResult.success = true;
                statusResult.status =
                  (state === Characteristic.SecuritySystemTargetState.STAY_ARM ?
                    Characteristic.SecuritySystemCurrentState.STAY_ARM :
                    Characteristic.SecuritySystemCurrentState.AWAY_ARM);

                driver.quit();

                return statusResult;
              });
            }, function(error) {

              this.log("Can't find confirm state element");

              statusResult.message = "Can't find the confirm state element";
              statusResult.success = false;

              driver.quit();
            });
          }
        });

      }, function(error) {

        this.log("Can't find state element");

        statusResult.message = "Can't find the state element";
        statusResult.success = false;

        driver.quit();
      });

      return statusResult;

		}, 1000).then(function(result) {

      this.log(result);

      this.service
        .setCharacteristic(Characteristic.SecuritySystemCurrentState, result.status);

			callback(null);
		}.bind(this));
	}
	catch(exception) {

    statusResult.message = exception.message;
    statusResult.success = false;

		console.log(statusResult);

		callback(statusResult);
	}
}

AlarmcomAccessory.prototype.getServices = function() {
  return [this.service];
}

// Helpers

/*
Spooky.on('debug', function (log) {
  console.log(log);
});

Spooky.on('error', function (e, stack) {
  console.error(e);
  if (stack) {
    console.log(stack);
  }
});

Spooky.on('doCallback', function (callbackFunction, error, state) {
  console.log('calling ' + callbackFunction);
  callbackFunction(error, state);
});
*/

function User() {
  return {
    username: config["username"],
    password: config["password"]
  }
}
