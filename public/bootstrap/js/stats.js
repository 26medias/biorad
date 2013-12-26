var statsHelper = {
	histogram:	function(options) {
		
		options = $.extend({
			transform:	function(label) {
				return label;
			},
			cumulative:	false,
			datasets:	[],
			type:		"area",
			container:	"chart",
			title:		"Chart TItle",
			y:			"Y axis label"
		},options);
		
		var stack = new Stack();
		
		var i;
		var l = options.datasets.length;
		
		var datapoints = [];
		
		for (i=0;i<l;i++) {
			stack.add(function(params, onProcessed) {
				$.apicall({
					method:	"stats.histogram",
					params: options.datasets[params.i].query,
					callback:	function(data) {
						var points = [];
						var l = data.length;
						for (i=0;i<l;i++) {
							points.push({
								y:			data[i].value,
								label:		options.transform(data[i].label)
							});
						}
						datapoints.push(points);
						
						onProcessed();
					}
				});
			},{i:i});
		}
		
		stack.process(function() {
			
			
			var inArray = function(array, value) {
				var i;
				var l = array.length;
				for (i=0;i<l;i++) {
					if (array[i] == value) {
						return true;
					}
				}
				return false;
			}
			var keyFound = function(array, label, value) {
				var i;
				var l = array.length;
				for (i=0;i<l;i++) {
					if (array[i][label] == value) {
						return i;
					}
				}
				return false;
			}
			var fillArray = function(n, v) {
				var i;
				var array = [];
				for (i=0;i<n;i++) {
					array.push(v);
				}
				return array;
			}
			
			var indexed = function(n, x, obj, array, key, key2) {
				var i;
				var l = array.length;
				for (i=0;i<l;i++) {
					if (!obj[array[i][key]]) {
						obj[array[i][key]] = fillArray(n,0);
					}
					obj[array[i][key]][x] = array[i][key2];
				}
				return obj;
			}
			
			var i;
			var j;
			var l;
			var l2;
			var key;
			
			
			// Normalize the datasets (detect and fix missing dates)
			l = datapoints.length;
			var indexedObj = {};
			for (i=0;i<l;i++) {
				indexed(l, i, indexedObj, datapoints[i], "label", "y");
			}
			
			// Rebuild the datasets
			var datapoints_normalized = [];
			l = datapoints.length;
			for (j=0;j<l;j++) {
				var buffer = [];
				for (i in indexedObj) {
					buffer.push({
						label:	i,
						y:		indexedObj[i][j]
					});
				}
				datapoints_normalized.push(buffer);
			}
			
			// Cumulate the values
			if (options.cumulative) {
				l = datapoints_normalized.length;
				for (j=0;j<l;j++) {
					var total = 0;
					l2 = datapoints_normalized[j].length;
					for (i=0;i<l2;i++) {
						total += datapoints_normalized[j][i].y;
						datapoints_normalized[j][i].y = total;
					}
				}
			}
			
			
			datapoints = datapoints_normalized;
			
			var merged = [];
			
			l = datapoints.length
			for (i=0;i<l;i++) {
				l2 = datapoints[i].length;
				for (j=0;j<l2;j++) {
					key = keyFound(merged, 'label', datapoints[i][j].label);
					if (key !== false) {
						merged[key].y[i] = datapoints[i][j].y;
					} else {
						var obj 	= {};
						obj.label 	= datapoints[i][j].label;
						obj.y		= fillArray(l,"-");
						obj.y[i] 	= datapoints[i][j].y;
						merged.push(obj);
					}
				}
			}
			
			options.scope[options.variable] = merged;
			options.scope['$apply']();
			
			
			var dataset = [];
			
			i;
			l = datapoints.length;
			for (i=0;i<l;i++) {
				dataset.push({
					name:			options.datasets[i].label,
					type: 			options.type,
					showInLegend: 	true,
					dataPoints: 	datapoints[i]
				});
			}
			
			var chart = new CanvasJS.Chart(options.container, {
				title:{
					text: options.title
				},
				axisY: {
					title: 		options.y,
					minimum:	0
				},
				legend:{
					verticalAlign: 		"bottom",
					horizontalAlign: 	"center"
				},
				data: dataset
			});
			chart.render();
		}, false);
		
	},
	aggregates:	function(options) {
		
		options = $.extend({
			transform:	function(label) {
				return label;
			},
			cumulative:	false,
			datasets:	[],
			container:	"chart",
			title:		"Chart TItle",
			y:			"Y axis label",
			type:		"bar"
		},options);
		
		var stack = new Stack();
		
		var i;
		var l = options.datasets.length;
		
		var datapoints = [];
		
		for (i=0;i<l;i++) {
			stack.add(function(params, onProcessed) {
				$.apicall({
					method:	"stats.aggregate_key",
					params: options.datasets[params.i].query,
					callback:	function(data) {
						var points = [];
						var l = data.length;
						for (i=0;i<l;i++) {
							points.push({
								y:			data[i].total,
								label:		options.transform(data[i]._id)
							});
						}
						datapoints.push(points);
						
						onProcessed();
					}
				});
			},{i:i});
		}
		
		stack.process(function() {
			
			
			var inArray = function(array, value) {
				var i;
				var l = array.length;
				for (i=0;i<l;i++) {
					if (array[i] == value) {
						return true;
					}
				}
				return false;
			}
			var keyFound = function(array, label, value) {
				var i;
				var l = array.length;
				for (i=0;i<l;i++) {
					if (array[i][label] == value) {
						return i;
					}
				}
				return false;
			}
			var fillArray = function(n, v) {
				var i;
				var array = [];
				for (i=0;i<n;i++) {
					array.push(v);
				}
				return array;
			}
			
			var indexed = function(n, x, obj, array, key, key2) {
				var i;
				var l = array.length;
				for (i=0;i<l;i++) {
					if (!obj[array[i][key]]) {
						obj[array[i][key]] = fillArray(n,0);
					}
					obj[array[i][key]][x] = array[i][key2];
				}
				return obj;
			}
			
			var i;
			var j;
			var l;
			var l2;
			var key;
			
			
			// Normalize the datasets (detect and fix missing dates)
			l = datapoints.length;
			var indexedObj = {};
			for (i=0;i<l;i++) {
				indexed(l, i, indexedObj, datapoints[i], "label", "y");
			}
			
			// Rebuild the datasets
			var datapoints_normalized = [];
			l = datapoints.length;
			for (j=0;j<l;j++) {
				var buffer = [];
				for (i in indexedObj) {
					buffer.push({
						label:	i,
						y:		indexedObj[i][j]
					});
				}
				datapoints_normalized.push(buffer);
			}
			
			// Cumulate the values
			if (options.cumulative) {
				l = datapoints_normalized.length;
				for (j=0;j<l;j++) {
					var total = 0;
					l2 = datapoints_normalized[j].length;
					for (i=0;i<l2;i++) {
						total += datapoints_normalized[j][i].y;
						datapoints_normalized[j][i].y = total;
					}
				}
			}
			
			
			datapoints = datapoints_normalized;
			
			var merged = [];
			
			l = datapoints.length
			for (i=0;i<l;i++) {
				l2 = datapoints[i].length;
				for (j=0;j<l2;j++) {
					key = keyFound(merged, 'label', datapoints[i][j].label);
					if (key !== false) {
						merged[key].y[i] = datapoints[i][j].y;
					} else {
						var obj 	= {};
						obj.label 	= datapoints[i][j].label;
						obj.y		= fillArray(l,"-");
						obj.y[i] 	= datapoints[i][j].y;
						merged.push(obj);
					}
				}
			}
			
			options.scope[options.variable] = merged;
			options.scope['$apply']();
			
			
			var dataset = [];
			
			i;
			l = datapoints.length;
			for (i=0;i<l;i++) {
				dataset.push({
					name:			options.datasets[i].label,
					type: 			options.type,
					showInLegend: 	true,
					dataPoints: 	datapoints[i]
				});
			}
			
			var chart = new CanvasJS.Chart(options.container, {
				title:{
					text: options.title,
					fontSize: 24,
					thickness: 0
				},
				axisY: {
					title: options.y,
					labelFontSize: 10,
					lineThickness: 0
				},
				axisX:{
	              	interval: 		1,
					labelFontSize: 10,
					lineThickness: 0
				},
				legend:{
					verticalAlign: 		"top",
					horizontalAlign: 	"center"
				},
				data: dataset
			});
			chart.render();
		}, false);
		
	}
};