# homebridge-alarm.com

Alarm.com plugin for [Homebridge](https://github.com/nfarina/homebridge)

# Installation

1. Install homebridge using: `npm install -g homebridge`
2. Install this plugin using: `npm install -g homebridge-alarmdotcom`
3. Sign up for an account on [WrapAPI](https://www.wrapapi.com)
4. Once you have a [WrapAPI](https://www.wrapapi.com) account, bookmark each one of API calls documented below so you can call them with your server API key.
5. Update your configuration file. See sample-config.json snippet below.

# WrapAPI Calls

Bookmark each of the following calls on [WrapAPI](https://www.wrapapi.com). Once you do this and generate a server API key you can call the API

* [initlogin](https://wrapapi.com/#/view/bryanbartow/alarmdotcom/initlogin/latest)
* [login](https://wrapapi.com/#/view/bryanbartow/alarmdotcom/login/latest)
* [getviewstate](https://wrapapi.com/#/view/bryanbartow/alarmdotcom/getviewstate/latest)
* [disarm](https://wrapapi.com/#/view/bryanbartow/alarmdotcom/disarm/latest)
* [armstay](https://wrapapi.com/#/view/bryanbartow/alarmdotcom/armstay/latest)
* [armaway](https://wrapapi.com/#/view/bryanbartow/alarmdotcom/armaway/latest)
* [locks](https://wrapapi.com/#/view/andrewmattie/alarmdotcom/locks/latest)
* [lock](https://wrapapi.com/#/view/yungsters/alarmdotcom/lock/latest)
* [unlock](https://wrapapi.com/#/view/yungsters/alarmdotcom/unlock/latest)
* [lights](https://wrapapi.com/#/view/rcaslis/alarmdotcom/lights/latest)
* [lighton](https://wrapapi.com/#/view/rcaslis/alarmdotcom/lighton/latest)
* [lightoff](https://wrapapi.com/#/view/rcaslis/alarmdotcom/lightoff/latest)

# Configuration

Configuration sample:

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
* "accessories": Object containing a key for each supported accessory device type, whose Boolean value determines whether or not the plugin will (attempt to) use the accessory

# Alarm.com Nag Screens

Occassionally, after logging into alarm.com, users will be shown a variety of screens asking them to confirm email addresses, etc. before they are shown their system status screen. The plugin depends on the status screen being shown immediately after login. If you're getting errors, the first thing you should try is manually logging into alarm.com on your browser and dismiss / handle any tasks you're presented before the status page. The plugin will most likely work once this is finished.
