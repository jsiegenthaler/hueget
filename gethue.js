// gethue.js
const version = '0.1.0-beta.1';

const express = require('express');
const axios = require('axios');
const stdio = require('stdio');
const app = express();

// handle arguments
var options = stdio.getopt({
  'ip':   {key: 'i', required: true,  description: 'Philips Hue bridge IP address'}, // option 0
  'key':  {key: 'k', required: true,  description: 'Philips Hue API key'}, // option 1
  'port': {key: 'p', required: false, description: 'port number to listen on (default 3000)'} // option 2
});
const hueBridgeIpAddress = options.args[0];
const hueApiKey = options.args[1];
const port = options.args[2] || 3000;
  

// handle /lights/xx/state
// triggered by http://192.168.0.101/api/yourPhilipsHueApiKey/lights
// translates a received GET command into a PUT command
// GET: http://192.168.0.101/api/yourPhilipsHueApiKey/lights/31/state?on=true
// PUT: http://192.168.0.101/api/yourPhilipsHueApiKey/lights/31/state --data "{""on"":true}"
app.use('/api/' + hueApiKey + '/lights', (req, res) => {
    
    // get the path component immediately following lights/
    const urlPathParts = req.url.split('/');
    const lightId = urlPathParts[1];
    
    // get the query string parts after ?
    // [0] = left side of ?, [1] = right side of ?
    const urlQueryParts = req.url.split('?'); 

    // split the query part [1] into name-value pairs on &, loop and process
    var result = '{';
    urlQueryParts[1].split('&').forEach(function(pair) {
        pair = pair.split('=');
        var pairValue = decodeURIComponent(pair[1] || '');

        // enclose string in "", leave boolean and number unchanged
        if ((pairValue != 'true') && (pairValue != 'false') && (isNaN(pairValue))) {
          pairValue = '"' + pairValue + '"';
        }
        // Hue accepts: {"name":booleanOrNumber, "name":"String"}
        result = result + ',"' + pair[0] + '":' + pairValue;
    });
    result = result.replace('{,','{') + '}'; // clean up, add brackets


    // form a json
    const bodyObj = JSON.parse(result);


    // form a PUT request for the Hue bridge
    // PUT http://192.168.0.101/api/yourPhilipsHueApiKey/lights/31/state --data "{""on"":true}"
    const url = 'http://' + hueBridgeIpAddress + '/api/' + hueApiKey + '/lights/' +  + lightId + '/state';
    console.log('sending http PUT to:', url);
    console.log('with data:', bodyObj);
    axios.put(url, bodyObj)
        .then(response => {
            console.log('response:', response.status, response.statusText, JSON.stringify(response.data) );
            res.json(response.data);
        })
        .catch(error => {
            const errText = error.syscall + ' ' + error.code + ' ' + error.address + ':' + error.port;
            console.log('error:', errText);
            res.json({ error: errText });
        });

  })

app.listen(port, () => {
  console.log('gethue v%s', version);
  console.log('commands will be sent to %s with API key %s', options.args[0], options.args[1]);
  //console.log('using api key', options.args[1]);
  console.log(`listening on port ${port}`);
})