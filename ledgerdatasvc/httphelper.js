var http = require('http');

//Calls any http rest server
exports.call = function (options, payload, usertoken, getresp, next) {
  var body = (payload ? JSON.stringify(payload) : "");
	
	options.headers = { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body), 'Authorization':'Bearer ' + usertoken };

  var req = http.request(options, (getresp ? (res) => {
	  var resp = '';
	  res.setEncoding('utf8');
	  res.on('data', (chunk) => {
		  resp += chunk;
	  });

	  res.on('end', () => {
		try {
			next(null,resp);
		} catch (e) {
			  console.error('Error occured - '+ e.stack);
			  next(e, null);
		}
	  });
	} : null)
  );

  req.on('error', function(e) {
		console.error('Error occured for the HTTP request - %j %j', options, e.stack);
		next(e,null);
  });
  
  req.write(body);
  req.end();
}
