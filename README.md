# hueget

[![npm](https://badgen.net/npm/dt/hueget)](https://www.npmjs.com/package/hueget)
[![npm](https://img.shields.io/npm/v/hueget)](https://www.npmjs.com/package/hueget)
[![GitHub issues](https://img.shields.io/github/issues/jsiegenthaler/hueget)](https://github.com/jsiegenthaler/hueget/issues)
[![donate](https://badgen.net/badge/donate/paypal/91BE09)](https://www.paypal.com/donate?hosted_button_id=CNEDGHRUER468)

A simple API to control Philips Hue lamps with http GET requests.
Written in September 2021.

# Background
The existing Philips Hue REST API requires a PUT request to control the Hue lights and groups. 

I needed GET, so I made a simple API to translate from GET to PUT. It also supports the standard GET command so you can use hueget for both.

hueget suports controlling lights as well as groups. A group is a collection of a number of lights, which in the Philips Hue app appears as a room.

This is my first ever API javascript program, so if you see any way it can be improved, I'd be happy to receive your suggestions.

If you like this tool, consider buying me a coffee!<br>
<a target="blank" href="https://ko-fi.com/jsiegenthaler"><img src="https://img.shields.io/badge/Ko--Fi-Buy%20me%20a%20coffee-29abe0.svg?logo=ko-fi"/></a>
            
# Creative Ways to use hueget

## Visual Door Bell
Flash your lights in the entire house when the doorbell rings. I have a Shelly1 as my doorbell. The doorbell connects to the Shelly1 SW input using a relay on the doorbell buzzer. Thus when the doorbell button is pressed, the Shelly1 sees an input, and calls a url, which flashes a group of lights for 15 seconds using the ```alert=lselect``` command. I use the Philips Hue app to determine what lights should be in the group.

## Control Hue Lights directly from Shelly Motion Sensors
Anything that can call a url when triggered - such as a Shelly Motion Sensor - can be used to turn the lights on and off again. Make sure the motion sensor calls a url to turn lights on, and a url to turn lights off. The Shelly Motion Sensor is ideal for this, as you can activate call urls for different motion triggers.

## Be Home Soon Alert
Flash lights in a room or in any group (zone, room) when someone comes home. The ```alert=lselect``` command is perfect to generate a 15 second long flash without any extra programming. Just call the URL from Apple HomeKit automations when a person arrives in your geofence.


# Installing hueget
I run hueget on my raspberry pi. To install the latest version with NPM:
```
$ sudo npm install hueget -g
```
Or for the latest beta version:
```
$ sudo npm install hueget@beta -g
```

npm installs hueget in `/usr/lib/node_modules/hueget/`.


# Starting hueget
The following examples assume you have hueget in a folder that your system can find. Update your PATH variables if needed.

To see the help text, start hueget without any arguments as follows:
```
$ node /usr/lib/node_modules/hueget/hueget.js
```

hueget shows the following response:
```
USAGE: node hueget.js [OPTION1] [OPTION2]... arg1 arg2...
The following options are supported:
  -i, --ip <ARG1>               Philips Hue bridge IP address (required)
  -u, --username <ARG1>         Philips Hue api username (required)
  -p, --port <ARG1>             port number to listen on ("3000" by default)
```  
Note that options can be entered in any order.

Example to run hueget on a raspberry pi with ip address `192.168.0.50`, default port `3000`, and with a Hue username of `UBxWZChHseyjeFwAkwgbdQ08x9XASWpanZZVg-mj`:
```
$ node /usr/lib/node_modules/hueget/hueget.js -i 192.168.0.50 -u UBxWZChHseyjeFwAkwgbdQ08x9XASWpanZZVg-mj
```
The same again, but using port `1234`:
```
$ node /usr/lib/node_modules/hueget/hueget.js -i 192.168.0.50 -u UBxWZChHseyjeFwAkwgbdQ08x9XASWpanZZVg-mj -p 1234 
```
A successful start of hueget will show:
```
hueget v1.0.0
commands will be sent to 192.168.0.50 with username UBxWZChHseyjeFwAkwgbdQ08x9XASWpanZZVg-mj
listening on port 1234
```
# Starting hueget as a Service
Ideally hueget will run all the time. You need a tool to start hueget when your system restarts. On my raspberry pi, I use [pm2](https://github.com/Unitech/pm2) (Process Management Module).
To start hueget with pm2, and have it daemonized, monitored and kept alive forever:
```
$ pm2 start hueget.js -- -i 192.168.0.50 -u UBxWZChHseyjeFwAkwgbdQ08x9XASWpanZZVg-mj -p 3000
```
Check that hueget has started:
```
$ pm2 status
```
Save the pm2 config so that hueget automatically loads when the server restarts:
```
$ pm2 save
```

Managing hueget in pm2 is straigtforward:
```
$ pm2 status
$ pm2 start hueget -- -i 192.168.0.50 -u UBxWZChHseyjeFwAkwgbdQ08x9XASWpanZZVg-mj -p 3000
$ pm2 stop hueget
$ pm2 restart hueget
$ pm2 delete hueget
```
For more information about pm2, see https://github.com/Unitech/pm2

# Getting your Philips Hue Bridge API Username
If you have [Homebridge](https://homebridge.io/), and the [homebridge-hue](https://github.com/ebaauw/homebridge-hue) plugin, look at the **users** section of the hue config. You will see the Hue bridge MAC address folowed by the Hue bridge api username
```
"users": {
  "ECB5FAFFFEFFFFFF": "yourPhilipsHueBridgeUsername"
 },
```
The username will look something like this:
```
UBxWZChHseyjeFwAkwgbdQ08x9XASWpanZZVg-mj
```

# Reading the Status of your Hue Lights or Groups with hueget
Enter a URL (in the format shown below) into your browser and press Enter. The ip address is the ip address of the device running hueget, eg: a raspberry pi.
Examples:

* Get status of light 31: http://192.168.x.x:3000/api/yourPhilipsHueBridgeUsername/lights/31
* Get status of group 2: http://192.168.x.x:3000/api/yourPhilipsHueBridgeUsername/groups/2

# Controlling your Hue Lights or Groups with hueget
Enter a URL (in the format shown below) into your browser and press Enter. The ip address is the ip address of the device running hueget, eg: a raspberry pi.
Examples:
## Lights
* Turn light 31 on: http://192.168.x.x:3000/api/yourPhilipsHueBridgeUsername/lights/31/state?on=true
* Turn light 31 off: http://192.168.x.x:3000/api/yourPhilipsHueBridgeUsername/lights/31/state?on=false
* Turn light 31 on at 50% brightness: http://192.168.x.x:3000/api/yourPhilipsHueBridgeUsername/lights/31/state?on=true&bri=50
* Turn light 31 on at 100% brightness: http://192.168.x.x:3000/api/yourPhilipsHueBridgeUsername/lights/31/state?on=true&bri=100
* Turn light 31 on at 100% brightness, 0.5,0.6 xy: http://192.168.x.x:3000/api/yourPhilipsHueBridgeUsername/lights/31/state?on=true&bri=100&xy=[0.5%2c0.6]
* Identify light 31 with a single blink: http://192.168.x.x:3000/api/yourPhilipsHueBridgeUsername/lights/31/state?alert=select
* Identify light 31 with 15 seconds of blinking: http://192.168.x.x:3000/api/yourPhilipsHueBridgeUsername/lights/31/state?alert=lselect

## Groups
* Turn group 2 on: http://192.168.x.x:3000/api/yourPhilipsHueBridgeUsername/groups/2/action?on=true
* Turn group 2 on: http://192.168.x.x:3000/api/yourPhilipsHueBridgeUsername/groups/2/action?on=false
* Turn group 2 on at 50% brightness: http://192.168.x.x:3000/api/yourPhilipsHueBridgeUsername/groups/2/action?on=true&bri=50
* Turn group 2 on at 100% brightness: http://192.168.x.x:3000/api/yourPhilipsHueBridgeUsername/groups/2/action?on=true&bri=100
* Turn group 2 on at 100% brightness, 0.5,0.6 xy: http://192.168.x.x:3000/api/yourPhilipsHueBridgeUsername/groups/2/state?on=true&bri=100&xy=[0.5%2c0.6]
* Identify group 2 with a single blink: http://192.168.x.x:3000/api/yourPhilipsHueBridgeUsername/groups/2/action?alert=select
* Identify group 2 with 15 seconds of blinking: http://192.168.x.x:3000/api/yourPhilipsHueBridgeUsername/groups/2/action?alert=lselect

Groups are collections of lights, and are used for Rooms and Zones in the Hue app.

# Supported Keywords
The API is transparent to all Philips Hue keywords. It expects all name=value pairs to be separated by a comma. If any comma is required inside a value, eg: for the xy command which expects a value array, then you must url encode the comma to %2c.

The full JSON response for a light looks like this:
```
{"1":{"state":{"on":false,"bri":198,"hue":5360,"sat":192,"effect":"none","xy":[0.5330,0.3870],"ct":500,"alert":"select","colormode":"xy","mode":"homeautomation","reachable":true},"swupdate":{"state":"noupdates","lastinstall":"2021-08-21T01:50:00"},"type":"Extended color light","name":"Standard Lamp","modelid":"LCA001","manufacturername":"Signify Netherlands B.V.","productname":"Hue color lamp","capabilities":{"certified":true,"control":{"mindimlevel":200,"maxlumen":800,"colorgamuttype":"C","colorgamut":[[0.6915,0.3083],[0.1700,0.7000],[0.1532,0.0475]],"ct":{"min":153,"max":500}},"streaming":{"renderer":true,"proxy":true}},"config":{"archetype":"floorshade","function":"mixed","direction":"omnidirectional","startup":{"mode":"safety","configured":true}},"uniqueid":"00:17:88:01:08:ff:ff:ff-0b","swversion":"1.90.1","swconfigid":"35F80D40","productid":"Philips-LCA001-4-A19ECLv6"}
```

The full JSON response for a group looks like this:
```
{"name":"Lounge","lights":["9","1","2"],"sensors":[],"type":"Room","state":{"all_on":false,"any_on":false},"recycle":false,"class":"Lounge","action":{"on":false,"bri":0,"hue":7800,"sat":138,"effect":"none","xy":[0.5302,0.392],"ct":153,"alert":"select","colormode":"xy"}}
```
The available action keywords for state or group are:
on, bri, hue, sat, effect, xy, ct, alert, colormode, mode (lights only)

## on
Turn a light on or off. On=true, Off=false.
Valid for light or group.

## bri
The brightness value to set the light to. Brightness is a scale from 1 (the minimum the light is capable of) to 254 (the maximum).

## hue
The hue value to set the light to. The hue value is a wrapping value between 0 and 65535. Both 0 and 65535 are red, 25500 is green and 46920 is blue.

## sat
Saturation of the light. 254 is the most saturated (colored) and 0 is the least saturated (white).

## effect
The dynamic effect of the light. “none” and “colorloop” are supported. Other values will generate an error of type 7. Setting the effect to colorloop will cycle through all hues using the current brightness and saturation settings.

## xy
The xy values represent x and y coordinates of a color in CIE color space. The first value is the x coordinate and the second value is the y coordinate. Both x and y must be between 0 and 1, and will be rounded to 4 decimal places by the Hue bridge, eg: 0.666666 becomes 0.6667.
If the specified coordinates are not in the CIE color space, the closest color to the coordinates will be chosen.

When sending the xy array, you **must** url encode the comma to %2c (or %2C). Here is an example for "xy":\[0.25,0.52\] :
* Set light 31 to xy of \[0.25,0.52\]: http://192.168.x.x:3000/api/yourPhilipsHueBridgeUsername/lights/31/state?xy=[0.25%2c0.52]

## ct
The [Mired](https://en.wikipedia.org/wiki/Mired) (micro reciprocal degree) color temperature of the light. Ranges from 153 (6500K) to 500 (2000K). To calculate the mired, use the formula mired = 1000000/K, where K is the desired color temperature. Example: 6500K = 153 mired, calculation 1000000/6500 = 153.8

## alert
The alert effect, this is a temporary change to the bulb’s state, and has one of the following values:
* “none” – The light is not performing an alert effect.
* “select” – The light is performing one breathe cycle.
* “lselect” – The light is performing breathe cycles for 15 seconds or until an "alert": "none" command is received.

Note that this contains the last alert sent to the light and not its current state. i.e. After the breathe cycle has finished the bridge does not reset the alert to “none“.

## colormode
Exact use unknown. Looks like it sets a color mode. Observed values are: xy

## mode
Exact use unknown. Looks like it sets an operating mode. Observed values are: homeautomation


## Further commands
See the API documentation

## API Documentation
For full details of the control capabilities, please see the [official Philips Hue API reference](https://developers.meethue.com/develop/hue-api/).
An [alternative unoffical reference](http://www.burgestrand.se/hue-api/), somewhat outdated also exists.


# Finding your Light or Group ids
You need to know the light id or the group id of the light or group you wish to control.
Go to http://192.168.x.x/api/yourPhilipsHueBridgeUsername/lights respectively http://192.168.x.x/api/yourPhilipsHueBridgeUsername/groups. You will see a JSON responce that looks like this (truncated here for brevity, only lights is shown. Groups is similar):
```
{"1":{"state":{"on":false,"bri":198,"hue":5360,"sat":192,"effect":"none","xy":[0.5330,0.3870],"ct":500," ...
```
Copy and paste the response into a text editor and format as JSON (or use an online JSON display tool). Then search for the name of the light (as shown in the Home app) in the text response, here I searched for "Desk lamp":
```
... ,"type":"Extended color light","name":"Desk lamp","modelid":"LCT012", ...
```
Go backwards in the text until you find the keyword **state**, this is at the start of the JSON text for the light. The light id is the number immediately before state. In this case, my light id is 31:
```
... ,"31":{"state":{"on":true,"bri":100,"hue":65396 ...
```

Use the same method for groups to find the group id of the room you wish to control.


