# homebridge-alarm.com
Alarm.com plugin for [Homebridge](https://github.com/nfarina/homebridge)

# Installation
1. Install homebridge using: npm install -g homebridge
2. Install this plugin using: npm install -g homebridge-alarm.com
3. Install PhantomJS using: npm install -g phantomjs
4. Update your configuration file. See sample-config.json snippet below. 

# Configuration

Configuration sample:

 ```
{
  "accessories": [
    {
        "accessory": "Alarm.com",
        "name": "Security Panel",
        "username": "test@example.com",
        "password": "testpassword"
    }
  ]
},

```

Fields: 

* "accessory": Must always be "Alarm.com" (required)
* "name": Can be anything (required)
* "username": Alarm.com login username, same as app (required)
* "password": Alarm.com login password, same as app (required)

# Alarm.com Nag Screens

Occassionally, after logging into alarm.com, users will be shown a variety of screens asking them to confirm email addresses, etc. before they are shown their system status screen. The plugin depends on the status screen being shown immediately after login. If you see the following message in your console:

```
Logged in to alarm.com

/usr/local/lib/node_modules/homebridge-alarmdotcom/node_modules/selenium-webdriver/lib/goog/async/nexttick.js:41

goog.global.setTimeout(function() { throw exception; }, 0);
```

Try manually logging into alarm.com on your browser and dismiss / handle any tasks you're presented before the status page. The plugin will most likely work once this is finished.
