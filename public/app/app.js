angular.module('bioradApp', ['ngRoute']).filter('escape', function() {
  return encodeURIComponent;
}).factory("shared", function(){
  return {};
}).factory('UserApi', function($http) {
	
	var IP 		= "127.0.0.1";
	var port	= 8080;
	
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
		}
	};

}).config(function($routeProvider) {
	$routeProvider
	.when('/', {
		controller:'loginCtrl',
		templateUrl:'app/views/login.html'
	})
	.when('/login/:uid', {
		controller:'loginCtrl',
		templateUrl:'app/views/login.html'
	})
	.when('/register', {
		controller:'registerCtrl',
		templateUrl:'app/views/register.html'
	})
	.when('/write', {
		controller:'writeCtrl',
		templateUrl:'app/views/write.html'
	})
	.when('/sent', {
		controller:'sentCtrl',
		templateUrl:'app/views/sent.html'
	})
	.otherwise({
		redirectTo:'/'
	});
}).controller('loginCtrl', function($scope, $routeParams, $location, UserApi, shared) {
	
	$scope.email 		= "julien";
	$scope.password 	= "80803666";
	$scope.loading 		= false;
	
	// Check if we were already logged in
	$scope.authtoken 	= $.getCookie("authtoken");
	
	$scope.uid 			= $routeParams.uid;
	
	$scope.confirmed	 = $routeParams.uid && $routeParams.uid.length > 0;
	
	if ($scope.authtoken) {
		// Try to login
		$scope.loading 		= true;
		UserApi.validateAuthtoken($scope.authtoken).then(function(data) {
			$scope.loading 		= false;
			if (data) {
				// Save the data (again, just to be sure)
				$.cookie("authtoken", 	data.authtoken);
				$.cookie("uid", 		data.uid);
				
				// Save the login info
				shared.user = data;
				console.log("shared.user",shared.user);
				
				// Move to the list of levels 
				$location.path("write");
			}
		});
	}
	
	$scope.login = function() {
		$scope.loading 		= true;
		UserApi.login($scope.email,$scope.password).then(function(data) {
			$scope.loading 		= false;
			if (data) {
				// Save the data
				$.cookie("authtoken", 	data.authtoken);
				$.cookie("uid", 		data.uid);
				
				// Save the login info
				shared.user = data;
				
				// Move to the list of levels
				$location.path("write");
			}
		});
	};
}).controller('registerCtrl', function($scope, $location, UserApi, shared) {
	
	$scope.email 		= "julien";
	$scope.password 	= "80803666";
	$scope.loading 		= false;
	$scope.registered 	= false;
	
	$scope.register = function() {
		$scope.loading 		= true;
		UserApi.register($scope.firstname,$scope.lastname,$scope.email,$scope.password).then(function(data) {
			$scope.loading 		= false;
			if (data) {
				/*// Save the data
				$.cookie("authtoken", 	data.authtoken);
				$.cookie("uid", 		data.uid);
				// Move to the list of levels*/
				$scope.registered = true;
			}
		});
	};
}).controller('writeCtrl', function($scope, $location, UserApi, shared) {
	
	if (!shared.user || !shared.user.authtoken) {
		$location.path("/");
	}
	
	$scope.preview = false;
	
	$scope.message 		= "";
	$scope.signature 	= "";
	
	$scope.emails = [];
	var n = 5;
	var i;
	for (i=0;i<n;i++) {
		$scope.emails.push({email:''});
	}
	
	$scope.send = function() {
		//@TODO: send
		shared.emails 		= [];
		var i;
		var l = $scope.emails.length;
		for (i=0;i<l;i++) {
			if ($scope.emails[i].email != "") {
				shared.emails.push($scope.emails[i].email);
			}
		}
		
		shared.message 		= $scope.message;
		shared.signature 	= $scope.signature;
		$location.path("sent");
	}
}).controller('sentCtrl', function($scope, $location, UserApi, shared) {
	
	if (!shared.user || !shared.user.authtoken) {
		$location.path("/");
	}
	
	$scope.emails 		= _.uniq(shared.emails);
	if ($scope.emails.length == 0) {
		$location.path("write");
	}
	$scope.message 		= shared.message;
	$scope.signature 	= shared.signature;
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