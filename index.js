'use strict';

const nodeify = require('nodeify');
const rp = require('request-promise');

module.exports = homebridge => {
  const Accessory = homebridge.platformAccessory;
  const Characteristic = homebridge.hap.Characteristic;
  const Service = homebridge.hap.Service;
  const UUIDGen = homebridge.hap.uuid;

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

  class ADCPlatform {
     constructor(log, config) {
       this.api = new ADCWrapAPI(log, config);
       this.log = log;
       this.name = config.name;
     }

    accessories(callback) {
      callback([
        new ADCSecuritySystemAccessory(this, this.name),
      ]);
    }
  }

  class ADCSecuritySystemAccessory extends Accessory {
    constructor(platform, name) {
      const displayName = `Alarm.com ${name}`;
      const uuid = UUIDGen.generate('alarmdotcom.security-system');
      super(displayName, uuid);

      // Homebridge reqiures these.
      this.name = displayName;
      this.uuid_base = uuid;

      this.api = platform.api;
      this.log = platform.log;

      this.addService(new Service.SecuritySystem(name));

      this.getService(Service.SecuritySystem)
        .getCharacteristic(Characteristic.SecuritySystemCurrentState)
        .on('get', callback => nodeify(this.getState(), callback));

      this.getService(Service.SecuritySystem)
        .getCharacteristic(Characteristic.SecuritySystemTargetState)
        .on('get', callback => nodeify(this.getState(), callback))
        .on('set', (state, callback) => nodeify(this.setState(state), callback));
    }

    getState() {
      return this.api.login().then(session => session.currentState);
    }

    setState(targetState) {
      return this.api.login().then(session => {
        const targetStateConfig = TargetStateConfiguration[targetState];
        this.log(`Setting security system to \`${targetStateConfig.name}\`.`);

        return session.send(targetStateConfig.apiVerb).then(() => {
          this.getService(Service.SecuritySystem).setCharacteristic(
            Characteristic.SecuritySystemCurrentState,
            targetStateConfig.currentState
          );
        });
      });
    }

    getServices() {
      return this.services;
    }
  }

  class ADCWrapAPI {
    constructor(log, config) {
      this.log = log;
      this.config = config;
    }

    login() {
      return this.send('initlogin').then(json => {
        const sessionParams = {
          sessionUrl: json.data.sessionUrl,
          username: this.config.username,
          password: this.config.password,
        };
        return this.send('login', sessionParams).then(json => {
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
            currentState,
            send: action => this.send(action, sessionParams),
          };
        });
      });
    }

    send(action, params) {
      return rp({
        json: true,
        qs: Object.assign({wrapAPIKey: this.config.apiKey}, params),
        url: `https://wrapapi.com/use/${this.config.apiUsername}/alarmdotcom/${action}/0.0.3`,
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
  }

  homebridge.registerPlatform('homebridge-alarmdotcom', 'Alarmdotcom', ADCPlatform);
};
