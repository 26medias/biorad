var _ 					= require('underscore');
var qs 					= require("querystring");
var moment				= require('moment');
var request 			= require('request');
var Twig				= require("twig").twig;
var nodemailer 			= require("nodemailer");
var SendGrid 			= require('sendgrid').SendGrid;
var Email 				= require('sendgrid').Email;
var fs 					= require('fs');

// Users
function api() {
	
}
api.prototype.init = function(Gamify, callback){
	var scope = this;
	
	this.transport	= nodemailer.createTransport("SMTP", {
		host: 	"smtp.sendgrid.net",
		port: 	25,
		secureConnection: false,
		auth: {
			user: "biorad",
			pass: "2122ftpssh80803666"
		}
	});
	
	this.render = function(file, params, callback) {
		
		
		fs.readFile(file, 'utf8', function (err, data) {
			if (err) {
				callback(false);
			} else {
				var template 		= Twig({
					data: 	data
				});
				var html = template.render(params);
				callback(true,html);
			}
		});
		
	};
	
	this.Gamify = Gamify;
	
	// Return the methods
	var methods = {
		
		
		
		send: {
			require:		['emails','message','signature'],
			params:			{},
			auth:			"authtoken",
			description:	"Send an email ",
			status:			'dev',
			version:		1,
			callback:		function(params, req, res, callback) {
				
				params	= scope.Gamify.api.fixTypes(params, {
					emails:		'array',
				});
				
				Gamify.log("params",params);
				
				var uuid = Gamify.utils.uuid();
				
				// Save the card
				scope.mongo.insert({
					collection:	"cards",
					data:	{
						uuid:		uuid,
						date:		new Date(),
						uid:		params.__auth,
						to:			params.emails,
						message:	params.message,
						signature:	params.signature,
						views:		[]
					}
				}, function() {});
				
				_.each(params.emails, function(email) {
					
					var ruuid = Gamify.utils.uuid();
					
					scope.mongo.insert({
						collection:	"recipient",
						data:	{
							uuid:		ruuid,
							card:		uuid,
							date:		new Date(),
							uid:		params.__auth,
							to:			email,
							message:	params.message,
							signature:	params.signature,
							views:		0,
							viewdates:	[]
						}
					}, function() {
						
						scope.render("views/email.twig", {
							email:		email,
							uuid:		ruuid,
							message:	params.message,
							signature:	params.signature
						}, function(err, html) {
							
							Gamify.log("Using: ",Gamify.settings.mailmethod);
							
							switch (Gamify.settings.mailmethod) {
								default:
								case "file":
									var filename = "["+params.__auth+"] "+email+".html";
									
									fs.writeFile("output/"+filename, html, function(err) {
										if(err) {
											console.log(err);
										} else {
											console.log("Email saved as ","output/"+filename);
										}
									}); 
								break;
								case "smtp":
									scope.transport.sendMail(
										{
											from: 		"Bio-Rad <no-reply@bio-rad.com>",
											to: 		email,
											subject: 	"2014 Wishes from Bio-Rad.",
											html: 		html
										},
										function(error, response){
											scope.mongo.insert({
												collection:	"sent",
												data:	{
													date:		new Date(),
													from:		params.__auth,
													email:		email,
													html:		html,
													message:	params.message,
													signature:	params.signature,
													error:		error,
													response:	response
												}
											}, function() {});
											if(error){
												
											} else {
												
											}
										}
									);
								break;
							}
						});
					});
					

				});
				
				callback(params);
				
			}
		}
	};
	
	// Init a connection
	this.mongo	= new this.Gamify.mongo({database:Gamify.settings.db});
	this.mongo.init(function() {
		callback(methods);
	});
}
exports.api = api;