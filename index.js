'use strict';

const nodeify = require('nodeify');
const rp = require('request-promise');

module.exports = homebridge => {
  const Accessory = homebridge.platformAccessory;
  const Characteristic = homebridge.hap.Characteristic;
  const Service = homebridge.hap.Service;
  const UUIDGen = homebridge.hap.uuid;

  const TargetLightbulbOn = {
    [true]: {
      apiVerb: 'lighton/0.1.0',
      currentState: true,
      name: 'On',
    },
    [false]: {
      apiVerb: 'lightoff/0.1.2',
      currentState: false,
      name: 'Off',
    },
  };

  const TargetLockStateConfig = {
    [Characteristic.LockTargetState.UNSECURED]: {
      apiVerb: 'unlock/0.1.0',
      currentState: Characteristic.LockCurrentState.UNSECURED,
      name: 'Unlocked',
    },
    [Characteristic.LockTargetState.SECURED]: {
      apiVerb: 'lock/0.1.0',
      currentState: Characteristic.LockCurrentState.SECURED,
      name: 'Locked',
    },
  };

  const TargetSecuritySystemStateConfig = {
    [Characteristic.SecuritySystemTargetState.STAY_ARM]: {
      apiVerb: 'armstay/0.1.0',
      currentState: Characteristic.SecuritySystemCurrentState.STAY_ARM,
      name: 'Armed Stay',
    },
    [Characteristic.SecuritySystemTargetState.AWAY_ARM]: {
      apiVerb: 'armaway/0.1.0',
      currentState: Characteristic.SecuritySystemCurrentState.AWAY_ARM,
      name: 'Armed Away',
    },
    [Characteristic.SecuritySystemTargetState.NIGHT_ARM]: { 
      apiVerb: 'armstay/0.1.0',
      currentState: Characteristic.SecuritySystemCurrentState.NIGHT_ARM, 
      name: 'Armed Night', 
    }, 
    [Characteristic.SecuritySystemTargetState.DISARM]: {
      apiVerb: 'disarm/0.1.0',
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
      Promise.all([
        this.getSecuritySystemAccessories(),
        this.getLightAccessories(),
        this.getLockAccessories(),
      ]).then(
        results => {
          callback(Array.prototype.concat.apply([], results));
        },
        error => {
          this.log('Error while registering accessories: %s', error);
          callback([]);
        }
      );
    }

    getSecuritySystemAccessories() {
      return Promise.resolve([new ADCSecuritySystemAccessory(this, this.name)]);
    }

    getLockAccessories() {
      return this.api.login()
        .then(session => session.send('locks/0.1.1'))
        .then(json => json.data.locks.map(
          lock => new ADCLockAccessory(this, lock)
        ))
        .catch(error => {
          this.log('Error while getting lock devices: %s', error);
          return [];
        });
    }

    getLightAccessories() {
      return this.api.login()
        .then(session => session.send('lights/0.1.1'))
        .then(json => json.data.lights.map(
          light => new ADCLightAccessory(this, light)
        ))
        .catch(error => {
          this.log('Error while getting light devices: %s', error);
          return [];
        });
    }


  }

  class ADCAccessory extends Accessory {
    constructor(platform, name, type) {
      const displayName = `Alarm.com ${name}`;
      const uuid = UUIDGen.generate(`alarmdotcom.${type}`);
      super(displayName, uuid);

      // Homebridge requires these.
      this.name = displayName;
      this.uuid_base = uuid;

      this.api = platform.api;
      this.log = platform.log;
    }

    getServices() {
      return this.services;
    }
  }

  class ADCLightAccessory extends ADCAccessory {
    constructor(platform, config) {
      super(platform, config.name, `light.${config.id}`);

      this.config = config;

      this.addService(new Service.Lightbulb(config.name));

     this.getService(Service.Lightbulb)
        .getCharacteristic(Characteristic.On)
        .on('get', callback => nodeify(this.getState(), callback));

      this.getService(Service.Lightbulb)
        .getCharacteristic(Characteristic.On)
       .on('set', (state, callback) => nodeify(this.setState(state), callback));

    }

    getState() {
        this.log(`Getting device ${this.config.name},${this.config.id}`);
      return this.api.login()
        .then(session => session.read('lights/0.1.1', null, 5000));
    }


    setState(targetState) {
      return this.api.login().then(session => {
        const lightStateConfig = TargetLightbulbOn[targetState];

	if ( this.config.currentState != targetState ) {
        this.log(`Setting device ${this.config.name},${this.config.id} to \`${targetState}\``);
        return session.send(lightStateConfig.apiVerb, {
          device_id: this.config.id,
        }).then(() => {
          session.invalidate('lights/0.1.1');
	this.config.currentState = targetState;
          this.getService(Service.Lightbulb).setCharacteristic(
            Characteristic.On, targetState
          );
        }); }
      });
    }
  }

  class ADCLockAccessory extends ADCAccessory {
    constructor(platform, config) {
      super(platform, config.name, `lock.${config.id}`);

      this.config = config;

      this.addService(new Service.LockMechanism(config.name));

      this.getService(Service.LockMechanism)
        .getCharacteristic(Characteristic.LockCurrentState)
        .on('get', callback => nodeify(this.getState(), callback));

      this.getService(Service.LockMechanism)
        .getCharacteristic(Characteristic.LockTargetState)
        .on('get', callback => nodeify(this.getState(), callback))
        .on('set', (state, callback) => nodeify(this.setState(state), callback));
    }

    getState() {
      return this.api.login()
        .then(session => session.read('locks/0.1.1', null, 5000))
        .then(json => {
          const lock = json.data.locks.find(
            config => config.id === this.config.id
          );
          if (!lock) {
            // TODO: Update Homebridge state as unreachable.
            throw Characteristic.LockCurrentState.UNKNOWN;
          }
          switch (lock.status) {
            case 'Locked':
              return Characteristic.LockCurrentState.SECURED;
            case 'Unlocked':
              return Characteristic.LockCurrentState.UNSECURED;
            default:
              return Characteristic.LockCurrentState.UNKNOWN;
          }
        });
    }

    setState(targetState) {
      return this.api.login().then(session => {
        const targetStateConfig = TargetLockStateConfig[targetState];
        this.log(`Setting device ${this.config.id} to \`${targetStateConfig.name}\`.`);

        return session.send(targetStateConfig.apiVerb, {
          deviceId: this.config.id,
        }).then(() => {
          session.invalidate('locks/0.1.1');
          this.getService(Service.LockMechanism).setCharacteristic(
            Characteristic.LockCurrentState,
            targetStateConfig.currentState
          );
        });
      });
    }
  }

  class ADCSecuritySystemAccessory extends ADCAccessory {
    constructor(platform, name) {
      super(platform, name, 'security-system');

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
        const targetStateConfig = TargetSecuritySystemStateConfig[targetState];
        this.log(`Setting security system to \`${targetStateConfig.name}\`.`);

        return session.send(targetStateConfig.apiVerb).then(() => {
          this.getService(Service.SecuritySystem).setCharacteristic(
            Characteristic.SecuritySystemCurrentState,
            targetStateConfig.currentState
          );
        });
      });
    }
  }

  class ADCWrapAPI {
    static createCacheKey(action, params) {
      return JSON.stringify(action, params || {});
    }

    constructor(log, config) {
      this.log = log;
      this.cache = new Map();
      this.config = config;
      this.currentSession = null;
    }

    login() {
      if (!this.currentSession) {
        const session = this.send('initlogin/0.0.4').then(json => {
          const sessionUrl = json.data.sessionUrl;
          return this.send('getviewstate/0.1.2', {
            sessionUrl,
            username: this.config.username,
            password: this.config.password,
          }).then(json => {
						var viewState = json.data.viewState;
						var viewStateGenerator = json.data.viewStateGenerator
						var eventValidation = json.data.eventValidation;
						return this.send('login/0.1.2', {
            	sessionUrl,
            	username: this.config.username,
            	password: this.config.password,
							viewState: viewState,
							viewStateGenerator: viewStateGenerator,
							eventValidation: eventValidation
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
              currentState,
              read: (action, params, ttl) => (
                this.read(action, Object.assign({sessionUrl}, params), ttl)
              ),
              send: (action, params) => (
                this.send(action, Object.assign({sessionUrl}, params))
              ),
              invalidate: (action, params) => (
                this.invalidate(action, Object.assign({sessionUrl}, params))
              ),
            };
          });
        });

        // TODO: Replace session expiration with invalidation, see #13.
        const onExpire = () => {
          if (this.currentSession === session) {
            this.currentSession = null;
          }
        };
        session
          .then(() => new Promise(resolve => setTimeout(resolve, 60000)))
          .then(onExpire, onExpire);
        this.currentSession = session;
      }
      return this.currentSession;
    }

    /**
     * If a cached response exists, returns it. Otherwise, sends a request and
     * caches the response for the supplied `ttl` (milliseconds).
     */
    read(action, params, ttl) {
      const cacheKey = ADCWrapAPI.createCacheKey(action, params);
      if (!this.cache.has(cacheKey)) {
        const response = this.send(action, params);

        const onExpire = () => {
          if (this.cache.get(cacheKey) === response) {
            this.cache.delete(cacheKey);
          }
        };
        response
          .then(() => new Promise(resolve => setTimeout(resolve, ttl)))
          .then(onExpire, onExpire);
        this.cache.set(cacheKey, response);
      }
      return this.cache.get(cacheKey);
    }

    /**
     * Sends a request without the use of any cache. This should be used for any
     * commands that mutate server state.
     */
    send(action, params) {
      if (!action.match(/^\w+\/\d+\.\d+\.\d+$/)) {
        throw new Error(`Invalid \`action\` supplied: ${action}`);
      }
      const apiPath = `${this.config.apiUsername}/alarmdotcom/${action}`;
      return rp({
        json: true,
        qs: Object.assign({wrapAPIKey: this.config.apiKey}, params),
        url: `https://wrapapi.com/use/${apiPath}`,
      }).then(
        json => {
          if (!json.success) {
            const errorMessage =
              `Request \`${apiPath}\` was unsuccessful:\n` +
              json.messages.map(message => ' - ' + message).join('\n');
            this.log(errorMessage);
            throw new Error(errorMessage);
          }
          return json;
        },
        reason => {
          this.log(
            'Error in `%s` (status code %s): %s',
            apiPath,
            reason.response.statusCode,
            reason.error
          );
          throw reason.error;
        }
      );
    }

    invalidate(action, params) {
      this.cache.delete(ADCWrapAPI.createCacheKey(action, params));
    }
  }

  homebridge.registerPlatform('homebridge-alarmdotcom', 'Alarmdotcom', ADCPlatform);
};
