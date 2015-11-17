define([
	'd3'
], function(
	d3
) {
	var svg = null;
	var activityData = null;
	var chartX = null;
	var userInfo = null;
	var tooltip = null;

	// for debug
	var timeLimit = {
		start: new Date('2015-02-11'),
		end: new Date('2015-02-22')
	};
	// alternative:
	// var timeLimit = {};

	var params = {
		lineHeight: 20,
		chartWidth: 0
	};

	var colorMap = {
		'Claim': 0,
		'Vote - categorize': 1,
		'Vote - prioritize': 2,
		'Vote - improve': 3,
		'question': 4,
		'comment': 5
	};
	var module = {
		updateDimensions: function() {
			params.chartWidth = $('#activities-chart .area').width() - 200;
			params.chartHeight = params.lineHeight * Object.keys(activityData).length + 30;
			$('#activities-chart .area').css('height', params.chartHeight);
		},
		init: function() {
			svg = d3.select('#activities-chart')
				.append('svg')
				.attr('class', 'area')
				.append('g')
				.attr('transform', 'translate(0, 10)');

			tooltip = d3.select('body')
				.append('div')
				.attr('class', 'vis-tooltip ui segment');

			d3.xhr('/api_vis/')
				.header('Content-Type', 'application/json')
				.post(JSON.stringify({
					'activity_type': 'all',
					'data_format': 'simple'
				}), function(error, data) {
					if (error) {
						return; // TODO
					}
					var response = JSON.parse(data.response);
					activityData = response.activityData;
					userInfo = response.users;
					module.updateDimensions();
					chartX = d3.time.scale()
						.range([0, params.chartWidth]);

					$.extend({
						start: response['time_start'],
						end: response['time_end']
					}, timeLimit);

					chartX.domain([timeLimit['start'], timeLimit['end']]);
					updateChart();
				});
		}
	};
	function updateChart() {
		var color = d3.scale.category10(); // for people

		var user_ids = Object.keys(activityData);
		for (var i = 0; i < user_ids.length; i ++) {
			var user_id = user_ids[i];

			svg.append('line')
				.attr('class', 'vis-grid')
				.attr('x1', 0)
				.attr('x2', params.chartWidth)
				.attr('y1', i * params.lineHeight)
				.attr('y2', i * params.lineHeight);

			var point_data = activityData[user_id];
			var g = svg.append('g').attr('class', 'vis-user');
			var circles = g.selectAll('circle')
				.data(point_data)
				.enter()
				.append('circle');

			circles
				.attr('cx', function(data) {
					if (typeof data['created_at'] == 'undefined') {
						this.remove();
					} else {
						return chartX(new Date(data['created_at']));
					}
				})
				.attr('cy', i * params.lineHeight)
				.attr('r', '5')
				.style('fill', function(d) {
					return color(colorMap[d['entry_type']]);
				})
				.on('mouseover', function() {
					return tooltip.style('visibility', 'visible');
				})
				.on('mousemove', function(data) {
					var html = 'Click to reveal source.'
						+ 'User: ' + $(this).parent().next().text()
						+ 'Activity type: ' + data['entry_type']
						+ 'Time: ' + d3.time.format("%m/%d/%Y %H:%M:%S")(new Date(data['created_at']));
					return tooltip
						.style('top', (d3.event.clientY - 10)+'px')
						.style('left', (d3.event.clientX + 10)+'px')
						.text(html);
				})
				.on('mouseout', function() {
					return tooltip.style('visibility', 'hidden');
				});
			svg.append('text')
				.attr('class', 'vis-username')
				.text(userInfo[user_id])
				.attr('x', params.chartWidth)
				.attr('y', i * params.lineHeight)
				.attr('dx', 5) // left padding
				.attr('dy', 7) // move down by half of its font-size
				.attr('fill', function() {
					return color(i);
				});
		}

		var tickInfo = getTickInfo();
		var xAxis = d3.svg.axis()
			.scale(chartX)
			.orient('bottom')
			.ticks(tickInfo.tickinterval)
			.tickSize(8, 0)
			.tickFormat(tickInfo.tickformat);

		svg.append('g')
			.attr('class', 'xaxis')
			.attr('transform', 'translate(0,' + user_ids.length * params.lineHeight + ')')
			.call(xAxis)
			.selectAll('text')
			.attr('y', 4)
			.attr('x', 4)
			.style('text-anchor', 'start');

		svg.append('line')
			.attr('class', 'vis-bottom')
			.attr('x1', 0)
			.attr('x2', params.chartWidth)
			.attr('y1', user_ids.length * params.lineHeight)
			.attr('y2', user_ids.length * params.lineHeight);
	}

	function getTickInfo() {
		// d3 time formating: https://github.com/mbostock/d3/wiki/Time-Formatting
		var timeDelta = timeLimit['end'] - timeLimit['start'];
		var numDays = Math.floor(timeDelta / (3600 * 24 * 1000));
		if (numDays >= 4.0) {
			return {
				tickformat: d3.time.format('%m/%d'),
				tickinterval: d3.time.days
			}
		} else {
			return {
				tickformat: d3.time.format('%I:%M %p'),
				tickinterval: d3.time.hours
			}
		}
	}

	return module;
});

