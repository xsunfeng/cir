define([
	'jquery',
	'utils',
	'semantic-ui',
	'd3',
	'crossfilter'
], function(
	$,
	Utils
) {
	var module = {};

	module.Highlight = {};
	module.Highlight.data = {};

	module.init = function() {

		$.ajax({
			url: '/api_dashboard/get_highlights/',
			type: 'post',
			data: {
			},
			success: function(xhr) {
				module.Highlight.data = xhr.highlights;
				drawDot("#dot");
			},
			error: function(xhr) {
				if (xhr.status == 403) {
					Utils.notify('error', xhr.responseText);
				}
			}
		});

		function drawDot(container) {
			function truncate(str, maxLength, suffix) {
				if(str.length > maxLength) {
					str = str.substring(0, maxLength + 1); 
					str = str.substring(0, Math.min(str.length, str.lastIndexOf(" ")));
					str = str + suffix;
				}
				return str;
			}

			var margin = {top: 20, right: 200, bottom: 0, left: 20},
				width = 960,
				height = 650;

			var start_year = 2004,
				end_year = 2013;

			var c = d3.scale.category20c();

			var x = d3.scale.linear()
				.range([0, width]);

			var xAxis = d3.svg.axis()
				.scale(x)
				.orient("top");

			var formatYears = d3.format("0000");
			xAxis.tickFormat(formatYears);

			var svg = d3.select("#dot").append("svg")
				.attr("width", width + margin.left + margin.right)
				.attr("height", height + margin.top + margin.bottom)
				.style("margin-left", margin.left + "px")
				.append("g")
				.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

			var data = [{
					"articles": [[2010, 6], [2011, 10], [2012, 11], [2013, 23], [2006, 1]], 
					"total": 51, 
					"name": "The Journal of neuroscience : the official journal of the Society for Neuroscience"
				}, {
					"articles": [[2008, 1], [2010, 3], [2011, 4], [2012, 17], [2013, 10]], 
					"total": 35, 
					"name": "Nature neuroscience"
				}, {
					"articles": [[2009, 1], [2010, 2], [2011, 8], [2012, 13], [2013, 11]], 
					"total": 35, 
					"name": "PloS one"
				}, {
					"articles": [[2007, 1], [2009, 3], [2010, 5], [2011, 7], [2012, 9], [2013, 9]],
					"total": 34, 
					"name": "Nature"
				}, {
					"articles": [[2009, 2], [2010, 3], [2011, 4], [2012, 8], [2013, 9]], 
					"total": 26, 
					"name": "Neuron"
				}, {
					"articles": [[2009, 2], [2010, 2], [2011, 3], [2012, 9], [2013, 7]], 
					"total": 23, 
					"name": "Proceedings of the National Academy of Sciences of the United States of America"
				}];

				var x = d3.time.scale()
				    .domain([new Date(data[0].date), d3.time.day.offset(new Date(data[data.length - 1].date), 1)])
				    .rangeRound([0, width - margin.left - margin.right]);

				var xAxis = d3.svg.axis()
				    .scale(x)
				    .orient('bottom')
				    .ticks(d3.time.days, 1)
				    .tickFormat(d3.time.format('%a %d'))
				    .tickSize(0)
				    .tickPadding(8);

				x.domain([start_year, end_year]);
				var xScale = d3.scale.linear()
					.domain([start_year, end_year])
					.range([0, width]);

				svg.append("g")
					.attr("class", "x axis")
					.attr("transform", "translate(0," + 0 + ")")
					.call(xAxis);

				for (var j = 0; j < data.length; j++) {
					var g = svg.append("g").attr("class","journal");

					var circles = g.selectAll("circle")
						.data(data[j]['articles'])
						.enter()
						.append("circle");

					var text = g.selectAll("text")
						.data(data[j]['articles'])
						.enter()
						.append("text");

					var rScale = d3.scale.linear()
						.domain([0, d3.max(data[j]['articles'], function(d) { return d[1]; })])
						.range([2, 9]);

					circles
						.attr("cx", function(d, i) { return xScale(d[0]); })
						.attr("cy", j*20+20)
						.attr("r", function(d) { return rScale(d[1]); })
						.style("fill", function(d) { return c(j); });

					text
						.attr("y", j*20+25)
						.attr("x",function(d, i) { return xScale(d[0])-5; })
						.attr("class","value")
						.text(function(d){ return d[1]; })
						.style("fill", function(d) { return c(j); })
						.style("display","none");


					g.append("text")
						.attr("y", j*20+25)
						.attr("x",width+20)
						.attr("class","label")
						.text(truncate(data[j]['name'],30,"..."))
						.style("fill", function(d) { return c(j); })
						.on("mouseover", mouseover)
						.on("mouseout", mouseout);

				function mouseover(p) {
					var g = d3.select(this).node().parentNode;
					d3.select(g).selectAll("circle").style("display","none");
					d3.select(g).selectAll("text.value").style("display","block");
				}

				function mouseout(p) {
					var g = d3.select(this).node().parentNode;
					d3.select(g).selectAll("circle").style("display","block");
					d3.select(g).selectAll("text.value").style("display","none");
				}

			};			
		}

	};

	return module;
});