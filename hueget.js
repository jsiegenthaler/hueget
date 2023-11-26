// hueget.js
const packagejson = require('./package.json');
//const appname = packagejson.name;
//const version = packagejson.version;

const axios = require('axios');
const stdio = require('stdio');

// for the http server
const express = require('express');
const http = require('http');
const app = express();
const server = http.createServer(app);



// get startup arguments
var options = stdio.getopt({
  ip: { key: 'i', description: 'Philips Hue bridge IP address', args: 1, required: true },
  username: { key: 'u', description: 'Philips Hue api username', args: 1, required: true },
  port: { key: 'p', description: 'port number to listen on', args: 1, required: false, default: 3000 }
});
//console.log('%s options', packagejson.name, options);

// show version and arguments
console.log('%s v%s', packagejson.name, packagejson.version);
console.log('commands will be sent to %s with username %s', options.ip, options.username);


// add an error handler event to the server
server.on('error', function (err) {
  // some error occured, show it
  console.log('error:', err.code, err.syscall, err.address, err.port);
});



// handle 
// api/<username>/lights/<id>/state
// api/<username>/groups/<id>/action 
// triggered by http://192.168.x.x/api/<username>/lights
// translates a received GET command into a PUT command
// GET: http://192.168.x.x/api/<username>/lights/31/state?on=true
// PUT: http://192.168.x.x/api/<username>/lights/31/state --data "{""on"":true}"
app.use('/api/' + options.username, (req, res) => {
  const reqUrl = req.url;
  console.log('parsing url:', reqUrl);

  // wrap the url parser in an error handler
  try {
    // set an error prefix to help identify errors
    var errPrefix = 'url syntax error, ';


    // get the query string parts after ?m where index [0] = left side of ?, index [1] = right side of ?
    // subfolders expected: lights: 1 or 3; groups: 1 or 3
    const urlPathParts = req.url.split('/');
    //console.log('urlPathParts.length', urlPathParts.length );

    // get components of url, in format resource/id/command
    const resource  = (urlPathParts[1] || '').toLowerCase(); 
    const id  = urlPathParts[2]; 
    const command  = (urlPathParts[3] || '').toLowerCase(); 
    //console.log('resource', resource );
    //console.log('id', id );
    //console.log('command', command );

    // throw error if resource is not supported
    if ( !((resource  == 'lights') || (resource  == 'groups')) ) {
      throw errPrefix + 'unknown resource "' + resource + '", expecting "lights" or "groups": "' + req.url + '"';
    }

    // get the id, throw error if not a number
    if ( (isNaN((id || '')) || (id == '')) ){ throw errPrefix + 'id "' + id + '" is not an integer: "' + req.url + '"';}

    // throw error if unexpected quantity of url components
    // allowed: 
    // /<resource>
    // /<resource>/<id>
    // /<resource>/<id>/command
    if ( urlPathParts.length > 4 ) {
      throw errPrefix + (urlPathParts.length - 1).toString() + ' url path components found, expecting maximum 3: "' + req.url + '"';
    }

    // throw error if unexpected command
    // for lights  /lights/<id>/state  expectedCommand = state or nothing
    // for groups, /groups/<id>/action expectedCommand = action or nothing
    var expectedCommand;
    if (urlPathParts.length > 3) {
      switch(resource) {
        case 'lights':
          expectedCommand = 'state'
          break;
        case 'groups':
          expectedCommand = 'action'
          break;
      }
      //console.log('expectedCommand', expectedCommand );
      if (!command.startsWith(expectedCommand)) { throw errPrefix + 'unknown command "' + command + '", expecting "' + expectedCommand + '": "' + req.url + '"'; }
      if (!command.includes(expectedCommand + '?')) { throw errPrefix + 'query character "?" missing in "' + command + '", expecting "' + expectedCommand + '?<query>": "' + req.url + '"'; }
      if (command.endsWith(expectedCommand + '?')) { throw errPrefix + 'query missing in "' + command + '", expecting "' + expectedCommand + '?<query>": "' + req.url + '"'; }
    }


    // get the query parts, throw error if unexpected quantity
    const urlQueryParts = req.url.split('?'); 
    if ( (urlPathParts[0].toLowerCase() == expectedCommand) && (urlQueryParts.length != 2) ) { 
      throw errPrefix + (urlQueryParts.length - 1).toString() + ' "?" delimiters found, expecting 1: "' + req.url + '"';
    }



    // if a query exists, split the query part [1] into name-value pairs on &, loop and construct a json result
    var dataObj;
    if (urlQueryParts.length > 1){
      var result = '{';
      errPrefix = 'url query syntax error, ';
      urlQueryParts[1].split('&').forEach(function(nameValuePair) {
        
        //console.log('nameValuePair', nameValuePair );

        const pair = nameValuePair.split('=');
        if (pair.length != 2){ throw errPrefix + (pair.length - 1).toString() + ' "=" delimiters found, expecting 1: "' + nameValuePair + '"';}
        if ((pair[0] || '').length == 0){ throw errPrefix + 'pair name not found": "' + nameValuePair + '"';}
      
        var pairValue = decodeURIComponent(pair[1] || '');
        //console.log('pairValue', pairValue );
        if (pairValue.length == 0){ throw errPrefix + 'pair value not found": "' + nameValuePair + '"';}

        // enclose string in "", leave boolean and number unchanged. Hue accepts: {"name":booleanOrNumber, "name":"String"}
        if (
          (pairValue != 'true') && (pairValue != 'false') && (isNaN(pairValue))
          && (!pairValue.startsWith('[')) && (!pairValue.endsWith(']')) // for xy arrays
          ) { pairValue = '"' + pairValue + '"'; 
        }

        result = result + ',"' + pair[0] + '":' + pairValue;
      });
      result = result.replace('{,','{') + '}'; // clean up, add brackets
      //console.log('result', result );
      dataObj = JSON.parse(result);
    }


    // if a dataObj exists, send PUT; otherwise, send a GET
    // GET http://192.168.0.101/api/<username>/lights/31
    // PUT http://192.168.0.101/api/<username>/lights/31/state --data "{""on"":true}"
    var url = 'http://' + options.ip + '/api/' + options.username + '/' + resource;
    if (id) { url = url + '/' + id; } // add id if supplied
    if (dataObj){
      console.log('sending PUT: %s %s', url + '/' + expectedCommand, dataObj || '');
      axios.put(url + '/' + expectedCommand, dataObj)
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
        console.log('sending GET: %s', url);
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
server.listen(options.port, () => {
  console.log(`listening on port ${options.port}`);
})
