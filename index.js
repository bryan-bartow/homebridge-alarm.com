var phantom = require('phantomjs');
var Spooky = require('spooky');
var Service, Characteristic;

var url = "https://www.alarm.com/login.aspx"

module.exports = function(homebridge) {

  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;

  homebridge.registerAccessory("homebridge-alarm.com", "Alarm.com", AlarmcomAccessory);
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

  this.log("Getting current state...");

  var spooky = new Spooky({
  child: {
    transport: 'http'
  },
  casper: {
    logLevel: 'debug',
    verbose: true
  }
  }, function (err) {

    if (err) {
      e = new Error('Failed to load spooky');
      e.details = err;
      throw e;
    }

    spooky.start(url);

    // Load login page
    spooky.then(function () {
      this.log(document.title)
    });

    // Fill in login form
    spooky.then([
      {user:new User()},
      function () {
       spooky.fill(
        '.login-form',
         {
          'ctl00$ContentPlaceHolder1$loginform$txtUserName': user.username,
          'txtPassword': user.password
         },
         // if true submit the form
        true
        );
      }
    ])

    spooky.then(function() {

     spooky.click('.btn-sign-in')
     spooky.waitWhileSelector('.btn-sign-in', function() {
     });
    });

    spooky.then(function() {

      var currentState = -1;

      if(spooky.exists('img[src="../webimages/widgets/disarmed_text.png?2"]')) {
       this.log('unarmed');
       currentState = Characteristic.SecuritySystemCurrentState.DISARMED;
      } else if(spooky.exists('img[src="../webimages/widgets/armed_stay_text.png?2"]')) {
       this.log('armed - stay');
       currentState = Characteristic.SecuritySystemCurrentState.STAY_ARM;
      } else if(spooky.exists('img[src="../webimages/widgets/armed_away_text.png?2"]')) {
       this.log('armed - away');
       currentState = Characteristic.SecuritySystemCurrentState.AWAY_ARM;
      }

      if(currentState >= 0) {
        callback(null, currentState);
      } else {
        callback({"errorMessage": "Alarm is in indeterminate state"})
      }
    });

    spooky.run();

  }.bind(this));
}

AlarmcomAccessory.prototype.setState = function(state, callback) {

  var alarmState;

  switch (state) {
    case Characteristic.SecuritySystemTargetState.DISARMED:
      alarmState = "disarmed";
      break;

    case Characteristic.SecuritySystemTargetState.AWAY_ARM:
      alarmState = "armed - away";
      break;

    case Characteristic.SecuritySystemTargetState.STAY_ARM:
      alarmState = "armed - stay";
      break;
  }

  this.log("Set state to %s", alarmState);

  var spooky = new Spooky({
  child: {
    transport: 'http'
  },
  casper: {
    logLevel: 'debug',
    verbose: true
  }
  }, function (err) {

    if (err) {
      e = new Error('Failed to load spooky');
      e.details = err;
      throw e;
    }

    spooky.start(url);

    // Load login page
    spooky.then(function () {
      this.log(document.title)
    });

    // Fill in login form
    spooky.then([
      {user:new User()},
      function () {
       spooky.fill(
        '.login-form',
         {
          'ctl00$ContentPlaceHolder1$loginform$txtUserName': user.username,
          'txtPassword': user.password
         },
         // if true submit the form
        true
        );
      }
    ])

    spooky.then(function() {

     spooky.click('.btn-sign-in')
     spooky.waitWhileSelector('.btn-sign-in', function() {
     });
    });

    spooky.then(function() {
      if(state == Characteristic.SecuritySystemCurrentState.DISARMED) {
        spooky.click('#ctl00_phBody_ArmingStateWidget_btnDisarm');
      }
      else if(state == Characteristic.SecuritySystemCurrentState.STAY_ARM) {
        spooky.click('#ctl00_phBody_ArmingStateWidget_btnArmStay');

        spooky.waitForSelector('#ctl00_phBody_ArmingStateWidget_btnArmOptionStay', function() {
          spooky.click('#ctl00_phBody_ArmingStateWidget_btnArmOptionStay')
        });
      }
      else if(state == Characteristic.SecuritySystemCurrentState.AWAY_ARM) {
        spooky.click('#ctl00_phBody_ArmingStateWidget_btnArmAway');

        spooky.waitForSelector('#ctl00_phBody_ArmingStateWidget_btnArmOptionAway', function() {
          spooky.click('#ctl00_phBody_ArmingStateWidget_btnArmOptionAway')
        });
      }
    });

    spooky.then(function() {
      var currentState

      switch (state) {
        case Characteristic.SecuritySystemTargetState.DISARMED:
          currentState = Characteristic.SecuritySystemCurrentState.DISARMED
          break;

        case Characteristic.SecuritySystemTargetState.AWAY_ARM:
          currentState = Characteristic.SecuritySystemCurrentState.AWAY_ARM
          break;

        case Characteristic.SecuritySystemTargetState.STAY_ARM:
          currentState = Characteristic.SecuritySystemCurrentState.STAY_ARM
          break;
      }

      this.service
        .setCharacteristic(Characteristic.SecuritySystemCurrentState, currentState);

      callback(null); // success
    });

    spooky.run();

  }.bind(this));

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
