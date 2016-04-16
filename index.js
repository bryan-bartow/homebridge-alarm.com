var request = require('request');
var Service, Characteristic;

var alarm_status_map = [
    'Armed Stay',
    'Armed Away',
    'Armed Night',
    'Disarmed',
    'Alarm Triggered',
];

module.exports = homebridge => {

  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;

  homebridge.registerAccessory('homebridge-alarmdotcom', 'Alarmdotcom', AlarmcomAccessory);
};

function AlarmcomAccessory(log, config) {

  this.log = log;
  this.name = config.name;
  this.username = config.username;
  this.password = config.password;
  this.apiKey = config.apiKey;
  this.apiUsername = config.apiUsername;
  this.sessionUrl = '';

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

  this.log('getting sessionUrl');

  request.get({
    url: 'https://wrapapi.com/use/' + this.apiUsername + '/alarmdotcom/initlogin/0.0.2',
    qs: { wrapAPIKey: this.apiKey },
  }, (err, response, body) => {

    if (!err && response.statusCode === 200) {
      var json = JSON.parse(body);
      this.sessionUrl = json.data.sessionUrl;

      this.login(null, callback);
    } else {
      this.log('Error getting sessionUrl (status code %s): %s', response.statusCode, err);
      callback(err);
    }
  });
};

AlarmcomAccessory.prototype.login = function(stateToSet, callback) {

  this.log('logging in');

  request.get({
    url: 'https://wrapapi.com/use/' + this.apiUsername + '/alarmdotcom/login/0.0.2',
    qs: {
      wrapAPIKey: this.apiKey,
      sessionUrl: this.sessionUrl,
      username: this.username,
      password: this.password,
    },
  }, (err, response, body) => {

    if (!err && response.statusCode === 200) {
      var json = JSON.parse(body);
      var alarmState = json.data.alarmState;

      var statusResult = {};

      if (alarmState === 'Disarmed') {
        statusResult.message = 'disarmed';
        statusResult.status = Characteristic.SecuritySystemCurrentState.DISARMED;
      } else if (alarmState === 'Armed Stay') {
        statusResult.message = 'stay_armed';
        statusResult.status = Characteristic.SecuritySystemCurrentState.STAY_ARM;
      } else if (alarmState === 'Armed Away') {
        statusResult.message = 'away_armed';
        statusResult.status = Characteristic.SecuritySystemCurrentState.AWAY_ARM;
      }

      statusResult.success = true;

      if (stateToSet !== null) {
        this.setAlarmState(stateToSet, callback);
      } else {
        callback(null, statusResult.status);
      }
    } else {
      this.log('Error logging in (status code %s): %s', response.statusCode, err);
      callback(err);
    }
  });
};

AlarmcomAccessory.prototype.setState = function(state, callback) {

  this.log('getting sessionUrl');

  request.get({
    url: 'https://wrapapi.com/use/' + this.apiUsername + '/alarmdotcom/initlogin/0.0.2',
    qs: { wrapAPIKey: this.apiKey },
  }, (err, response, body) => {

    if (!err && response.statusCode === 200) {
      var json = JSON.parse(body);
      this.sessionUrl = json.data.sessionUrl;

      this.login(state, callback);
    } else {
      this.log('Error getting sessionUrl (status code %s): %s', response.statusCode, err);
      callback(err);
    }
  });
};

AlarmcomAccessory.prototype.setAlarmState = function(state, callback) {

  this.log('setting state to ' + alarm_status_map[state]);

  var apiVerb = '';

  // Figure out which API to call
  if (state === Characteristic.SecuritySystemTargetState.DISARM) {
    apiVerb = 'disarm';
  } else if (state === Characteristic.SecuritySystemTargetState.STAY_ARM) {
    apiVerb = 'armstay';
  } else if (state === Characteristic.SecuritySystemTargetState.AWAY_ARM) {
    apiVerb = 'armaway';
  }

  request.get({
    url: 'https://wrapapi.com/use/' + this.apiUsername + '/alarmdotcom/' + apiVerb + '/0.0.2',
    qs: {
      wrapAPIKey: this.apiKey,
      sessionUrl: this.sessionUrl,
      username: this.username,
      password: this.password,
    },
  }, (err, response, body) => {

    if (!err && response.statusCode === 200) {

      var currentState;

      if (alarm_status_map[state] === 'Disarmed') {
        currentState = Characteristic.SecuritySystemCurrentState.DISARMED;
      } else if (alarm_status_map[state] === 'Armed Stay') {
        currentState = Characteristic.SecuritySystemCurrentState.STAY_ARM;
      } else if (alarm_status_map[state] === 'Armed Away') {
        currentState = Characteristic.SecuritySystemCurrentState.AWAY_ARM;
      }

      this.log('alarm set to ' + alarm_status_map[state]);

      this.service
        .setCharacteristic(Characteristic.SecuritySystemCurrentState, currentState);

      callback(null, currentState);
    } else {
      this.log('Error getting state (status code %s): %s', response.statusCode, err);
      callback(err);
    }
  });
};

AlarmcomAccessory.prototype.getServices = function() {
  return [this.service];
};
