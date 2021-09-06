# gethue
A simple API to control Philips Hue lamps with http GET requests

# Background
I wanted to control my Philips Hue with a simple http request, that I could send from Shelly devices. the existing Hue REST API required a PUT request to control the lights. 
I needed GET, so I made a simple API to translate from GET to PUT.

# Getting your Philips Hue API Key
If you have Homebridge, and the homebridge-hue plugin, look at the 
"users": {
  "ECB5FAFFFEFFFFFF": "yourPhilipshueApiKey"
 },
            
# Syntax
Enter the following URL into your browser and plress Enter. 

Turn light 31 on: http://192.168.x.x:3000/api/yourPhilipshueApiKey/lights/31/state?on=true
Turn light 31 off: http://192.168.x.x:3000/api/yourPhilipshueApiKey/lights/31/state?on=false

Turn light 31 on at 50% brightness: http://192.168.x.x:3000/api/yourPhilipshueApiKey/lights/31/state?on=true&bri=50
Turn light 31 on at 100% brightness: http://192.168.x.x:3000/api/yourPhilipshueApiKey/lights/31/state?on=true&bri=100

