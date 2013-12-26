$(function() {
	$('body').on('keydown','[data-enter]',function(e) {
		e.stopImmediatePropagation();
		if (e.keyCode == 13) {
			$($(this).attr('data-enter')).click();
		}
	});
});


var dev = false;

if (dev) {
	var IP 		= "127.0.0.1";
	var port	= 8080;
} else {
	var IP 		= "67.43.2.92";
	var port	= 80;	
}


angular.module('bioradApp', ['ngRoute']).filter('escape', function() {
  return encodeURIComponent;
}).factory("shared", function(){
  return {};
}).factory('UserApi', function($http) {
	
	
	return {
		login: function(email, password, callback) {
			var promise = $http.jsonp("http://"+IP+":"+port+"/api/user/getAuthToken/jsonp?callback=JSON_CALLBACK&user="+escape(JSON.stringify({email:email+'@bio-rad.com',password:password}))).then(function(response) {
				data = response.data;
				if (data.error) {
					alert(data.error.message);
					return false;
				} else {
					return data;
				}
			});
			return promise;
		},
		validateAuthtoken: function(authtoken, callback) {
			var promise = $http.jsonp("http://"+IP+":"+port+"/api/user/validateAuthToken/jsonp?callback=JSON_CALLBACK&authtoken="+escape(authtoken)).then(function(response) {
				data = response.data;
				if (!data.valid) {
					return false;
				} else {
					return data;
				}
			});
			return promise;
		},
		activate: function(uid, callback) {
			var promise = $http.jsonp("http://"+IP+":"+port+"/api/user/activate/jsonp?callback=JSON_CALLBACK&uid="+escape(uid)).then(function(response) {
				data = response.data;
				if (data.error) {
					alert(data.error.message);
					return false;
				} else {
					return data;
				}
			});
			return promise;
		},
		register: function(firstname, lastname, email, password, callback) {
			var promise = $http.jsonp("http://"+IP+":"+port+"/api/user/create/jsonp?callback=JSON_CALLBACK&data="+escape(JSON.stringify({email:email+'@bio-rad.com',password:password,firstname:firstname,lastname:lastname}))).then(function(response) {
				data = response.data;
				if (data.error) {
					alert(data.error.message);
					return false;
				} else {
					return data;
				}
			});
			return promise;
		},
		get: function(query, callback) {
			var promise = $http.jsonp("http://"+IP+":"+port+"/api/user/find/jsonp?callback=JSON_CALLBACK&query="+JSON.stringify(query)).then(function(response) {
				if (response.data.length > 0) {
					return response.data[0];
				} else {
					return false;
				}
			});
			return promise;
		},
		send: function(authtoken, emails, message, signature, callback) {
			var promise = $http.jsonp("http://"+IP+":"+port+"/api/email/send/jsonp?callback=JSON_CALLBACK&authtoken="+escape(authtoken)+"&emails="+JSON.stringify(emails)+"&message="+escape(message)+"&signature="+escape(signature)).then(function(response) {
				data = response.data;
				if (data.error) {
					alert(data.error.message);
					return false;
				} else {
					return data;
				}
			});
			return promise;
		}
	};

}).config(function($routeProvider) {
	$routeProvider
	.when('/', {
		controller:'loginCtrl',
		templateUrl:'../app/stats/login.html'
	})
	.when('/stats', {
		controller:'statsCtrl',
		templateUrl:'../app/stats/stats.html'
	})
	.otherwise({
		redirectTo:'/'
	});
}).controller('loginCtrl', function($scope, $routeParams, $location, UserApi, shared) {
	
	$scope.login 		= "Comfrance";
	$scope.password 	= "Bio-Rad2014";
	
	var login_hash 		= "3d20a267bc208479fe631b45fee717bc";
	var password_hash 	= "d6dbffb927867b509cbcf54d921d3a8e";
	
	$scope.loading 		= false;
	
	$("body").addClass("narrow");
	
	$scope.statslogin = function() {
		$scope.loading 		= true;
		$("#login-form").formapi({
			success: 		function(response) {
				if (CryptoJS.MD5($scope.login).toString() == login_hash && CryptoJS.MD5($scope.password).toString() == password_hash) {
					shared.allowed = "22ee71e9dcc9ca12fc313c6e1ce3f806";
					$location.path("stats");
				} else {
					alert("Access refused. Please verify you entered the right login and password. Entry is case-sensitive.");
				}
			},
			fail:			function() {
				alert("Please fill the form.");
			}
		});
		
		
	};
}).controller('statsCtrl', function($scope, $location, UserApi, shared) {
	
	$("body").removeClass("narrow");
	
	if (shared.allowed != "22ee71e9dcc9ca12fc313c6e1ce3f806") {
		$location.path("/");
	}
	
	var syskey = "sys540f40c9968814199ec7ca847ec45";
	
	statsHelper.histogram({
		scope:			$scope,
		variable:		"user_growth",
		container:		"user.growth",
		transform:	function(label) {
			return label;
		},
		title:		"User Growth",
		y:			"Registered users",
		type:		"area",
		cumulative:	true,
		datasets: [{
			label:	"New Users",
			query:	{
				authtoken:	syskey,
				query:		JSON.stringify({}),
				datefield:	"register_date",
				type:		"day",
				collection:	"users"
			}
		}]
	});
	
	statsHelper.histogram({
		scope:			$scope,
		variable:		"user_new",
		container:		"user.new",
		transform:	function(label) {
			return label;
		},
		title:		"New users",
		y:			"Registered users",
		type:		"column",
		datasets: [{
			label:	"New Users",
			query:	{
				authtoken:	syskey,
				query:		JSON.stringify({}),
				datefield:	"register_date",
				type:		"day",
				collection:	"users"
			}
		}]
	});
	
	statsHelper.histogram({
		scope:			$scope,
		variable:		"cards_growth",
		container:		"cards.growth",
		transform:	function(label) {
			return label;
		},
		title:		"Cards sent (cumulative)",
		y:			"Number of cards sent",
		type:		"area",
		cumulative:	true,
		datasets: [{
			label:	"Cards Sent",
			query:	{
				authtoken:	syskey,
				query:		JSON.stringify({}),
				datefield:	"date",
				type:		"day",
				collection:	"cards"
			}
		}]
	});
	
	statsHelper.histogram({
		scope:			$scope,
		variable:		"cards_sent",
		container:		"cards.sent",
		transform:	function(label) {
			return label;
		},
		title:		"Cards Sent",
		y:			"Number of cards sent",
		type:		"column",
		datasets: [{
			label:	"Cards Sent",
			query:	{
				authtoken:	syskey,
				query:		JSON.stringify({}),
				datefield:	"date",
				type:		"day",
				collection:	"cards"
			}
		}]
	});
	
	statsHelper.histogram({
		scope:			$scope,
		variable:		"cards_views",
		container:		"cards.views",
		transform:	function(label) {
			return label;
		},
		title:		"Cards seen",
		y:			"Number of cards seen",
		type:		"column",
		datasets: [{
			label:	"Cards seen",
			query:	{
				authtoken:	syskey,
				query:		JSON.stringify({}),
				datefield:	"viewdates",
				type:		"day",
				collection:	"recipient",
				unwind:		"viewdates"
			}
		}]
	});
	
	$.apicall({
		method:	"stats.biorad_users",
		params: {
			authtoken:	syskey
		},
		callback:	function(data) {
			$scope.users = data;
			$scope.$apply();
		}
	});
	
})
;

