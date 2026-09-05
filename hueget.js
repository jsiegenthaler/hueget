// hueget.js

// ============ Configuration ============ 
const CONFIG = { 
    SUPPORTED_RESOURCES: [ 'lights', 'groups', 'schedules', 'scenes', 'sensors', 'rules', 'resourcelinks', 'capabilities' ], 
    RESOURCES_WITH_NUMERIC_ID: [ 'lights', 'groups', 'sensors', 'rules', 'schedules' ]
}; 
Object.freeze(CONFIG); // Prevent modification


// mis requires
const packagejson = require('./package.json');
const axios = require('axios');
const stdio = require('stdio');

// for the http server
const express = require('express');
const http = require('http');
const app = express();
const server = http.createServer(app);

// get startup arguments
let options = stdio.getopt({
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



// helper function to get state and toggle
function getToggleState(resource, data) {
  /*
  console.log('getToggleState: resource', resource);
  console.log('getToggleState: data.state', data.state);
  console.log('getToggleState: data.state.on', data.state.on);
  console.log('getToggleState: data.state.all_on', data.state.all_on);
  console.log('getToggleState: data.config.all_on', data.config?.on);
  */
  // state json nodes are not always present, so use optional chaining with ? after the name to avoid throwing errors
  const stateMap = {
    lights: { 
      newStateCommand: 'state', 
      currStateCommand: 'state',
      stateName: 'on',
      state: !data.state?.on
    },
    groups: { 
      newStateCommand: 'action',
      currStateCommand: 'state',
      stateName: 'all_on',
      state: !(data.state?.all_on)
    },
    sensors: { 
      newStateCommand: 'config',
      currStateCommand: 'config',
      stateName: 'on',
      state: !data.config?.on
    }
  };
  
  //console.log('getToggleState: stateMap', stateMap);
  const result = stateMap[resource];
  if (!result) {
    throw new Error(`Unsupported resource for toggle: ${resource}`);
  }
  //console.log('getToggleState: returning result', result);
  
  return { 
    toggleCommand: result.newStateCommand,
    currStateCommand: result.currStateCommand,
    stateName: result.stateName, 
    state: result.state 
  };
}



// handle axios errors
function handleAxiosError(error, res, operation = 'request') {
  console.log('handleAxiosError: error', error);
  let errText;
  
  if (error.isAxiosError) {
    // Axios reported an error
    errText = `HTTP ${error.cause}`;
  } else if (error.response) {
    // Server responded with error status
    errText = `HTTP ${error.response.status}: ${error.response.statusText}`;
  } else if (error.request) {
    // Request made but no response
    errText = `${error.syscall} ${error.code} ${error.address}:${error.port}`;
  } else {
    // Something else went wrong
    errText = error.message;
  }
  
  console.error(`${operation} error:`, errText);
  res.status(error.response?.status || 500).json({ error: errText });
}



// ============ Main App ============ 
// main app
// handle 
// api/<username>/lights/<id>/state
// api/<username>/groups/<id>/action 
// triggered by http://192.168.x.x/api/<username>/lights
// translates a received GET command into a PUT command
// GET: http://192.168.x.x/api/<username>/lights/31/state?on=true
// PUT: http://192.168.x.x/api/<username>/lights/31/state --data "{""on"":true}"
// change to async
app.use('/api/' + options.username, async (req, res) => {
  const reqUrl = req.url;
  console.log('parsing url:', reqUrl);

  // wrap the url parser in an error handler
  try {
    // set an error prefix to help identify errors
    let errPrefix = 'url syntax error, ';


    // get the query string parts after ?m where index [0] = left side of ?, index [1] = right side of ?
    // subfolders expected: lights: 1 or 3; groups: 1 or 3
    const urlPathParts = req.url.split('/');
    //console.log('urlPathParts.length', urlPathParts.length );

    // get components of url, in format resource/id/command
    const resource = (urlPathParts[1] || '').toLowerCase(); 
    const id = urlPathParts[2]; 
    const command = (urlPathParts[3] || '').toLowerCase(); 
    const commandParts = command.split('?'); // split on ? if exists, the put command is the first array index
    const putCommand = commandParts[0]; // the possible PUT command
    /*
    // Debug Code:
    console.log('commandParts[0]', commandParts[0] );
    console.log('commandParts[1]', commandParts[1] );
    console.log('resource', resource );
    console.log('id', id );
    console.log('command', command );
    console.log('putCommand', putCommand );
    */

    // throw error if resource is not supported
    // more resources added in v1.0.0
    if (!CONFIG.SUPPORTED_RESOURCES.includes(resource)) { 
      return res.status(400).json({ error: `Unknown resource: ${resource}` }); 
    }    
    /*
    if (!CONFIG.SUPPORTED_RESOURCES.includes(resource)) {
      throw errPrefix + 'unknown resource "' + resource + '", expecting one of ' + JSON.stringify(CONFIG.SUPPORTED_RESOURCES).replace('[', '').replace(']', '').replace('"', '') + ': "' + req.url + '"';
    }
      */

    // get the id, throw error if not a number only for resources that need a numeric id
    if (CONFIG.RESOURCES_WITH_NUMERIC_ID.includes(resource)) {
      if ( (isNaN((id || '')) || (id === '')) ) { 
        return res.status(400).json({ error: `Invalid id for ${resource}: ${id}` });
      }
    }

    // throw error if unexpected quantity of url components
    // supported quantity of url components: up to 3
    // allowed: 
    // /<resource>
    // /<resource>/<id>
    // /<resource>/<id>/command
    if ( urlPathParts.length > 4 ) {
      return res.status(400).json({ error: `Too many URL components: ${urlPathParts.length - 1}` }); 
    }

    // throw error if unexpected quantity of ? delimiters
    // get the commandParts parts, identified by the presence of a ? delimiter, throw error if unexpected quantity of delimiters exist
    if ((commandParts.length > 1) && (commandParts.length !== 2) ) { 
        return res.status(400).json({ error: `Invalid query string format` });
    }



    // if a commandParts[1] (the parameters) exists, split the parameters into name-value pairs on &, loop and construct a json result
    // the existance of a query part generates a dataObj, which determines whether a PUT or a GET is used
    // improved code suggested by claude.ai
    let dataObj;
    if (commandParts.length > 1){
      // analyse each name value pair
      dataObj = {}; // Initialize only when needed
      commandParts[1].split('&').forEach(nameValuePair => {
        const [name, value] = nameValuePair.split('=');
        console.log('processing', name, value );
        if (!name || value === undefined) {
          throw new Error(`Invalid parameter: ${nameValuePair}`); // throw generic error
        }
        
        const decodedValue = decodeURIComponent(value);
        //console.log('decodedValue', decodedValue );

        // Parse value type
        if (decodedValue === 'true') dataObj[name] = true; // handle boolean true
        else if (decodedValue === 'false') dataObj[name] = false; // handle boolean false
        else if (!isNaN(decodedValue) && decodedValue !== '') dataObj[name] = Number(decodedValue); // handle numeric value
        else if (decodedValue.startsWith('[') && decodedValue.endsWith(']')) dataObj[name] = JSON.parse(decodedValue); // handle arrays, used for xy
        else dataObj[name] = decodedValue; // handle any other name value text pair
      });
    }
    //console.log('dataObj', dataObj );



    // if a dataObj exists, send PUT; otherwise, send a GET
    // GET http://192.168.0.101/api/<username>/lights/31
    // PUT http://192.168.0.101/api/<username>/lights/31/state --data "{""on"":true}"
    //let url = 'http://' + options.ip + '/api/' + options.username + '/' + resource;
    //if (id) { url = url + '/' + id; } // add id if supplied
    const url = `http://${options.ip}/api/` + `${options.username}/${resource}` + `${id ? '/' + id : ''}`;
    


    // special handling for toggle command, this toggles a light or group state
    // lights:  http://localhost:3000/api/<username>/lights/31/toggle
    // groups:  http://localhost:3000/api/<username>/groups/0/toggle
    // sensors: http://localhost:3000/api/<username>/sensors/15/toggle
    if (command === 'toggle') { 
      try { 
        console.log('toggling current state'); 

        // Get actual state
        console.log('sending GET: %s', url); 
        const response = await axios.get(url); 
        const { toggleCommand, currStateCommand, stateName, state } = getToggleState(resource, response.data);
        console.log('GET response:', response.status, response.statusText, currStateCommand + ":" + stateName + "=" + !state );

        console.log('sending PUT: %s/%s', url, toggleCommand); 
        const putResponse = await axios.put( `${url}/${toggleCommand}`, { on: state } ); 
        console.log('PUT response:', putResponse.status, putResponse.statusText); 
        res.json(putResponse.data); 
      } 
      
      catch (error) { 
        handleAxiosError(error, res, 'GET+PUT toggle'); 
      }

      // normal handling for non-toggle commands
      // lights:  /lights/<id>   state = on      true/false
      // groups:  /groups/<id>   state = all_on  true/false
      // sensors: /sensors/<id>  config = on     true/false
      } else { 
        try { 
          if (dataObj) { 
            console.log('sending PUT: %s/%s', url, putCommand); 
            const response = await axios.put(`${url}/${putCommand}`, dataObj); 
            console.log('PUT response:', response.status, response.statusText); 

            res.json(response.data); } else { console.log('sending GET: %s', url); 
            const response = await axios.get(url); 
            console.log('GET response:', response.status, response.statusText); 
            
            res.json(response.data); } 
          } 
        catch (error) { 
          handleAxiosError(error, res, dataObj ? 'PUT' : 'GET'); 
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