#!/usr/bin/env node

// node modules
var fs = require("fs");
var path = require("path");

// node modules
var debug = require("debug")("liftbot");
var ws = require("ws");
var twitter = require("twitter");

// check for config file
if (!fs.existsSync(path.resolve(__dirname, "config.js"))) console.error("config.js not found") || process.exit(1);

// load config
var config = require(path.resolve(__dirname, "config.js"));

// load station data
var stations = JSON.parse(fs.readFileSync(path.resolve(__dirname, "data/stations.json")));

// create twitter client
var t = new twitter(config.twitter);

// create websocket
new ws(config.websocket).on("open", function(){
	debug("websocket opened");
}).on("error", function(err){
	debug("websocket error: %s", err);
}).on("message", function(data){
	data = JSON.parse(data);

	// ignore example events
	if (data.equipmentnumber === 0) return;

	debug("incoming data: %j", data);

	// build message
	var message = [];

	if (stations.hasOwnProperty(data.stationnumber.toString())) {
		message.push(stations[data.stationnumber.toString()]+",");
	} else {
		message.push("#"+data.stationnumber+",")
	}

	if (data.description) {
		message.push(data.description);
	} else {
		message.push("Aufzug");
	}

	switch (data.state) {
		case "INACTIVE": message.push("ist defekt."); break;
		case "ACTIVE": message.push("ist wieder betriebsbereit."); break;
		case "UNKNOWN": message.push("meldet sich nicht mehr."); break;
		default: return; break;
	}
	
	message = message.join(" ");
	debug("posting: %s", message);
	
	// post to twitter
	t.post('statuses/update', {
		"status": message,
		"lat": data.geocoordY.toString(),
		"long": data.geocoordX.toString(),
	}, function(err, tweet, response){
		if (err) return debug("error posting: %s", err.message);
		debug("posting successful: https://twitter.com/%s/status/%s", config.twitter.username, tweet.id_str);
	});
	
});