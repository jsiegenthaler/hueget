// index.js

// https://learn.vonage.com/blog/2020/08/11/5-ways-to-build-a-node-js-api/

const express = require('express');
const axios = require('axios');

const app = express();
const port = process.env.PORT || 3000;

// Philips Hue config
const hueApiKey = 'UBxOGChHsexmvFwArmgbdQ08xsXZpWpanVVVg-mj';
const hueBridgeIpAddress = '192.168.0.101';


// for testing
app.get('/api/' + hueApiKey + '/lights', (req, res) => {
    res.json({ message: 'Got the lights!', received: req.url })
  })


// handle lights on/off
// triggered by http://192.168.0.101/api/UBxOGChHsexmvFwArmgbdQ08xsXZpWpanVVVg-mj/lights
// translates a received GET command into a PUT command
// GET: http://192.168.0.101/api/UBxOGChHsexmvFwArmgbdQ08xsXZpWpanVVVg-mj/lights/31/state?on=true
// PUT: http://192.168.0.101/api/UBxOGChHsexmvFwArmgbdQ08xsXZpWpanVVVg-mj/lights/31/state --data "{""on"":true}"
app.use('/api/' + hueApiKey + '/lights', (req, res) => {
    // http://192.168.0.101/api/UBxOGChHsexmvFwArmgbdQ08xsXZpWpanVVVg-mj/lights/31/state?on=true
    // http://localhost:3000/api/UBxOGChHsexmvFwArmgbdQ08xsXZpWpanVVVg-mj/lights/31/state?on=true&bri=100
    
    // get the path component immediately following lights/
    const urlPathParts = req.url.split('/');
    const lightId = urlPathParts[1];
    //const lightCommand = urlPathParts[2];
    //console.log('lightCommand:', lightCommand);
    
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
        result = result + ',"' + pair[0] + '":' + pairValue
    });
    result = result.replace('{,','{') + '}'; // clean up, add brackets


    // form a json
    const bodyObj = JSON.parse(result);


    // form a PUT request for the Hue bridge
    // PUT http://192.168.0.101/api/UBxOGChHsexmvFwArmgbdQ08xsXZpWpanVVVg-mj/lights/31/state --data "{""on"":true}"
    const url = 'http://' + hueBridgeIpAddress + '/api/' + hueApiKey + '/lights/' +  + lightId + '/state';
    console.log('sending http PUT to:', url);
    console.log('with data:', bodyObj);
    axios.put(url, bodyObj)
        .then(response => {
            console.log('response:', response.status, response.statusText, JSON.stringify(response.data) );
            res.json(response.data)
        })
        .catch(error => {
            const errText = error.syscall + ' ' + error.code + ' ' + error.address + ':' + error.port;
            console.log('error:', errText);
            res.json({ error: errText })
        });

  })

app.listen(port, () => {
  console.log(`listening on port ${port}`)
})