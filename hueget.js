// hueget.js
const packagejson = require('./package.json');
//const appname = packagejson.name;
//const version = packagejson.version;

const express = require('express');
const axios = require('axios');
const stdio = require('stdio');
const app = express();

// handle arguments
var options = stdio.getopt({
  'ip':   {key: 'i', required: true, description: 'Philips Hue bridge IP address'}, // option 0
  'key':  {key: 'k', required: true, description: 'Philips Hue API key'}, // option 1
  'port': {key: 'p', required: false, default: 3000, description: 'port number to listen on'} // option 2
  //'version': {key: 'v', required: false, description: 'display version info'}
});
const hueBridgeIpAddress = options.args[0];
const hueApiKey = options.args[1];
const port = options.args[2] || 3000;

// show version and arguments
console.log('%s v%s', packagejson.name, packagejson.version);
console.log('commands will be sent to %s with API key %s', options.args[0], options.args[1]);



// handle /lights/xx/state
// triggered by http://192.168.x.x/api/yourPhilipsHueApiKey/lights
// translates a received GET command into a PUT command
// GET: http://192.168.x.x/api/yourPhilipsHueApiKey/lights/31/state?on=true
// PUT: http://192.168.x.x/api/yourPhilipsHueApiKey/lights/31/state --data "{""on"":true}"
app.use('/api/' + hueApiKey + '/lights', (req, res) => {
  const reqUrl = req.url;

  // wrap the url parser in an error handler
  try {
    // set an error prefix to help identify errors
    var errPrefix = 'url syntax error, ';

    // get the query string parts after ?m where index [0] = left side of ?, index [1] = right side of ?
    const urlPathParts = req.url.split('/');
    if (!((urlPathParts.length == 2) || (urlPathParts.length == 3))) {
      throw errPrefix + (urlPathParts.length - 1).toString() + ' subfolders found, expecting 1 or 3: "' + req.url + '"';
    }
    if ((urlPathParts.length == 3) && (!urlPathParts[2].toLowerCase().startsWith('state?'))) { throw errPrefix + 'unknown subfolder found, expecting "state": "' + req.url + '"'; }

    // get the lightid, throw error if not a number
    const lightId = urlPathParts[1];
    if (isNaN(lightId)){ throw errPrefix + 'lightId is not a number: "' + lightId + '"';}

    // get the query parts
    const urlQueryParts = req.url.split('?'); 
    if ((urlPathParts[0].toLowerCase() == 'state') && (urlQueryParts.length != 2)) { throw errPrefix + (urlQueryParts.length - 1).toString() + ' "?" delimiters found, expecting 1: "' + req.url + '"';}

    // if a query exists, split the query part [1] into name-value pairs on &, loop and construct a json result
    var bodyObj;
    if (urlQueryParts.length > 1){
      var result = '{';
      errPrefix = 'url query syntax error, ';
      urlQueryParts[1].split('&').forEach(function(nameValuePair) {
        const pair = nameValuePair.split('=');
        if (pair.length != 2){ throw errPrefix + (pair.length - 1).toString() + ' "=" delimiters found, expecting 1: "' + nameValuePair + '"';}
        if ((pair[0] || '').length == 0){ throw errPrefix + 'pair name not found": "' + nameValuePair + '"';}
      
        var pairValue = decodeURIComponent(pair[1] || '');
        if (pairValue.length == 0){ throw errPrefix + 'pair value not found": "' + nameValuePair + '"';}

        // enclose string in "", leave boolean and number unchanged. Hue accepts: {"name":booleanOrNumber, "name":"String"}
        if ((pairValue != 'true') && (pairValue != 'false') && (isNaN(pairValue))) { pairValue = '"' + pairValue + '"'; }

        result = result + ',"' + pair[0] + '":' + pairValue;
      });
      result = result.replace('{,','{') + '}'; // clean up, add brackets
      bodyObj = JSON.parse(result);
    }


    // if a bodyObj exists, send PUT; otherwise, send a GET
    // GET http://192.168.0.101/api/yourPhilipsHueApiKey/lights/31
    // PUT http://192.168.0.101/api/yourPhilipsHueApiKey/lights/31/state --data "{""on"":true}"
    const url = 'http://' + hueBridgeIpAddress + '/api/' + hueApiKey + '/lights/' +  + lightId;
    if (bodyObj){
      console.log('sending: PUT %s %s', url + '/state', bodyObj || '');
      axios.put(url + '/state', bodyObj)
        .then(response => {
          console.log('PUT response:', response.status, response.statusText, JSON.stringify(response.data) );
          res.json(response.data);
        })
        .catch(error => {
          const errText = error.syscall + ' ' + error.code + ' ' + error.address + ':' + error.port;
          console.log('PUT error:', errText);
          res.json({ error: errText });
        });
      } else {
        console.log('sending: GET %s', url);
        axios.get(url)
          .then(response => {
            console.log('GET response:', response.status, response.statusText, JSON.stringify(response.data) );
            res.json(response.data);
          })
          .catch(error => {
            const errText = error.syscall + ' ' + error.code + ' ' + error.address + ':' + error.port;
            console.log('GET error:', errText);
            res.json({ error: errText });
          });
      }
    return;


    } catch (err) {
      // some error occured, handle it nicely
      res.json({ error: err });
      console.log('url: "' + reqUrl + '"');
      console.log('error:', err);
    }

})

// the api listener
app.listen(port, () => {
  console.log(`listening on port ${port}`);
})