$(function() {
	$.extend({
		
		cookie:		function(name,value,days) {
			if (days) {
				var date = new Date();
				date.setTime(date.getTime()+(days*24*60*60*1000));
				var expires = "; expires="+date.toGMTString();
			} else{
				var expires = "";
			}
			
			document.cookie = name+"="+value+expires+"; path=/;"; //  domain=.example.com
		},
		getCookie:	function(name) {
			var nameEQ = name + "=";
			var ca = document.cookie.split(';');
			for(var i=0;i < ca.length;i++) {
				var c = ca[i];
				while (c.charAt(0)==' ') c = c.substring(1,c.length);
				if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
			}
			return null;
		},
		
		location:		function(page) {
			//console.trace();
			document.location = __GLOBAL__.base+page;
		},
		
		refresh:		function(page) {
			document.location = document.location;
		},
		
		attributes: function(el, deep) {
			var attributes = {};
		
			$.each($(el)[0].attributes, function( index, attr ) {
				attributes[ attr.name ] = attr.value;
			} );
			
			if (!deep) {
				return attributes;
			} else {
				var i;
				var j;
				var output = {};
				for (i in attributes) {
					var obj = i.split('-');
					var pointer = output;
					for (j=0;j<obj.length;j++) {
						if (!pointer[obj[j]]) {
							pointer[obj[j]] = (j==obj.length-1)?attributes[i]:{};
						}
						pointer = pointer[obj[j]];
					}
				}
				return output;
			}
		},
		
		parse:	function(str, data) {
			var label;
			
			for (label in data) {
				str = str.replaceAll('%'+label+'%', data[label]);
			}
			
			return str;
		},
		
		// JSONP API Call function
		apicall:	function(options) {
			/*
			method,
			params
			*/
			options = $.extend({
				method:		"",
				params:		{},
				callback:	function(data) {},
				onFail:		function(msg) {}
			},options);
			
			var split 	= options.method.split(".");
			var api		= {
				endpoint:	split[0],
				method:		split[1]
			};
			
			$.ajax({
				url: 		"http://"+IP+":"+port+"/api/"+api.endpoint+"/"+api.method+"/jsonp",		// static url for the API calls
				dataType: 	'jsonp',
				type:		"GET",
				data:		options.params,
				success: 	function(data){
					// check for error
					if (data.error) {
						if (data.error && data.error.message) {
							options.onFail(data.error.message);
							return false;
						} else {
							options.onFail("Unknown error loading the data");
							return false;
						}
					}
					options.callback(data);
				},
				error: function(jqXHR, data, errorThrown) {
					options.onFail("Response Format Error");
				}
			});
			
		},
		
		nth:	function(number) {
			number 		= number*1;
			var str 	= number.toString();
			var end		= str.substr(-1,1)*1;
			
			var suffix = "th";
			
			switch (end) {
				case 1:
					suffix = "st";
				break;
				case 2:
					suffix = "nd";
				break;
				case 3:
					suffix = "rd";
				break;
				case 4:
				default:
					suffix = "th";
				break;
			}
			
			// Exceptions
			switch (number) {
				case 11:
				case 12:
				case 13:
				suffix = "th";
				break;
			}
			
			return str+suffix;
		}
	});
});