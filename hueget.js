// hueget.js
const packagejson = require('./package.json');
//const appname = packagejson.name;
//const version = packagejson.version;

var rootCAs = require('ssl-root-cas').create();
// default for all https requests
// (whether using https directly, request, or another module)
require('https').globalAgent.options.ca = rootCAs;

const https = require('https');
const fs = require('fs');

const express = require('express');
const axios = require('axios');
const parseArgs = require('minimist')
const app = express();

 



// create https axios instance with Hue CA cert
var axiosHue = axios.create({
  httpsAgent: new https.Agent({
    ca: fs.readFileSync(`./HueBridgeCaCert.pem`),
    checkServerIdentity: () => undefined,
    rejectUnauthorized: false
  })
});



// handle arguments
/*var options = stdio.getopt({
  ip: { key: 'i', description: 'Philips Hue bridge IP address', args: 1, required: false },
  appkey: { key: 'a', description: 'Philips Hue appkey', args: 1, required: false },
  discover: { key: 'd', description: 'discover all Philips Hue lights', args: 0, required: false },
  port: { key: 'p', description: 'port number to listen on', args: 1, required: false, default: 3000 },
  version: { key: 'v', description: 'displays hueget version', args: 0, required: false }
});
*/
//console.log('%s options', packagejson.name, options);

var options = parseArgs(process.argv.slice(2));
//console.log(options);

// -v: show version and exit
if ( options.v || options.version ) {
  console.log(packagejson.version);
  process.exit(0); // terminate with success
}


// -h: show help and exit. Also show if no arguments are passed
if ( options.h || options.help || process.argv.length == 2 ) {
  console.log('Usage: %s [options <arguments>]', packagejson.name);
  console.log("  -a, --appkey <appkey>               Philips Hue bridge appkey (previously known as username)");
  console.log("  -d, --discover                      discover all Hue lights and output json");
  console.log("  -i, --ip <ipaddress>                Philips Hue bridge ip address");
  console.log("  -h, --help                          print %s command line options", packagejson.name);
  console.log("  -p, --port <portnumber>             port number to listen on (default 3000)");
  console.log("  -u, --username <username>           Philips Hue bridge username (deprecated, use appkey)");
  console.log("  -v, --version                       print %s version", packagejson.name);
  process.exit(0); // terminate with success
}

// show version and continue
console.log('%s v%s', packagejson.name, packagejson.version);

// from now on, need -i and -a (or -u), mandatory
if ( !(options.i || options.ip) ) {
  console.log("-i, --ip: Error: argument not found. The Philips Hue bridge ip address must be provided");
  process.exit(0); // terminate with success
}
if ( !(options.a || options.appkey) || !(options.u || options.username) ) {
  if ( !(options.a || options.appkey) && !(options.u || options.username) ) {
    console.log("-a, --appkey: Error: argument not found. The Philips Hue bridge appkey must be provided");
    process.exit(0); // terminate with success
  }
  if ( !(options.u || options.username) && !(options.a || options.appkey) ) {
    console.log("-u, --username: Error: argument not found. The Philips Hue bridge username must be provided");
    process.exit(0); // terminate with success
  }
}

// populate the named options
if ( options.a && !options.appkey ) { options.appkey = options.a }
if ( options.i && !options.ip ) { options.ip = options.i }
if ( options.p && !options.port ) { options.port = options.p }
if ( options.u && !options.username ) { options.username = options.u }
if ( !options.port ) { options.port = 3000 }
if ( !options.appkey ) { options.appkey = options.username } // support username for backwards compatibility

// show ip and appkey
console.log('commands will be sent to %s with appkey %s', options.i || options.ip, options.a || options.appkey);


