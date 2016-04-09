var request = require("request");
var Service, Characteristic;

module.exports = function (homebridge) {

  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;

  homebridge.registerAccessory("homebridge-alarmdotcom", "Alarmdotcom", AlarmcomAccessory);
}

function AlarmcomAccessory(log, config) {

  this.log = log;
  this.name = config["name"];
  this.username = config["username"];
  this.password = config["password"];
  this.apiKey = config["apiKey"];
  this.sessionUrl = "";

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

  //initLogin(callback).bind(this);
  this.log('getting sessionUrl');

  request.get({
    url: "https://wrapapi.com/use/bryanbartow/alarmdotcom/initlogin/0.0.2",
    qs: { wrapAPIKey: this.apiKey }
  }, function(err, response, body) {

    if (!err && response.statusCode == 200) {
      var json = JSON.parse(body);
      this.sessionUrl = json.data.sessionUrl;

      this.login(callback);
    }
    else {
      this.log("Error getting state (status code %s): %s", response.statusCode, err);
      callback(err);
    }
  }.bind(this));
}
/*
var initLogin = function(callback) {

  this.log('getting sessionUrl');

  request.get({
    url: "https://wrapapi.com/use/bryanbartow/alarmdotcom/initlogin/0.0.2",
    qs: { wrapAPIKey: apiKey }
  }, function(err, response, body) {

    if (!err && response.statusCode == 200) {
      var json = JSON.parse(body);
      this.sessionUrl = json.data.sessionUrl;

      this.login(callback).bind(this);
    }
    else {
      this.log("Error getting state (status code %s): %s", response.statusCode, err);
      callback(err);
    }
  });
}
*/

AlarmcomAccessory.prototype.login = function(callback) {

  this.log('logging in');

  request.get({
    url: "https://wrapapi.com/use/bryanbartow/alarmdotcom/login/0.0.2",
    qs: {
      wrapAPIKey: this.apiKey,
      sessionUrl: this.sessionUrl,
      username: this.username,
      password: this.password
    }
  }, function(err, response, body) {

    if (!err && response.statusCode == 200) {
      var json = JSON.parse(body);
      this.log(json);
      var alarmState = json.data.alarmState;

      var statusResult = new Object();

      if(alarmState === "Disarmed") {
        statusResult.message = "disarmed";
        statusResult.status = Characteristic.SecuritySystemCurrentState.DISARMED;
      } else if(alarmState === "Armed Stay") {
        statusResult.message = "stay_armed";
        statusResult.status = Characteristic.SecuritySystemCurrentState.STAY_ARM;
      } else if(alarmState === "Armed Away") {
        statusResult.message = "away_armed";
        statusResult.status = Characteristic.SecuritySystemCurrentState.AWAY_ARM;
      }

      statusResult.success = true;

      this.log(statusResult);

      callback(null, statusResult.status);
    }
    else {
      this.log("Error getting state (status code %s): %s", response.statusCode, err);
      callback(err);
    }
  }.bind(this));
}

AlarmcomAccessory.prototype.setState = function(state, callback) {

  var statusResult = new Object();

	try {

		var driver = new phantomjs.Driver();

		driver.get('https://www.alarm.com/pda/Default.aspx');
		driver.findElement(By.name('ctl00$ContentPlaceHolder1$txtLogin')).sendKeys(this.username);
		driver.findElement(By.name('ctl00$ContentPlaceHolder1$txtPassword')).sendKeys(this.password);
		driver.findElement(By.name('ctl00$ContentPlaceHolder1$btnLogin')).click();

    return driver.getTitle().then(function(title) {

      console.log('Logged in to alarm.com');
      console.log("attempting to set state::" + state);

      // Determine the element to click based on state

      var setStateElementId;
      var confirmStateElemendId = null;

      if(state === Characteristic.SecuritySystemTargetState.DISARM) {

        setStateElementId = 'ctl00_phBody_butDisarm';
      }
      else if(state === Characteristic.SecuritySystemTargetState.STAY_ARM) {

        setStateElementId = 'ctl00_phBody_butArmStay';
      }
      else if(state === Characteristic.SecuritySystemTargetState.AWAY_ARM) {

        setStateElementId = 'ctl00_phBody_butArmAway';
      }

      driver.findElement(By.id(setStateElementId)).then(function(statusElement) {

        statusElement.click().then(function(clickedStatusElement) {

            statusResult.message = "state set to  " + state;
            statusResult.success = true;

			if(state === Characteristic.SecuritySystemTargetState.DISARMED) {
				statusResult.status = Characteristic.SecuritySystemCurrentState.DISARMED;
			} else if(state === Characteristic.SecuritySystemTargetState.STAY_ARM) {
				statusResult.status = Characteristic.SecuritySystemCurrentState.STAY_ARM;
			} else {
				statusResult.status = Characteristic.SecuritySystemCurrentState.AWAY_ARM;
			}

            driver.quit();

            return statusResult;
        });

      }, function(error) {

        console.log("Can't find state element");

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

function User() {
  return {
    username: config["username"],
    password: config["password"]
  }
}
