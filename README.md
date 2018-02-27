# homebridge-alarm.com

Alarm.com plugin for [Homebridge](https://github.com/nfarina/homebridge)

![](https://jdshkolnik.visualstudio.com/_apis/public/build/definitions/bf233995-8849-49c8-9c7a-7782303e0170/3/badge)

# Installation

1. Install homebridge: `npm install -g homebridge`
2. Install this plugin: `npm install -g homebridge-alarmdotcom`
3. Sign up for [WrapAPI](https://www.wrapapi.com)
4. Bookmark each API [documented below](#wrapapi-calls) so you can call them with your server API key
5. Update your configuration file [(see example snippet below)](#configuration)

# WrapAPI Calls

Bookmark each of the following calls on [WrapAPI](https://www.wrapapi.com). Once you do this and generate a server API key you can use to call the API.

* [initlogin](https://wrapapi.com/api/bryanbartow/alarmdotcom/initlogin/latest)
* [login](https://wrapapi.com/api/bryanbartow/alarmdotcom/login/latest)
* [getviewstate](https://wrapapi.com/api/bryanbartow/alarmdotcom/getviewstate/latest)
* [disarm](https://wrapapi.com/api/bryanbartow/alarmdotcom/disarm/latest)
* [armstay](https://wrapapi.com/api/bryanbartow/alarmdotcom/armstay/latest)
* [armaway](https://wrapapi.com/api/bryanbartow/alarmdotcom/armaway/latest)
* [locks](https://wrapapi.com/api/andrewmattie/alarmdotcom/locks/latest)
* [lock](https://wrapapi.com/api/yungsters/alarmdotcom/lock/latest)
* [unlock](https://wrapapi.com/api/yungsters/alarmdotcom/unlock/latest)
* [lights](https://wrapapi.com/api/rcaslis/alarmdotcom/lights/latest)
* [lighton](https://wrapapi.com/api/rcaslis/alarmdotcom/lighton/latest)
* [lightoff](https://wrapapi.com/api/rcaslis/alarmdotcom/lightoff/latest)

# Configuration

sample-config.json:

```json
{
  "platforms": [
    {
      "platform": "Alarmdotcom",
      "name": "Security Panel",
      "username": "test@example.com",
      "password": "testpassword",
      "apiKey": "wrapapikeygoeshere",
      "apiUsername": "wrapapiusername",
      "accessories": {
        "panel": true,
        "lights": false,
        "locks": true
      }
    }
  ]
}
```

Fields:

* "platform": Must always be "Alarmdotcom" (required)
* "name": Can be anything (required)
* "username": Alarm.com login username, same as app (required)
* "password": Alarm.com login password, same as app (required)
* "apiKey": [WrapAPI.com](http://www.wrapapi.com) Server API key for the alarmdotcom API (required)
* "apiUsername": [WrapAPI.com](http://www.wrapapi.com) username
* "accessories": Object containing a key for each supported accessory device type, whose boolean value determines whether or not the plugin will (attempt to) use the accessory

# Alarm.com Nag Screens

This plugin depends on the status screen being shown immediately after login but, occasionally, users will be nagged by a variety of screens after logging into alarm.com asking them to confirm email addresses, etc. before they are shown their system status screen. If you're getting errors, the first thing you should try is manually logging into alarm.com on your browser and dismiss / handle any tasks you're presented before the status page. The plugin will most likely work once this is finished.