/*
// Add a request interceptor for debugging help
axiosHue.interceptors.request.use(req => {
  console.log('+++INTERCEPTOR HTTP REQUEST:', 
  '\nMethod:',req.method, '\nURL:', req.url, 
  '\nBaseURL:', req.baseURL, '\nHeaders:', req.headers,  
  //'\nParams:', req.params, '\nData:', req.data
  );
  return req; // must return request
});
axiosHue.interceptors.response.use(res => {
  console.log('+++INTERCEPTED HTTP RESPONSE:', res.status, res.statusText, 
  '\nHeaders:', res.headers, 
  //'\nData:', res.data, 
  //'\nLast Request:', res.request
  );
  return res; // must return response
});
*/



// -d: discover the lights, and exit
if ( options.d || options.discover ) {
  console.log('starting discovery');
  const config = {headers: {'hue-application-key': options.appkey,'Content-Type': 'application/json'}};
  const baseurl = 'https://' + options.ip + '/clip/v2';
  console.log('discovering Hue Bridge lights...');
  axiosHue.get(baseurl + '/resource/light', config)
    .then(response => {
      console.log('GET response:', response.status, response.statusText, JSON.stringify(response.data) );
      process.exit(0); // terminate with success
    })
    .catch(error => {
      const errText = error.syscall + ' ' + error.code + ' ' + error.address + ':' + error.port;
      console.log('GET error:', errText);
      console.log(error);
     process.exit(0); // terminate with success
    })
  ;
}






