var _ 					= require('underscore');
var qs 					= require("querystring");
var fbapi 				= require('facebook-api');
var moment				= require('moment');

// Users
function api() {
	
}
api.prototype.init = function(Gamify, callback){
	var scope = this;
	
	this.Gamify = Gamify;
	
	// Return the methods
	var methods = {
		
		index: {
			require:		[],
			auth:			false,
			description:	"Index page",
			params:			{},
			status:			'stable',
			version:		1,
			callback:		function(params, req, res, callback) {
				res.render("main", {
					
				}, function(err, html) {
					callback(html);
				});
			}
		},
		
		
	};
	
	// Init a connection
	this.mongo	= new this.Gamify.mongo({database:Gamify.settings.db});
	this.mongo.init(function() {
		callback(methods);
	});
}
exports.api = api;