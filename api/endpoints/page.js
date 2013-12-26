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
		
		
		stats: {
			require:		[],
			auth:			false,
			description:	"Stats page",
			params:			{},
			status:			'stable',
			version:		1,
			callback:		function(params, req, res, callback) {
				
				res.render("stats", {
					
				}, function(err, html) {
					callback(html);
				});
			}
		},
		
		card: {
			require:		[],
			auth:			false,
			description:	"Card page",
			params:			{},
			status:			'stable',
			version:		1,
			callback:		function(params, req, res, callback) {
				
				// Find the recipient data
				scope.mongo.find({
					collection:	"recipient",
					query:		{
						uuid:	params.card
					}
				},function(recipient) {
					if (recipient.length == 0) {
						callback("This card doesn't exist (error #1)");
						return false;
					}
					
					recipient = recipient[0];
					
					// Find the card
					scope.mongo.find({
						collection:	"cards",
						query:		{
							uuid:	recipient.card
						}
					},function(card) {
						if (card.length == 0) {
							callback("This card doesn't exist (error #2)");
							return false;
						}
						card = card[0];
						
						// Find the user
						scope.mongo.find({
							collection:	"users",
							query:		{
								uid:	card.uid
							}
						},function(user) {
							if (user.length == 0) {
								callback("This card doesn't exist (error #3)");
								return false;
							}
							user = user[0];
							
							// Render the card
							res.render("card", {
								recipient:	recipient,
								card:		card,
								user:		user
							}, function(err, html) {
								callback(html);
							});
							
							// Background: Update the stats
							scope.mongo.update({
								collection:	"recipient",
								query:		{
									uuid:	params.card
								},
								data:	{
									$inc:	{
										views: 1
									},
									$addToSet:	{
										viewdates:	new Date()
									}
								}
							}, function() {});
								
							scope.mongo.update({
								collection:	"cards",
								query:		{
									uuid:	recipient.card
								},
								data:	{
									$addToSet:	{
										views:	recipient.to
									}
								}
							}, function() {});
						});
						
					});
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