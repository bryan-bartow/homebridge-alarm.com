# homebridge-alarm.com
Alarm.com plugin for [Homebridge](https://github.com/nfarina/homebridge)

# Installation
1. Install homebridge using: npm install -g homebridge
2. Install this plugin using: npm install -g homebridge-alarm.com
3. Update your configuration file. See sample-config.json snippet below. 

# Configuration

Configuration sample:

 ```
{
  "accessories": [
    {
        "accessory": "Alarm.com",
        "name": "Security Panel",
        "username": "test@example.com",
        "password": "<your alarm.com password>"
    }
  ]
},

```

Fields: 

* "accessory": Must always be "Alarm.com" (required)
* "name": Can be anything (required)
* "username": Alarm.com login username, same as app (required)
* "password": Alarm.com login password, same as app (required)

