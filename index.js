'use strict';

const nodeify = require('nodeify');
const rp = require('request-promise');

module.exports = homebridge => {
  const Characteristic = homebridge.hap.Characteristic;
  const Service = homebridge.hap.Service;

  const TargetStateConfiguration = {
    [Characteristic.SecuritySystemTargetState.STAY_ARM]: {
      apiVerb: 'armstay',
      currentState: Characteristic.SecuritySystemCurrentState.STAY_ARM,
      name: 'Armed Stay',
    },
    [Characteristic.SecuritySystemTargetState.AWAY_ARM]: {
      apiVerb: 'armaway',
      currentState: Characteristic.SecuritySystemCurrentState.AWAY_ARM,
      name: 'Armed Away',
    },
    [Characteristic.SecuritySystemTargetState.NIGHT_ARM]: {
      apiVerb: '', // TODO: Create a WrapAPI verb for this.
      currentState: Characteristic.SecuritySystemCurrentState.NIGHT_ARM,
      name: 'Armed Night',
    },
    [Characteristic.SecuritySystemTargetState.DISARM]: {
      apiVerb: 'disarm',
      currentState: Characteristic.SecuritySystemCurrentState.DISARMED,
      name: 'Disarmed',
    },
  };

  class AlarmcomAccessory {
    constructor(log, config) {
      this.log = log;
      this.name = config.name;
      this.username = config.username;
      this.password = config.password;
      this.apiKey = config.apiKey;
      this.apiUsername = config.apiUsername;

      this.service = new Service.SecuritySystem(this.name);

      this.service
        .getCharacteristic(Characteristic.SecuritySystemCurrentState)
        .on('get', callback => nodeify(this.getState(), callback));

      this.service
        .getCharacteristic(Characteristic.SecuritySystemTargetState)
        .on('get', callback => nodeify(this.getState(), callback))
        .on('set', (state, callback) => nodeify(this.setState(state), callback));
    }

    getState() {
      return this.login().then(result => result.currentState);
    }

    setState(targetState) {
      return this.login().then(result => {
        const targetStateConfig = TargetStateConfiguration[targetState];

        this.log('Setting state to `%s`.', targetStateConfig.name);

        return this.send(targetStateConfig.apiVerb, {
          sessionUrl: result.sessionUrl,
          username: this.username,
          password: this.password,
        }).then(() => {
          this.log(`Alarm set to \`${targetStateConfig.name}\`.`);

          const currentState = targetStateConfig.currentState;

          this.service.setCharacteristic(
            Characteristic.SecuritySystemCurrentState,
            currentState
          );

          return currentState;
        });
      });
    }

    login() {
      this.log('Getting `sessionUrl`.');

      return this.send('initlogin').then(json => {
        const sessionUrl = json.data.sessionUrl;

        this.log('Logging in.');

        return this.send('login', {
          sessionUrl,
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
        }).then(currentState => {
          return {
            sessionUrl,
            currentState,
          };
        });
      });
    }

    send(action, params) {
      return rp({
        json: true,
        qs: Object.assign({wrapAPIKey: this.apiKey}, params),
        url: `https://wrapapi.com/use/${this.apiUsername}/alarmdotcom/${action}/0.0.2`,
      }).catch(reason => {
        this.log(
          'Error in `%s` (status code %s): %s',
          action,
          reason.response.statusCode,
          reason.error
        );
        throw reason.error;
      });
    }

    getServices() {
      return [this.service];
    }
  }

  homebridge.registerAccessory('homebridge-alarmdotcom', 'Alarmdotcom', AlarmcomAccessory);
};
