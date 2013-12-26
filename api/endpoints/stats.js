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
		
		race_users: {
			require:		['race'],
			auth:			"sys",
			description:	"Get user stats for a race",
			params:			{},
			status:			'dev',
			version:		1,
			callback:		function(params, req, res, callback) {
				
				var stack = new Gamify.stack();
				
				var stats = {};
				
				// Get the list of uids first
				scope.mongo.distinct({
					collection:	'userlogs',
					query:	{
						action:		"race.register",
						race:		params.race
					},
					key:	"uid"
				}, function(uids) {
					// Count users
					stack.add(function(p, onProcessed) {
						scope.mongo.count({
							collection:	'users',
							query:		{
								uid: {
									$in:	uids
								}
							}
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
								},
								uid: {
									$in:	uids
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
								},
								uid: {
									$in:	uids
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
								"metadatas.gender":	"male",
								uid: {
									$in:	uids
								}
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
								"metadatas.gender":	"female",
								uid: {
									$in:	uids
								}
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
								},
								uid: {
									$in:	uids
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
				});
				
				
				
			}
		},
		
		survey: {
			require:		['race'],
			auth:			"sys",
			description:	"Get survey stats for a race",
			params:			{race:"race's alias", query:"filter"},
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
				
				// remove empty query parameters
				for (i in params.query) {
					if (params.query[i] == '' && params.query[i] !== 0) {
						delete params.query[i];
					}
				}
				
				
				var stack = new Gamify.stack();
				
				
				// Get the race data
				var race = Gamify.data.races.getByAlias(params.race);
				
				// Get the survey
				var survey = race.survey;
				
				var stats 	= [];
				
				var respondents	= 0;
				
				
				stack.add(function(p, onProcessed) {
					scope.mongo.count({
						collection:	'surveys',
						query:		_.extend({},params.query,{
							race:	params.race
						})
					}, function(count) {
						respondents = count;
						onProcessed();
					});
				}, {i:i});
				
				
				_.each(survey, function(question) {
					
					for (i in question) {
						
						switch (question[i].type) {
							default:
							case "varchar":
								stack.add(function(p, onProcessed) {
									scope.mongo.distinct({
										collection:	'surveys',
										query:		_.extend({},params.query,{
											race:	params.race
										}),
										key:		"data."+p.i
									}, function(responses) {
										stats.push({
											id:			p.i,
											type:		"list",
											islist:		true,
											label:		question[p.i].label,
											data:		responses
										});
										onProcessed();
									});
								}, {i:i});
							break;
							case "radio":
								var j;
								stack.add(function(p, onProcessed) {
									
									var buffer = {
										id:			p.i,
										type:		"radio",
										isradio:	true,
										label:		question[p.i].label,
										data:		{},
										count:		0
									};
									
									var substack = new Gamify.stack();
									
									_.each(question[p.i].list, function(list_item) {
										var query = {
											race:	params.race
										};
										query["data."+p.i] = list_item.value;
										
										query = _.extend({},params.query,query);
										
										substack.add(function(subp, onSubProcessed) {
											scope.mongo.count({
												collection:	'surveys',
												query:		subp.query
											}, function(count) {
												
												subp.buffer.data[list_item.value] = count;
												subp.buffer.count += count;
												
												onSubProcessed();
											});
										},{query:query,buffer:buffer});
										
										
									});
									
									substack.process(function() {
										stats.push(buffer);
										onProcessed();
									}, true);	// async
																		
								}, {i:i});
							break;
							case "checkbox":
								var j;
								stack.add(function(p, onProcessed) {
									
									scope.mongo.aggregate({
										collection:	"surveys",
										rules: [{
											$match:	_.extend({},params.query,{
												race:	params.race
											})
										},{
											$unwind:	"$data."+p.i
										},{
											$group:	{
												_id:	"$data."+p.i,
												total:	{
													$sum: 1
												}
											}
										}]
									}, function(data) {
										var output 	= {};
										var total 	= 0;
										
										_.each(data, function(item) {
											output[item._id] = item.total;
											total += item.total;
										});
										
										stats.push({
											id:			p.i,
											type:		"list",
											ischeckbox:	true,
											label:		question[p.i].label,
											data:		output,
											count:		total
										});
										onProcessed();
									});
																		
								}, {i:i});
							break;
						}
					}
				});
				
				// Process the filters
				var filters = {
					age:			[],
					agerange:		[],
					city:			[],
					country:		[],
					gender:			[],
					state:			[],
					timezone:		[],
					played_arcade:	[],
					played_live:	[]
				};
				
				var filter;
				for (filter in filters) {
					stack.add(function(p, onProcessed) {
						
						var query = {
							race:	params.race
						};
						query = _.extend({},params.query,query);
						
						Gamify.log("----------query", query);
						
						scope.mongo.distinct({
							collection:	'surveys',
							query:		query,
							key:		"metas."+p.filter
						}, function(list) {
							
							if (list.length > 0) {
								if (typeof list[0] == "number") {
									list = list.sort(function(a,b) {
										return a - b;
									});
								} else {
									list = list.sort();
								}
								
							}
							
							
							
							filters[p.filter] = list;
							onProcessed();
						});
					}, {filter:filter});
				}
				
				stack.process(function() {
					callback({
						stats:		stats,
						filters:	filters,
						count:		respondents
					});
				}, false);	// sync
				
			}
		},
		
		demography: {
			require:		['collection'],
			auth:			"sys",
			description:	"Get demography stats for a race",
			params:			{collection:"Mongo Collection", query:"Filter", key: "Meta key", filters:"Array", unique:"Unique field"},
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
				
				if (!params.key) {
					params.key = "metas";
				}
				if (!params.filters) {
					params.filters = ["age","agerange","city","country","gender","state","timezone","played_arcade","played_live"];
				}
				
				params.group = {
					played_arcade:	[
						0,
						[1,5],
						[6,10],
						[11,20],
						[21,50],
						[50,false]
					],
					played_live:	[
						0,
						[1,5],
						[6,10],
						[11,20],
						[21,50],
						[50,false]
					]
				};
				
				// Convert query parameters (auto-convert values to ints when possible)
				params.query	= scope.Gamify.api.fixTypes(params.query, {});
				
				
				// remove empty query parameters
				for (i in params.query) {
					if (params.query[i] == '' && params.query[i] !== 0 &&  params.query[i] !== false) {
						delete params.query[i];
					}
				}
				
				Gamify.log("params (2)",params);
				
				var stack = new Gamify.stack();
				
				
				// Process the filters
				var filters = {};
				_.each(params.filters, function(filter) {
					filters[filter] = [];
				});
				
				var stats = {};
				for (filter in filters) {
					stack.add(function(p, onProcessed) {
						
						// db.surveys.aggregate({$match: {race: "launchrace"}}, {$project: {text: "$metas.agerange"}}, {$group: {_id: '$text', "total": {$sum: 1}}})
						if (params.unique) {
							
							scope.mongo.aggregate({
								collection:	params.collection,
								rules:		[{
									$match: params.query,
								}, {
							   		$group: {
								        _id: {uid: '$uid', groupkey: "$"+params.key+"."+p.filter}
								    }
								},{
									 $group: {
								        _id: '$_id.groupkey',
								        total : {
								            $sum: 1
								        }
								    }
								}]
							}, function(output) {
								if (output && output.length > 0) {
									stats[p.filter] = {};
									_.each(output, function(line) {
										stats[p.filter][line['_id']] = line.total;
									});
								}
								
								onProcessed();
							});
							
							
						} else {
							scope.mongo.aggregate({
								collection:	params.collection,
								rules:		[{
									$match: params.query,
								}, {
									$project: {
										text: 	"$"+params.key+"."+p.filter
									}
								}, {
									$group: {
										_id: 	'$text',
										total: 	{
											$sum: 1
										}
									}
								}]
							}, function(output) {
								if (output && output.length > 0) {
									stats[p.filter] = {};
									_.each(output, function(line) {
										stats[p.filter][line['_id']] = line.total;
									});
								}
								
								onProcessed();
							});
						}
					}, {filter:filter});
				}
				
				stack.process(function() {
					stats = scope.Gamify.api.groupAggregates(stats, params.group);
					
					callback({
						stats:		stats
					});
				}, false);	// sync
				
			}
		},
		
		active: {
			require:		[],
			auth:			"sys",
			description:	"Get demography stats for a race",
			params:			{query:"Filter"},
			status:			'dev',
			version:		1,
			callback:		function(params, req, res, callback) {
				
				Gamify.log("params (1)",params);
				
				var i;
				
				params	= scope.Gamify.api.fixTypes(params, {
					query:		'object'
				});
				
				if (!params.query) {
					params.query = {};
				}
				
				// Convert query parameters (auto-convert values to ints when possible)
				params.query	= scope.Gamify.api.fixTypes(params.query, {});
				
				Gamify.log("params (2)",params);
				
				// remove empty query parameters
				for (i in params.query) {
					if (params.query[i] == '' && params.query[i] !== 0 &&  params.query[i] !== false) {
						delete params.query[i];
					}
				}
				
				var stack = new Gamify.stack();
				
				var periods = [1, 2, 7, 30, 60];
				
				var output = [];
				
				_.each(periods, function(period) {
					stack.add(function(p, onProcessed) {
						var date = new Date( new Date().getTime()-(p.period*24*60*60*1000) );
						
						scope.mongo.count({
							collection:	"users",
							query:	{
								"data.recent_activity": {
									$gt:	date
								}
							}
						}, function(count) {
							output.push({
								days:	p.period,
								count:	count
							});
							
							onProcessed();
						});
					}, {period:period});
				});
				
				stack.process(function() {
					callback(output);
				}, false);	// sync
				
			}
		},
		
		levels: {
			require:		['race'],
			auth:			"sys",
			description:	"Get level/game stats for a race",
			params:			{query:"Filter", live:"boolean"},
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
				
				params.query.race = params.race;
				
				if (params.live) {
					params.query.live = true;
				}
				
				// Convert query parameters (auto-convert values to ints when possible)
				params.query	= scope.Gamify.api.fixTypes(params.query, {});
				
				// remove empty query parameters
				for (i in params.query) {
					if (params.query[i] == '' && params.query[i] !== 0 &&  params.query[i] !== false) {
						delete params.query[i];
					}
				}
				
				var stack = new Gamify.stack();
				
				var race = Gamify.data.races.getByAlias(params.race);
				
				
				
				scope.mongo.aggregate({
					collection:	"scores",
					rules:		[{
						$match: params.query,
					}, {
						$unwind: "$scores"
					}, {
						$group: {
							_id: "$scores.level",
							time_avg: {
								$avg: "$scores.time"
							},
							time_min: {
								$min: "$scores.time"
							},
							time_max: {
								$max: "$scores.time"
							},
							score_avg: {
								$avg: "$scores.score"
							},
							score_min: {
								$min: "$scores.score"
							},
							score_max: {
								$max: "$scores.score"
							}
						}
					}]
				}, function(response) {
					
					// Set the name of the level
					var output = [];
					_.each(response, function(item) {
						_.each(race.games, function(game) {
							if (game.o == item._id) {
								item.game = game.name;
								item.level 	= item._id;
							}
						});
						
						output.push(item);
						
					});
					
					output = output.sort(function(a,b) {
						return a.level - b.level;
					});
					
					
					callback(output);
				});
			}
		},
		
		optins: {
			require:		['race'],
			auth:			"sys",
			description:	"Get optins stats and associated emails",
			params:			{query:"Filter"},
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
				
				params.query.race = params.race;
				
				// Convert query parameters (auto-convert values to ints when possible)
				params.query	= scope.Gamify.api.fixTypes(params.query, {});
				
				// remove empty query parameters
				for (i in params.query) {
					if (params.query[i] == '' && params.query[i] !== 0 &&  params.query[i] !== false) {
						delete params.query[i];
					}
				}
				
				var stack = new Gamify.stack();
				
				var race = Gamify.data.races.getByAlias(params.race);
				
				var output = {};
				
				// get the % of optins
				stack.add(function(p, onProcess) {
					scope.mongo.aggregate({
						collection:	"userlogs",
						rules:		[{
							$match: params.query,
						}, {
							$group: {
								_id: "$data.optin",
								total: {
									$sum: 1
								}
							}
						}]
					}, function(response) {
						
						var buffer = {
							total:	0
						};
						_.each(response, function(item) {
							buffer[item._id] = item.total;
							buffer.total += item.total;
						});
						
						output.stats = buffer;
						onProcess();
						
					});
				},{});
					
					
				// get the optins
				stack.add(function(p, onProcess) {
					scope.mongo.distinct({
						collection:	"userlogs",
						key:		'uid',
						query:		_.extend(params.query,{
							"data.optin": "true"
						})
					}, function(response) {
						
						// Get the emails
						scope.mongo.distinct({
							collection:	"users",
							key:		'email',
							query:		{
								uid:	{
									$in: response
								}
							}
						}, function(response) {
							output.emails = response;
							onProcess();
						});
						
					});
				},{});
				
				stack.process(function() {
					callback(output);
				}, false);	// sync
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