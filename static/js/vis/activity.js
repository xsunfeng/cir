define([
	'd3',
	'claim/claim',
], function(
	d3,
	ClaimView
) {
	var base_g = null; // the first <g> under <svg>, showing grid and hovered circle
	var canvas_g = null; // the second <g> under <svg>, showing all circles and user names
	var activityData = {}; // a list of {user: '', activityType: '', time: ''}
	var numUsers = 0;
	var chartX = null;
	var userInfo = null;
	var tooltip = null;
	var xAxis = null;
	var nowLine = null;
	var nowDate = null;
	var lastLoginLine = null;
	var lastLoginDate = null;

	// for debug
	//var timeLimit = {
	//	start: new Date('2015-02-11'),
	//	end: new Date('2015-02-22')
	//};
	// alternative:
	var timeLimit = {};
	var initTimeLimit = {};

	var params = {
		lineHeight: 20,
		chartWidth: 0,
		legendWidth: 200,
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
			params.chartWidth = $('#activities-chart .area').width() - params.legendWidth;
			params.chartHeight = params.lineHeight * numUsers + 40;
			$('#activities-chart .area').css('height', params.chartHeight);
			params.chartOffset = $('#activities-chart .area').offset();
			params.chartOffset.top -= $(document).scrollTop();
		},
		init: function() {
			var chartArea = d3.select('#activities-chart');

			if (chartArea.empty()) return; // for visitors, skip everything

			var svg = chartArea
				.append('svg')
				.attr('class', 'area');

			base_g = svg.append('g')
				.attr('transform', 'translate(0, 10)')
				.attr('class', 'base_g');
			canvas_g = svg.append('g')
				.attr('transform', 'translate(0, 10)')
				.attr('class', 'canvas_g');

			tooltip = d3.select('body')
				.append('table')
				.attr('class', 'ui red compact collapsing table')
				.attr('id', 'vis-tooltip');

			$('#activities-wrapper .toggle').click(function() {
				$('#activities-wrapper').toggleClass('minimized');
				module.updateDimensions();
			});

			$('#activities-wrapper .reload.item').click(function() {
				$('#activities-chart').css('opacity', '0.5');
				reloadCanvasData(function() {
					registerMouseNav();
					drawCanvas();
					$('#activities-chart').css('opacity', '1.0');
				});
			});
			$('#activities-wrapper .reset.item').click(function() {
				timeLimit = $.extend({}, initTimeLimit);
				drawCanvas();
			});
			$('#activities-chart').css('opacity', '0.5');
			reloadCanvasData(function() {
				// update mouse wheel events
				registerMouseNav();
				drawBase();
				drawCanvas();
				$('#activities-chart').css('opacity', '1.0');
			});
		}
	};
	function reloadCanvasData(callback) {
		d3.xhr('/api_vis/')
			.header('Content-Type', 'application/json')
			.post(JSON.stringify({
				'activity_type': 'all',
				'data_format': 'simple'
			}), function(error, data) {
				if (error) {
					return;
				}
				var response = JSON.parse(data.response);
				activityData = response.activityData;
				userInfo = response.users;
				numUsers = Object.keys(userInfo).length;
				module.updateDimensions();
				chartX = d3.time.scale()
					.range([0, params.chartWidth]);

				initTimeLimit = {
					start: new Date(response['time_start']),
					end: new Date(response['now'])
				};

				if (!timeLimit.hasOwnProperty('start')) {
					$.extend(timeLimit, initTimeLimit);
				}
				nowDate = new Date(response.now);
				lastLoginDate = new Date(response.last_login);
				if (typeof callback == 'function') callback();
			});
	}
	function registerMouseNav() {
		$('#activities-chart .area').on('mousewheel DOMMouseScroll', function(event) {
			// only scroll in the chart area
			if (event.clientX < params.chartOffset.left
				|| event.clientX > params.chartOffset.left + params.chartWidth
				|| event.clientY < params.chartOffset.top
				|| event.clientY > params.chartOffset.top + params.chartHeight) {
				return;
			}
			var deltaLeft = event.clientX - params.chartOffset.left;
			var deltaRight = params.chartOffset.left + params.chartWidth - event.clientX;

			var scrollSpeed = 30; // the smaller, the faster
			// transform pixel values back to time delta
			if (event.originalEvent.wheelDelta > 0 || event.originalEvent.detail < 0) {
				// zoom out
				timeLimit.start = chartX.invert(-deltaLeft / scrollSpeed);
				timeLimit.end = chartX.invert(params.chartWidth + (deltaRight / scrollSpeed));
			} else {
				// zoom in
				timeLimit.start = chartX.invert(deltaLeft / scrollSpeed);
				timeLimit.end = chartX.invert(params.chartWidth - (deltaRight / scrollSpeed));
			}

			// rescale x axis
			chartX.domain([timeLimit['start'], timeLimit['end']]);

			canvas_g.select('.xaxis')
				.call(xAxis);

			// replace circles
			canvas_g.selectAll('circle').attr('cx', function(data) {
				return chartX(new Date(data['created_at']));
			});

			// replace lines
			nowLine
				.attr('x1', chartX(nowDate))
				.attr('x2', chartX(nowDate));

			if (!isNaN(lastLoginDate.getTime())) {
				lastLoginLine
					.attr('x1', chartX(lastLoginDate))
					.attr('x2', chartX(lastLoginDate));
			}
		});
	}
	function drawCanvas() {
		chartX.domain([timeLimit['start'], timeLimit['end']]);

		canvas_g.selectAll('*').remove();
		drawCircles();

		xAxis = d3.svg.axis()
			.scale(chartX)
			.orient('bottom')
			.ticks(8)
			.tickSize(8, 0);

		canvas_g.append('g')
			.attr('class', 'xaxis')
			.attr('transform', 'translate(0,' + numUsers * params.lineHeight + ')')
			.call(xAxis)
			.selectAll('text')
			.attr('y', 4)
			.attr('x', 4)
			.style('text-anchor', 'start');

		canvas_g.append('line')
			.attr('class', 'vis-bottom')
			.attr('x1', 0)
			.attr('x2', params.chartWidth)
			.attr('y1', numUsers * params.lineHeight)
			.attr('y2', numUsers * params.lineHeight);


		nowLine = canvas_g.append('line')
			.attr('class', 'vis-nowline')
			.attr('x1', chartX(nowDate))
			.attr('x2', chartX(nowDate))
			.attr('y1', 0)
			.attr('y2', numUsers * params.lineHeight)
			.on('mouseover', function() {
				return tooltip
					.style('top', (d3.event.clientY - 10)+'px')
					.style('left', (d3.event.clientX + 10)+'px')
					.html('Current login')
					.style('visibility', 'visible');
			})
			.on('mouseout', function() {
				return tooltip.style('visibility', 'hidden');
			});

		if (!isNaN(lastLoginDate.getTime())) {
			lastLoginLine = canvas_g.append('line')
				.attr('class', 'vis-lastloginline')
				.attr('x1', chartX(lastLoginDate))
				.attr('x2', chartX(lastLoginDate))
				.attr('y1', 0)
				.attr('y2', numUsers * params.lineHeight)
				.on('mouseover', function() {
					return tooltip
						.style('top', (d3.event.clientY - 10)+'px')
						.style('left', (d3.event.clientX + 10)+'px')
						.html('Last login')
						.style('visibility', 'visible');
				})
				.on('mouseout', function() {
					return tooltip.style('visibility', 'hidden');
				});
		}

	}
	function drawBase() {
		var user_ids = Object.keys(activityData);
		for (var i = 0; i < numUsers; i ++) {
			var user_id = user_ids[i];

			// draw shade for yourself
			if (user_id == sessionStorage['user_id']) {
				base_g.append('rect')
					.attr('class', 'vis-myself')
					.attr('x', 0)
					.attr('width', params.chartWidth + params.legendWidth)
					.attr('y', i * params.lineHeight - 7)
					.attr('height', 14);
			}

			// draw horizontal line for each user
			base_g.append('line')
				.attr('class', 'vis-grid')
				.attr('x1', 0)
				.attr('x2', params.chartWidth)
				.attr('y1', i * params.lineHeight)
				.attr('y2', i * params.lineHeight);

			// write user name
			base_g.append('text')
				.attr('class', 'vis-username')
				.text(userInfo[user_id])
				.attr('x', params.chartWidth)
				.attr('y', i * params.lineHeight)
				.attr('dx', 5) // left padding
				.attr('dy', 7); // move down by half of its font-size
		}
		var color = d3.scale.category10();
		$('#activities-wrapper .claim.icon').css('color',  color(colorMap['claim']));
		$('#activities-wrapper .categorize.icon').css('color',  color(colorMap['Vote - categorize']));
		$('#activities-wrapper .prioritize.icon').css('color',  color(colorMap['Vote - prioritize']));
		$('#activities-wrapper .improve.icon').css('color',  color(colorMap['Vote - improve']));
		$('#activities-wrapper .q.icon').css('color',  color(colorMap['question']));
		$('#activities-wrapper .comment.icon').css('color',  color(colorMap['comment']));
	}
	function drawCircles() {
		var color = d3.scale.category10(); // for circles
		var user_ids = Object.keys(activityData);

		for (var i = 0; i < numUsers; i ++) {
			var user_id = user_ids[i];

			var point_data = activityData[user_id];
			var user_g = canvas_g.append('g')
				.attr('class', 'vis-user')
				.attr('data-user-id', user_id);
			var circles = user_g.selectAll('circle')
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
				.on('click', function(d) {
					if (d.entry_type == 'Claim') {
						require('layout/layout').changeTab('claim-tab');
						ClaimView.jumpTo(d.id);
					}
					return;
				})
				.on('mouseover', function() {
					return tooltip.style('visibility', 'visible');
				})
				.on('mousemove', function(data) {
					var html = '<tbody><tr><td><b>User</b></td><td>'
						+ userInfo[$(this).parent().attr('data-user-id')]
						+ '</td></tr><tr><td><b>Activity type</b></td><td>'
						+ data['entry_type']
						+ '</td></tr><tr><td><b>Time</b></td><td>'
						+ d3.time.format("%m/%d/%Y %H:%M:%S")(new Date(data['created_at']))
						+ '</tr></tr><tr><td colspan="2"><b>Click to reveal source.</b></td></tr></tbody>';
					if (base_g.selectAll('.circle-hover').size() == 0) {
						base_g.append('circle')
							.attr('cx', this.getAttribute('cx'))
							.attr('cy', this.getAttribute('cy'))
							.attr('r', '10')
							.attr('style', this.getAttribute('style'))
							.attr('class', 'circle-hover');
					}
					return tooltip
						.style('top', (d3.event.clientY - 10)+'px')
						.style('left', (d3.event.clientX + 10)+'px')
						.html(html);
				})
				.on('mouseout', function() {
					base_g.selectAll('.circle-hover').remove();
					return tooltip.style('visibility', 'hidden');
				});
			canvas_g.append('text')
				.attr('class', 'vis-username')
				.text(userInfo[user_id])
				.attr('x', params.chartWidth)
				.attr('y', i * params.lineHeight)
				.attr('dx', 5) // left padding
				.attr('dy', 7); // move down by half of its font-size
		}
	}
	return module;
});

