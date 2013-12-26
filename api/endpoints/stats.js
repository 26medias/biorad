var _ 					= require('underscore');
var qs 					= require("querystring");

// Users
function api() {
	
}
api.prototype.init = function(Gamify, callback){
	var scope = this;
	
	this.Gamify = Gamify;
	
	// Return the methods
	var methods = {
		
		users: {
			require:		[],
			auth:			"sys",
			description:	"Get user stats",
			params:			{},
			status:			'dev',
			version:		1,
			callback:		function(params, req, res, callback) {
				
				var stack = new Gamify.stack();
				
				var stats = {};
				
				// Count users
				stack.add(function(p, onProcessed) {
					scope.mongo.count({
						collection:	'users'
					}, function(count) {
						stats.users = count;
						onProcessed();
					});
				}, {});
				
				// Count fb users
				stack.add(function(p, onProcessed) {
					scope.mongo.count({
						collection:	'users',
						query:		{
							fbuid:	{
								$exists: true
							}
						}
					}, function(count) {
						stats.fbusers = count;
						onProcessed();
					});
				}, {});
				
				// Count non-fb users
				stack.add(function(p, onProcessed) {
					scope.mongo.count({
						collection:	'users',
						query:		{
							fbuid:	{
								$exists: false
							}
						}
					}, function(count) {
						stats.nonfbusers = count;
						onProcessed();
					});
				}, {});
				
				// Demography: male
				stack.add(function(p, onProcessed) {
					scope.mongo.count({
						collection:	'users',
						query:		{
							"metadatas.gender":	"male"
						}
					}, function(count) {
						stats.gender_male = count;
						onProcessed();
					});
				}, {});
				
				// Demography: female
				stack.add(function(p, onProcessed) {
					scope.mongo.count({
						collection:	'users',
						query:		{
							"metadatas.gender":	"female"
						}
					}, function(count) {
						stats.gender_female = count;
						onProcessed();
					});
				}, {});
				
				// Demography: no-gender
				stack.add(function(p, onProcessed) {
					scope.mongo.count({
						collection:	'users',
						query:		{
							"metadatas.gender":	{
								$exists: false
							}
						}
					}, function(count) {
						stats.nogender = count;
						onProcessed();
					});
				}, {});
				
				stack.process(function() {
					callback(stats);
				}, true);	// async
				
			}
		},
		
		aggregate_key: {
			require:		['collection','key'],
			auth:			"sys",
			description:	"Aggregate data on a key",
			params:			{query:"Filter", collection:"Collection", key:"Key"},
			status:			'dev',
			version:		1,
			callback:		function(params, req, res, callback) {
				
				var i;
				
				params	= scope.Gamify.api.fixTypes(params, {
					query:		'object'
				});
				
				if (!params.query) {
					params.query = {};
				}
				
				// Convert query parameters (auto-convert values to ints when possible)
				params.query	= scope.Gamify.api.fixTypes(params.query, {});
				
				scope.mongo.aggregate({
					collection:	params.collection,
					rules: [{
						$match:	params.query
					},{
						$group:	{
							_id:	"$"+params.key,
							total:	{
								$sum: 1
							}
						}
					}]
				}, function(data) {
					// Order
					data.sort(function(a,b) {
						return a.total-b.total;
					});
					callback(data);
				});
				
			}
		},
		
		aggregate: {
			require:		['collection','rules'],
			auth:			"sys",
			description:	"Aggregate data",
			params:			{collection:"Collection", rules:"Aggregation data (array)"},
			status:			'dev',
			version:		1,
			callback:		function(params, req, res, callback) {
				
				var i;
				
				params	= scope.Gamify.api.fixTypes(params, {
					rules:		'object'
				});
				
				scope.mongo.aggregate({
					collection:	params.collection,
					rules: 		params.rules
				}, function(data) {
					callback(data);
				});
				
			}
		},
		
		biorad_users: {
			require:		[],
			auth:			"sys",
			description:	"Aggregate data",
			params:			{},
			status:			'dev',
			version:		1,
			callback:		function(params, req, res, callback) {
				
				var stack = new Gamify.stack();
				
				var stats 	= {};
				var output 	= [];
				
				// Sent
				stack.add(function(p, onProcessed) {
					scope.mongo.aggregate({
						collection:	"cards",
						rules: 		[{
							$unwind: "$to"
						}, {
							$group: {
								_id:	"$uid",
								total: {
									$sum: 1
								}
							}
						}]
					}, function(data) {
						stats = Gamify.utils.indexed(data,"_id");
						onProcessed();
					});
				}, {});
				
				// Views	
				stack.add(function(p, onProcessed) {
					scope.mongo.aggregate({
						collection:	"cards",
						rules: 		[{
							$unwind: "$views"
						}, {
							$group: {
								_id:	"$uid",
								total: {
									$sum: 1
								}
							}
						}]
					}, function(data) {
						var indexed = Gamify.utils.indexed(data,"_id");
						var uid;
						for (uid in indexed) {
							if (stats[uid]) {
								stats[uid].seen = indexed[uid].total;
							}
						}
						onProcessed();
					});
				}, {});
				
				// Users	
				stack.add(function(p, onProcessed) {
					// Get the users first
					var uids = [];
					var uid;
					for (uid in stats) {
						uids.push(uid);
					}
					
					// Get the user data
					scope.mongo.find({
						collection:	"users",
						query:	{
						}
					}, function(users) {
						
						_.each(users, function(user) {
							user.sent 	= 0;
							user.seen 	= 0;
							if (stats[user.uid]) {
								user.sent 	= stats[user.uid].total;
								user.seen 	= stats[user.uid].seen;
							}
							output.push(user);
						});
						
						onProcessed();
					});
				}, {});
				
				
				
				stack.process(function() {
					callback(output);
				}, false);	// sync
				
				
			}
		},
		
		
		histogram: {
			require:		['datefield', 'collection', 'query'],
			auth:			"sys",
			description:	"Get histogram data",
			params:			{datefield:"Date field", collection:"Collection", query:"Mongo Query", type:'day/weekday/month/hour/weekdayhour'},
			status:			'dev',
			version:		1,
			callback:		function(params, req, res, callback) {
				
				var i;
				
				params	= scope.Gamify.api.fixTypes(params, {
					query:		'object'
				});
				
				params = _.extend({
					type:	'day'
				},params);
				
				
				if (!params.query) {
					params.query = {};
				}
				
				// Convert query parameters (auto-convert values to ints when possible)
				params.query	= scope.Gamify.api.fixTypes(params.query, {});
				
				// remove empty query parameters
				for (i in params.query) {
					if (params.query[i] == '' && params.query[i] !== 0 &&  params.query[i] !== false) {
						delete params.query[i];
					}
				}
				
				
				// Make sure the key exists
				if (!params.query[params.datefield]) {
					params.query[params.datefield] = {};
				}
				params.query[params.datefield]["$exists"] = true;
				
				Gamify.log("Query type:",params.query);
				
				var sortQuery = {};
				sortQuery[params.datefield] = 1;
				
				var rules = [];
				switch (params.type) {
					default:
					case "day":
						rules = [{
							$match:	params.query
						},{
							$project: {
								d:	{
									$dayOfMonth:	"$"+params.datefield
								},
								m:	{
									$month:	"$"+params.datefield
								},
								y:	{
									$year:	"$"+params.datefield
								}
							}
						}, {
							$group: {
								_id: {
									d:		"$d",
									m:		"$m",
									y:		"$y"
								},
								total:	{
									$sum:	1
								}
							}
						}, {
							$sort:	sortQuery
						}];
					break;
					case "weekday":
						rules = [{
							$match:	params.query
						},{
							$project: {
								d:	{
									$dayOfWeek:	"$"+params.datefield
								}
							}
						}, {
							$group: {
								_id: {
									d:		"$d"
								},
								total:	{
									$sum:	1
								}
							}
						}, {
							$sort:	sortQuery
						}];
					break;
					case "month":
						rules = [{
							$match:	params.query
						},{
							$project: {
								m:	{
									$month:	"$"+params.datefield
								},
								y:	{
									$year:	"$"+params.datefield
								}
							}
						}, {
							$group: {
								_id: {
									m:		"$m",
									y:		"$y"
								},
								total:	{
									$sum:	1
								}
							}
						}, {
							$sort:	sortQuery
						}];
					break;
					case "hour":
						rules = [{
							$match:	params.query
						},{
							$project: {
								h:	{
									$hour:	"$"+params.datefield
								}
							}
						}, {
							$group: {
								_id: {
									h:		"$h"
								},
								total:	{
									$sum:	1
								}
							}
						}, {
							$sort:	sortQuery
						}];
					break;
					case "weekdayhour":
						rules = [{
							$match:	params.query
						},{
							$project: {
								h:	{
									$hour:	"$"+params.datefield
								},
								d:	{
									$dayOfWeek:	"$"+params.datefield
								}
							}
						}, {
							$group: {
								_id: {
									h:		"$h",
									d:		"$d"
								},
								total:	{
									$sum:	1
								}
							}
						}, {
							$sort:	sortQuery
						}];
					break;
				}
				
				// If there is an unwind to do, we unshift it
				if (params.unwind) {
					rules.unshift({
						$unwind:	"$"+params.unwind
					});
				}
				
				Gamify.log("rules", rules);
				
				
				scope.mongo.aggregate({
					collection:	params.collection,
					rules:		rules
				}, function(response) {
					Gamify.log("response",response);
					
					// Transform
					var output = [];
					
					switch (params.type) {
						default:
						case "day":
							_.each(response, function(item) {
								item.date 		= new Date(item._id.y, item._id.m-1, item._id.d).getTime();
								output.push({
									sorter:		item.date,
									date_parts:	item._id,
									value:		item.total,
									label:		(item._id.m-1)+"/"+item._id.d+"/"+item._id.y
								});
							});
						break;
						case "weekday":
							var days = ['Monday','Tuesday','Wednesday','Thursday','Friday', 'Saturday', 'Sunday'];
							_.each(response, function(item) {
								output.push({
									sorter:		item._id.d,
									date_parts:	item._id,
									value:		item.total,
									label:		days[item._id.d-1]
								});
							});
						break;
						case "month":
							var months = ['January','February','March','April','May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
							_.each(response, function(item) {
								output.push({
									sorter:		new Date(item._id.y, item._id.m-1).getTime(),
									date_parts:	item._id,
									value:		item.total,
									label:		months[item._id.m-1]+" "+item._id.y
								});
							});
						break;
						case "hour":
							_.each(response, function(item) {
								output.push({
									sorter:		item._id.h,
									date_parts:	item._id,
									value:		item.total,
									label:		item._id.h
								});
							});
						break;
						case "weekdayhour":
							var days = ['Monday','Tuesday','Wednesday','Thursday','Friday', 'Saturday', 'Sunday'];
							_.each(response, function(item) {
								output.push({
									sorter:		(item._id.d+"."+(item._id.h<=9?"0"+item._id.h:item._id.h))*1,
									date_parts:	item._id,
									value:		item.total,
									label:		days[item._id.d-1]+" "+item._id.h+"h"
								});
							});
						break;
					}
					
					// Sort
					output = output.sort(function(a, b) {
						return a.sorter-b.sorter;
					});
					
					callback(output);
				});
			}
		}
		
	};
	
	// Init a connection
	this.mongo		= new this.Gamify.mongo({database:Gamify.settings.db});
	this.mongo_old	= new this.Gamify.mongo({database:'fleetwit'});
	this.mongo.init(function() {
		scope.mongo_old.init(function() {
			callback(methods);
		});
	});
}
exports.api = api;