// API V2
// handle requests:
// clip/v2/resource/light/<id>/state
// clip/v2/resource/group/<id>/action 
// triggered by http://192.168.x.x/clip/v2/resource/lights
// translates a received GET command into a PUT command
// GET: http://192.168.x.x/clip/v2/resource/light/a52cca28-d35b-4ece-8705-aa7e8a21aa21/state?on=true
// PUT: http://192.168.x.x/clip/v2/resource/light/a52cca28-d35b-4ece-8705-aa7e8a21aa21/data?on:on=true"
app.use('/clip/v2/resource/', (req, res) => {
  const reqUrl = req.url;
  console.log('parsing url:', reqUrl);

  // wrap the url parser in an error handler
  try {
    // set an error prefix to help identify errors
    var errPrefix = 'url syntax error, ';


    // get the query string parts after ?m where index [0] = left side of ?, index [1] = right side of ?
    const urlQueryParts  = req.url.split('?'); // split on ?
    const urlPathParts = urlQueryParts[0].split('/'); // split on /

    // get components of url, in format resource/id?query
    const resource  = (urlPathParts[1] || '').toLowerCase(); 
    const id  = urlPathParts[2]; 
    const query = urlQueryParts[1]; // index 1 is the query string

    //console.log('resource', resource );
    //console.log('id', id );
    //console.log('query', query );


    // throw error if unexpected quantity of url components
    // allowed: 
    // /<resource>
    // /<resource>/<id>
    // /<resource>/<id>?querystring
    if ( urlPathParts.length > 4 ) {
      throw errPrefix + (urlPathParts.length - 1).toString() + ' url path components found, expecting maximum 3: "' + req.url + '"';
    }

    // get the query parts, throw error if unexpected quantity
    if ( (urlPathParts[0]) && (urlQueryParts.length != 2) ) { 
      throw errPrefix + (urlQueryParts.length - 1).toString() + ' "?" delimiters found, expecting 1: "' + req.url + '"';
    }


    // if a query exists, split the query part [1] into name-value pairs on &, loop and construct a json result
    // {"metadata": {"name": "developer lamp"}}   use http://192.168.x.x:3000/clip/v2/resource/light/a52cca28-d35b-4ece-8705-aa7e8a21aa21?object=metadata&name="developer%20lamp"
    // {"dimming": {"brightness": 50}}            use http://192.168.x.x:3000/clip/v2/resource/light/a52cca28-d35b-4ece-8705-aa7e8a21aa21?object=dimming&brightness=50
    // {"on": {"on": true}}                       use http://192.168.x.x:3000/clip/v2/resource/light/a52cca28-d35b-4ece-8705-aa7e8a21aa21?object=on&on=true
    // {"on":{"on":true}, "dimming": {"brightness": 100}}
    var putData;
    if (urlQueryParts.length == 2){
      var result = '{';
      errPrefix = 'url query syntax error, ';
      urlQueryParts[1].split('&').forEach(function(nameValuePair) {
        
        console.log('nameValuePair', nameValuePair );

        const pair = nameValuePair.split('=');
        if (pair.length != 2){ throw errPrefix + (pair.length - 1).toString() + ' "=" delimiters found, expecting 1: "' + nameValuePair + '"';}
        if ((pair[0] || '').length == 0){ throw errPrefix + 'pair name not found": "' + nameValuePair + '"';}

        // look for the object identifier "object"
        if (pair[0] == 'object'){
          // start of a new object
          //console.log('object found:', pair[1]);
          if (result.length>1) { result = result + '}, ' }; // terminate any existing object
          result = result + '"' + decodeURIComponent(pair[1]) + '":{';
        
        } else {
          // data within an object
          //console.log('name:value found:', pair[0], pair[1]);
          var pairValue = decodeURIComponent(pair[1] || '');
          console.log('pairValue', pairValue );
          if (pairValue.length == 0){ throw errPrefix + 'pair value not found": "' + nameValuePair + '"';}
  
          // enclose string in "", leave boolean and number unchanged. Hue accepts: {"name":booleanOrNumber, "name":"String"}
          if (
            (pairValue != 'true') && (pairValue != 'false') && (isNaN(pairValue))
            && (!pairValue.startsWith('[')) && (!pairValue.endsWith(']')) // for xy arrays
            ) { pairValue = '"' + pairValue + '"'; 
          }
  
          result = result + '"' + pair[0] + '":' + pairValue;
  
        }
      
      });
      result = result.replace('{,','{') + '}}'; // clean up, add brackets
      console.log('result', result );
      putData = JSON.parse(result);
    }

    //set common headers for hue bridge
    axiosHue.defaults.headers.common = { 
        'Content-Type': 'application/json',
        'hue-application-key': options.appkey,
        'Connection': 'keep-alive'
      }; 
    
    // if a dataObj exists, send PUT; otherwise, send a GET
    // GET http://192.168.0.101/clip/v2/resource/lights/<id>
    // PUT http://192.168.0.101/clip/v2/resource/lights/<id>/data --data "{""on"":true}"
    //const config = {headers: {'hue-application-key': options.appkey,'Content-Type': 'application/json', 'Connection': 'keep-alive'}};
    //const config = {headers: {'hue-application-key': options.appkey, 'Connection': 'keep-alive'}};
    var url = 'https://' + options.ip + '/clip/v2/resource/' + resource;
    if (id) { url = url + '/' + id; } // add id if supplied
    if (putData){
      console.log('sending PUT: %s %s', url, JSON.stringify(putData || '') );
      axiosHue.put(url, putData)
        .then(response => {
          console.log('PUT response:', response.status, response.statusText, JSON.stringify(response.data) );
          res.json(response.data);
        })
        .catch(error => {
          const errText = error.response.status + ' ' + error.response.statusText + ' ' + JSON.stringify(error.response.data);
          console.log('PUT error:', errText);
          res.json({ error: errText });
        });
      } else {
        console.log('sending GET: %s', url);
        axiosHue.get(url)
          .then(response => {
            console.log('GET response:', response.status, response.statusText, JSON.stringify(response.data) );
            res.json(response.data);
          })
          .catch(error => {
            const errText = error.response.status + ' ' + error.response.statusText + ' ' + JSON.stringify(error.response.data);
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
app.listen(options.port, () => {
  // if in discover mode, the app will end quickly, so don't show the log
  if ( !options.d && !options.discover ) {
    console.log(`listening on port ${options.port}`);
  }

})