'use strict';

const nodeify = require('nodeify');
const rp = require('request-promise');

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

class AlarmcomAccessory {
  constructor(log, config) {
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
      .on('get', callback => nodeify(this.getState(), callback));

    this.service
      .getCharacteristic(Characteristic.SecuritySystemTargetState)
      .on('get', callback => nodeify(this.getState(), callback))
      .on('set', (state, callback) => nodeify(this.setState(state), callback));
  }

  getState(callback) {
    this.log('getting sessionUrl');

    return this.send('initlogin').then(json => {
      this.sessionUrl = json.data.sessionUrl;
      return this.login();
    });
  }

  login() {
    this.log('logging in');

    return this.send('login', {
      sessionUrl: this.sessionUrl,
      username: this.username,
      password: this.password,
    }).then(json => {
      switch (json.data.alarmState) {
        case 'Disarmed':
          return Characteristic.SecuritySystemCurrentState.DISARMED;
        case 'Armed Stay':
          return Characteristic.SecuritySystemCurrentState.STAY_ARM;
        case 'Armed Away':
          return Characteristic.SecuritySystemCurrentState.AWAY_ARM;
        default:
          return null;
      }
    });
  }

  setState(state) {
    this.log('getting sessionUrl');

    return this.send('initlogin').then(json => {
      this.sessionUrl = json.data.sessionUrl;
      return this.login().then(() => this.setAlarmState(state));
    });
  }

  setAlarmState(state) {
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

    this.send(apiVerb, {
      sessionUrl: this.sessionUrl,
      username: this.username,
      password: this.password,
    }).then(() => {
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

      return currentState;
    });
  }

  send(action, params) {
    return rp({
      json: true,
      qs: Object.assign({wrapAPIKey: this.apiKey}, params),
      url: `https://wrapapi.com/use/${this.apiUsername}/alarmdotcom/${action}/0.0.2`,
    }).catch(reason => {
      this.log('Error in `%s` (status code %s): %s', action, reason.response.statusCode, reason.error);
      throw reason.error;
    });
  }

  getServices() {
    return [this.service];
  }
}
