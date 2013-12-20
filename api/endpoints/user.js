var _ 					= require('underscore');
var qs 					= require("querystring");
var fbapi 				= require('facebook-api');
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
	
	this.Gamify = Gamify;
	
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
	
	
	// Return the methods
	var methods = {
		
		
		
		
		validateAuthToken: {
			require:		['authtoken'],
			auth:			false,
			description:	"",
			params:			{authtoken:'md5'},
			status:			'stable',
			version:		1,
			callback:		function(params, req, res, callback) {
				
				
				scope.mongo.find({
					collection:	'authtokens',
					query:		{
						token:		params['authtoken'],
						validity:	{
							$gt:	new Date().getTime()
						}
					},
					limit:	1
				}, function(response) {
					if (response.length > 0) {
						// Get user
						scope.Gamify.api.execute("user","find", {query:{uid:response[0].uid}}, function(user_response) {
							if (user_response.length > 0) {
								if (user_response[0].confirmed === true) {
									callback({valid: true, user: user_response[0], authtoken: params.authtoken});
								} else {
									callback(scope.Gamify.api.errorResponse('This account is not confirmed yet. Please click the link sent by email.'));
								}
							} else {
								callback({valid: false});
							}
						});
					} else {
						callback({valid: false});
					}
				});
				
			}
		},
		
		
		
		
		getAuthToken: {
			require:		['user'],
			auth:			false,
			description:	"Identify a user and returns an authtoken to be used for private api methods.",
			params:			{user:'object'},
			status:			'stable',
			version:		1,
			callback:		function(params, req, res, callback) {
				
				// Convert "user" from a JSON string to an object if necessary
				params	= scope.Gamify.api.fixTypes(params, {
					user:		'object'
				});
				params.user	= scope.Gamify.api.fixTypes(params.user, {
					password:	'md5'
				});
				
				//console.log("params",params);
				
				// Find the user
				// Update the token
				// Return the token
				scope.mongo.find({
					collection:	'users',
					query:		params['user'],
					limit:		1
				}, function(response) {
					if (response.length == 0) {
						callback(scope.Gamify.api.errorResponse('This user doesn\'t exist.'));
					} else {
						if (response[0].confirmed === false) {
							callback(scope.Gamify.api.errorResponse('This account is not confirmed yet. Please click the link sent by email.'));
							return false;
						}
						
						// Generate the token
						var authtoken = scope.Gamify.crypto.md5(scope.Gamify.uuid.v4());
						// Update/Create the token
						scope.mongo.update({
							collection:		'authtokens',
							query: {
								uid:		response[0].uid
							},
							data:	{
								uid:		response[0].uid,
								validity:	new Date().getTime()+60*60*24*365*1000,
								token:		authtoken
							},
							options:	{
								upsert:	true
							}
						},function() {
							callback({
								valid: 		true,
								authtoken:	authtoken,
								user:		response[0].uid
							});
						});
					}
				});
			}
		},
		
		
		
		
		create: {
			require:		['data'],
			auth:			false,
			description:	"Create a new user using arbitrary data.",
			params:			{data:'object'},
			status:			'stable',
			version:		1,
			callback:		function(params, req, res, callback) {
				
				params	= scope.Gamify.api.fixTypes(params, {
					data:		'object'
				});
				
				if (!params.__passwordencoded) {
					params.data	= scope.Gamify.api.fixTypes(params.data, {
						password:	'md5'
					});
				}
				
				
				params.data = _.extend({
					confirmed:	false
				},params.data);
				
				// Account Creation method
				var create_account = function() {
					var uid = scope.Gamify.crypto.md5(scope.Gamify.uuid.v4());
					
					var userdata = _.extend({
						register_date:	new Date()
					},params.data, {
						uid:		uid
					});
					//console.log("userdata",userdata);
					
					scope.mongo.insert({
						collection:		'users',
						data:			userdata
					}, function() {
						callback({registered: true});
						/*scope.Gamify.api.execute("user","getAuthToken", {user: {uid:uid}}, function(response) {
							callback(response);
							//@TODO: Send email
						});*/
					});
					
					// Send the confirmation email
					scope.render("views/confirmation.twig", {
						uid:		uid,
						firstname:	params.data.firstname
					}, function(err, html) {
						
						Gamify.log("Using: ",Gamify.settings.mailmethod);
						
						switch (Gamify.settings.mailmethod) {
							default:
							case "file":
								var filename = "[registration] "+params.data.email+".html";
								
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
										to: 		params.data.email,
										subject: 	"Bio-Rad 2014 Wishes: Account activation needed.",
										html: 		html
									},
									function(error, response){
										
									}
								);
							break;
						}
					});
				}
				
				// Make sure there are no duplicate accounts
				var query = {};
				if (params.data.email && params.data.fbuid) {
					query = {
						$or:	[
							{email:	params.data.email},
							{fbuid:	params.data.fbuid},
						]
					};
				} else if (params.data.email && !params.data.fbuid) {
					query = {
						email:	params.data.email
					};
				} else if (!params.data.email && params.data.fbuid) {
					query = {
						fbuid:	params.data.fbuid
					};
				} else {
					callback(scope.Gamify.api.errorResponse('Either an email or a facebook UID is required to register an account.'));
					return false;
				}
				scope.mongo.count({
					collection:		'users',
					query:			query
				}, function(count) {
					if (count > 0) {
						callback(scope.Gamify.api.errorResponse('This email is already in use.',304));
					} else {
						create_account();
					}
				});
				
			}	
		},
		
		
		
		
		
		find: {
			require:		[],
			params:			{query:"MongoDB query"},
			auth:			false,
			description:	"Search for users. Returns only the public informations.",
			status:			'unstable',
			version:		1.2,
			callback:		function(params, req, res, callback) {
				
				params	= scope.Gamify.api.fixTypes(params, {
					query:	'object'
				});
				
				scope.mongo.find(_.extend(params, {
					collection:	"users",
					fields:		{
						password:	false,
						racedata:	false,
						fbfriends:	false
					}
				}), function(response) {
					var i;
					var l = response.length;
					for (i=0;i<l;i++) {
						response[i].fullname = response[i].firstname+" "+response[i].lastname;
						response[i].state = {
							gender:		!(!response[i].metadatas || !response[i].metadatas.gender),
							age:		!(!response[i].metadatas || !response[i].metadatas.age),
							location:	!(!response[i].location),
							facebook:	!(!response[i].fbuid),
							phone:		!(!response[i].phone)
						};
						if (!response[i].avatar) {
							response[i].avatar = "images/avatar-default.png";
						}
					}
					callback(response);
				});
			}
		},
		
		
		
		
		get: {
			require:		[],
			params:			{},
			auth:			'authtoken',
			description:	"Get the user's complete profile data.",
			status:			'stable',
			version:		1,
			callback:		function(params, req, res, callback) {
				
				scope.mongo.find(_.extend(params,{
					collection:	"users",
					query:		{
						uid:	params.__auth
					},
					limit:		1
				}), function(response) {
					if (response.length == 0) {
						callback(false);
					} else {
						response[0].fullname = response[0].firstname+" "+response[0].lastname;
						response[0].state = {
							gender:		!(!response[0].metadatas || !response[0].metadatas.gender),
							age:		!(!response[0].metadatas || !response[0].metadatas.age),
							location:	!(!response[0].location),
							facebook:	!(!response[0].fbuid),
							phone:		!(!response[0].phone)
						};
						if (!response[0].avatar) {
							response[0].avatar = "images/avatar-default.png";
						}
						callback(response[0]);
					}
				});
			}
		},
		
		
		
		
		paginate: {
			require:		[],
			params:			{},
			auth:			false,
			description:	"Get a list of users, with pagination. Can be filtered using the 'query' parameter (object).",
			status:			'unstable',
			version:		1,
			callback:		function(params, req, res, callback) {
				
				params	= _.extend({
					perpage:	5,
					page:		1
				},params);
				scope.mongo.paginate(_.extend({
					collection:	"users",
					query:		{}
				}, params), function(response) {
					var nextParam		= _.extend({},params);
					nextParam.page 		= response.pagination.current+1;
					var prevParam		= _.extend({},params);
					prevParam.page		= response.pagination.current-1;
					
					console.log("\033[35m Paginate query:\033[37m",JSON.stringify(_.extend({
					collection:	"users",
					query:		{}
				}, params),null,4));
					console.log("\033[35m response:\033[37m",JSON.stringify(response,null,4));
					
					var i;
					var l = response.data.length;
					for (i=0;i<l;i++) {
						response.data[i].fullname = response.data[i].firstname+" "+response.data[i].lastname;
						response.data[i].state = {
							gender:		!(!response.data[i].metadatas || !response.data[i].metadatas.gender),
							age:		!(!response.data[i].metadatas || !response.data[i].metadatas.age),
							location:	!(!response.data[i].location),
							facebook:	!(!response.data[i].fbuid),
							phone:		!(!response.data[i].phone)
						};
					}
					
					if (req && req.path) {
						response.next		= response.pagination.current >= response.pagination.pages ? false : req.path+"?"+qs.stringify(nextParam);
						response.previous	= response.pagination.current <= 1 ? false : req.path+"?"+qs.stringify(prevParam);
					}
					callback(response);
				});
			}
		},
		
		
		
		
		online: {
			require:		[],
			params:			{},
			auth:			false,
			description:	"Get a paginated list of currently online users.",
			status:			'stable',
			version:		1,
			callback:		function(params, req, res, callback) {
				
				params	= _.extend({
					perpage:	5,
					page:		1,
					time:		1000*60*5	// in ms!
				},params);
				
				scope.mongo.paginate(_.extend(params, {
					collection:	"users",
					query:		{
						"data.recent_activity": {
							$gt:	new Date(new Date().getTime()-params.time)
						}
					}
				}), function(response) {
					var nextParam		= _.extend({},params);
					nextParam.page 		= response.pagination.current+1;
					var prevParam		= _.extend({},params);
					prevParam.page		= response.pagination.current-1;
					
					response.next		= response.pagination.current >= response.pagination.pages ? false : req.path+"?"+qs.stringify(nextParam);
					response.previous	= response.pagination.current <= 1 ? false : req.path+"?"+qs.stringify(prevParam);
					callback(response);
				});
			}
		},
		
		
		
		
		activate: {
			require:		['uid'],
			params:			{},
			auth:			false,
			description:	"Activate a user's profile",
			status:			'stable',
			version:		1,
			callback:		function(params, req, res, callback) {
				
			
				scope.mongo.update({
					collection:	"users",
					query:		{
						uid:	params.uid
					},
					data:		{
						$set:	{
							confirmed:	true
						}
					}
				}, function() {
					callback('<script>document.location="/#/login/'+params.uid+'";</script>');
				});
				
			}
		},
		
		
		
		
		set: {
			require:		['data','query'],
			params:			{},
			auth:			"sys",
			description:	"Save a data on the user's profile.",
			status:			'stable',
			version:		1.2,
			callback:		function(params, req, res, callback) {
				
			
				scope.mongo.update({
					collection:	"users",
					query:		params.query,
					data:		{
						$set:	params.data
					}
				}, function() {
					callback({set:true});
				});
				
			}
		},
		
		
		
		setMetas: {
			require:		['data'],
			params:			{},
			auth:			"authtoken",
			description:	"Save a meta-data on the user's profile.",
			status:			'stable',
			version:		1.1,
			callback:		function(params, req, res, callback) {
				
				
				var data = {};
				var i;
				for (i in params.data) {
					data["metadatas."+i] = params.data[i];
				}
			
				scope.mongo.update({
					collection:	"users",
					query:		{
						uid:	params.__auth	// The auth method pass that __auth data into the params
					},
					data:		{
						$set:	data
					}
				}, function(response) {
					callback(response);
				});
				
			}
		},
		
		
		
		
		getMetas: {
			require:		['query'],
			params:			{},
			auth:			'sys',
			description:	"Get the user's meta-datas.",
			status:			'stable',
			version:		1,
			callback:		function(params, req, res, callback) {
				
				scope.mongo.find(_.extend(params, {
					collection:	"users",
					query:		params.query,
					limit:		1,
					fields:		{
						metadatas:	true
					},
				}), function(response) {
					console.log("\033[35m [>getMetas]:\033[37m",response);
					if (response.length == 0) {
						callback(false);
					} else {
						if (response[0].metadatas) {
							callback(response[0].metadatas);
						} else {
							callback(false);
						}
					}
				});
			}
		},
		
		
		
		
		setData: {
			require:		['data'],
			params:			{},
			auth:			"authtoken",
			description:	"Save a data on the user's profile.",
			status:			'stable',
			version:		1.1,
			callback:		function(params, req, res, callback) {
				
				
				var data = {};
				var i;
				for (i in params.data) {
					data["data."+i] = params.data[i];
				}
			
				scope.mongo.update({
					collection:	"users",
					query:		{
						uid:	params.__auth	// The auth method pass that __auth data into the params
					},
					data:		{
						$set:	data
					}
				}, function(response) {
					callback(response);
				});
				
			}
		},
		
		
		
		
		passwordreset: {
			require:		['email'],
			params:			{},
			auth:			false,
			description:	"Create a reset link for the user",
			status:			'stable',
			version:		1.1,
			callback:		function(params, req, res, callback) {
				
				// Check if there's a user
				scope.mongo.find({
					collection:		"users",
					query:			{
						email: params.email
					},
					fields:		{
						uid:		true,
						firstname:	true,
						lastname:	true,
						email:		true
					}
				}, function(user) {
					if (user.length > 0) {
						user = user[0];
						var token 	= scope.Gamify.crypto.md5(scope.Gamify.uuid.v4());
						
						// Insert the token
						scope.mongo.insert({
							collection:		"passwordreset",
							data:			{
								uid:	user.uid,
								token:	token,
								time:	new Date()
							}
						}, function() {});
						
						// Send the email
						Gamify.mailstack.send({
							user:	user,
							params:	{
								token:	token
							},
							type:	"passwordreset"
						});
						callback({sent:true});
					} else {
						callback(Gamify.api.errorResponse("There are no accounts registered with that email."));
					}
				});
				
				
			}
		},
		
		
		
		
		passwordresetupdate: {
			require:		['token'],
			params:			{},
			auth:			false,
			description:	"Change the password and login",
			status:			'stable',
			version:		1.1,
			callback:		function(params, req, res, callback) {
				
				
				params	= scope.Gamify.api.fixTypes(params, {
					password:	'md5'
				});
				
				// Check if there's a user
				scope.mongo.find({
					collection:		"passwordreset",
					query:			{
						token: params.token
					}
				}, function(response) {
					if (response.length > 0) {
						var request = response[0];
						
						scope.Gamify.api.execute("user","getAuthToken", {
							user:	{
								uid:	request.uid
							}
						}, callback);
						
						// Background
						// Update the user's password
						scope.mongo.update({
							collection:	"users",
							query:		{
								uid:	request.uid
							},
							data:		{
								$set: {
									password:	params.password
								}
							}
						}, function(){});
						
						// Delete the token
						scope.mongo.remove({
							collection:	"passwordreset",
							query:		{
								token: params.token
							}
						}, function(){});
						
					} else {
						callback(Gamify.api.errorResponse("The token for that request is expired or invalid."));
					}
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