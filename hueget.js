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
    var commandParts = command.split('?'); // split on ? if exists, the put command is the first array index
    var putCommand = commandParts[0]; // the possible PUT command
    /*
    // Debug:
    console.log('commandParts[0]', commandParts[0] );
    console.log('commandParts[1]', commandParts[1] );
    console.log('resource', resource );
    console.log('id', id );
    console.log('command', command );
    console.log('putCommand', putCommand );
    */

    // throw error if resource is not supported
    // more resources added in v1.0.0
    const supportedResources = ['lights','groups','schedules','scenes','sensors','rules','resourcelinks','capabilities'];
    //console.log(JSON.stringify(supportedResources));
    //console.log(resource, supportedResources.indexOf(resource));
    if (supportedResources.indexOf(resource) < 0) {
      throw errPrefix + 'unknown resource "' + resource + '", expecting one of ' + JSON.stringify(supportedResources).replace('[', '').replace(']', '').replace('"', '') + ': "' + req.url + '"';
    }

    // get the id, throw error if not a number only for resources that need a numeric id
    const resourcesWithIdInteger = ['lights','groups','sensors','rules','schedules'];
    if (resourcesWithIdInteger.indexOf(resource) > 0) {
      if ( (isNaN((id || '')) || (id == '')) ){ throw errPrefix + 'id "' + id + '" is not an integer: "' + req.url + '"';}
    }

    // throw error if unexpected quantity of url components
    // supported quantity of url components: up to 3
    // allowed: 
    // /<resource>
    // /<resource>/<id>
    // /<resource>/<id>/command
    if ( urlPathParts.length > 4 ) {
      throw errPrefix + (urlPathParts.length - 1).toString() + ' url path components found, expecting maximum 3: "' + req.url + '"';
    }

    // DEPRECATED throw error if unexpected command DEPRECATED
    // as of 1.0.0, do not test the commands, as they vary a lot.
    // So allow the hue bridge to reject a command if incorrect.

    // throw error if unexpected quantity of ? delimiters
    // get the commandParts parts, identified by the presence of a ? delimiter, throw error if unexpected quantity of delimiters exist
    if ((commandParts.length > 1) && (commandParts.length != 2) ) { 
        throw errPrefix + (commandParts.length - 1).toString() + ' "?" delimiters found, expecting 1: "' + req.url + '"';
    }



    // if a commandParts[1] (the parameters) exists, split the parameters into name-value pairs on &, loop and construct a json result
    // the existance of a query part generates a dataObj, which determines whether a PUT or a GEt is used
    var dataObj;
    if (commandParts.length > 1){
      var result = '{';
      errPrefix = 'url query syntax error, ';
      commandParts[1].split('&').forEach(function(nameValuePair) {
        
        //console.log('nameValuePair', nameValuePair );}

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
      console.log('result', result );
      dataObj = JSON.parse(result);
    }




    // if a dataObj exists, send PUT; otherwise, send a GET
    // GET http://192.168.0.101/api/<username>/lights/31
    // PUT http://192.168.0.101/api/<username>/lights/31/state --data "{""on"":true}"
    var url = 'http://' + options.ip + '/api/' + options.username + '/' + resource;
    if (id) { url = url + '/' + id; } // add id if supplied
    


    // special handling for toggle command, this toggles a light or group state
    // lights:  http://localhost:3000/api/<username>/lights/31/toggle
    // groups:  http://localhost:3000/api/<username>/groups/0/toggle
    // sensors: http://localhost:3000/api/<username>/sensors/15/toggle
    if (command == 'toggle') {
      console.log('toggling current state')
      // Get actual state
      console.log('sending GET: %s', url);
      axios.get(url)
        .then(response => {
          // for lights   /lights/<id>   state = on      true/false
          // for groups,  /groups/<id>   state = all_on  true/false
          // for sensors, /sensors/<id>  config = on     true/false
          switch(resource) {
            case 'lights':
              console.log('GET response:', response.status, response.statusText, "state:on="+response.data["state"]["on"]  );
              state = !response.data["state"]["on"] // get the current on state , as a boolean, and invert it
              toggleCommand = 'state'
              break;
            case 'groups':
              console.log('GET response:', response.status, response.statusText, "state:all_on="+response.data["state"]["all_on"]  );
              state = !response.data["state"]["all_on"] // get the current all_on state, as a boolean, and invert it
              toggleCommand = 'action'
              break;
            case 'sensors':
              console.log('GET response:', response.status, response.statusText, "config:on="+response.data["config"]["on"]  );
              state = !response.data["config"]["on"] // get the current on state, as a boolean, and invert it
              toggleCommand = 'config'
              break;
            }
          // toggle light or group state
          // lights:  http://localhost:3000/api/<username>/lights/31/state?on=true
          // groups:  http://localhost:3000/api/<username>/groups/0/action?on=true
          // sensors: http://localhost:3000/api/<username>/sensors/15/config?on=true
          console.log('sending PUT: %s%s', url + '/' + "state?on=", state.toString() || '');
          axios.put(url + '/' + toggleCommand,'{"on":' + state.toString() + '}')
          .then(response => {
            console.log('PUT response:', response.status, response.statusText, JSON.stringify(response.data) );
            res.json(response.data);
          })
          .catch(error => {
            const errText = error.syscall + ' ' + error.code + ' ' + error.address + ':' + error.port;
            console.log('PUT error:', errText);
            res.json({ error: errText });
          });
            })
        .catch(error => {
          const errText = error.syscall + ' ' + error.code + ' ' + error.address + ':' + error.port;
          console.log('GET error:', errText);
          res.json({ error: errText });
        });


    // normal handling for non-toggle commands
    } else {    
      if (dataObj){
        console.log('sending PUT: %s %s', url + '/' + putCommand, dataObj || '');
        axios.put(url + '/' + putCommand, dataObj)
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
