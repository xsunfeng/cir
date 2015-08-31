$.widget("viz.vizwordcloud", {
	options: {
		section:null
	},
	// updateLemmas: false,
	// forceBuildLda: false,
	_create: function() {
		this.clickedw = [];
		var exist_cld2rv = false;
		var self = this;
		// $("#wordcloud-window").removeClass("hidden");
		$("#wc-slider").slider({
			range: true,
			values: [0, 100]
		});
		

		$("#wc-generate").click(function(event) {
			event.preventDefault();
			
			if(section==null) {
				alert("no section selected!");
				return;
			}
			$.ajax({
				url: '/api_tagFrequency',
				type: "POST",
				success: function(xhr) {
					$(".wc-area").empty();
					self.data = xhr.dataItems;
					self.chart();
				},
				failure: function(xhr) {
					alert("failed to load the entries!")
					
				},
				data: {
					section: section,
					// update: self.updateLemmas,
					// startdate: startDate,
					// starttime: startTime,
					// enddate: endDate,
					// endtime: endTime,
				}
			});
		});
		
	},

	chart: function() {
		var self = this;
		if (self.data == null) { // load data
			$.ajax({
				url: '/api_tagFrequency',
				type: "POST",
				success: function(xhr) {
					self.data = xhr.dataItems;
					// self.startdate = xhr.startdate;
					// self.starttime = xhr.starttime;
					// self.enddate = xhr.enddate;
					// self.endtime = xhr.endtime;
					// self.changeControlValue();
					self._drawWordCloud();
				},
				failure: function(xhr) {
					alert("failed to load the entries!")
					
				},
				data: {
					sections: section,
				}
			});
		} else {
			if (self.data.length != 0) {
				self._drawWordCloud();
			}
		}
	},
	_drawWordCloud: function() {
		var self = this;
		var cloudSize = 400;
		var keyword = [];
		var colors = ["brown", "skyblue", "darkcyan", "gold", "forestgreen", "bisque", "indigo", "lightcoral", "mediumorchid", "olive"];
		
		//var fill = d3.scale.category20b();
		var ScaleText = d3.scale.linear().domain([0, 0.1]).range([16, 100]);
		
		d3.layout.cloud().size([cloudSize, cloudSize]).words(self.data.map(function(d) {
			return {
				text: d.tag,
				size: d.id__count
			};
		})).padding(0).rotate(function() {
			return (Math.random() * 2) * 90;
		}).font("serif").fontSize(function(d) {
			return d.size;
		}).on("end", draw).start();
	
		function draw(words) {
			var currTopic = topicIdx + 1;
			destArea = d3.select("#wc-area")
				.append("svg")
				.attr("width", cloudSize)
				.attr("height", cloudSize)
				.append("g")
				.attr("transform", "translate(" + cloudSize / 2 + "," + cloudSize / 2 + ")")
				.selectAll("text")
				.data(words);
			destArea.enter().append("text").style("font-size", function(d) {
				return d.size + "px";
			}).style("font-family", "serif").style("fill", function(d, i) {
				return colors[d.topic];
			}).attr("text-anchor", "middle").attr("transform", function(d) {
				return "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")";
			}).text(function(d) {
				return d.text;
			}).on("click", function(d, i) {
				// var x = d.text;
				// if ($.inArray(x, self.clickedw) == -1) {
				// 	self.clickedw.push(x);
				// 	d3.select(this).style("stroke", "red").style("stroke-width", 2);
				// } else {
				// 	self.clickedw.splice(self.clickedw.indexOf(x), 1);
				// 	d3.select(this).style("stroke", "red").style("stroke-width", 0);
				// }
			});
		}
	},

	// generateOthers: function(vis) {
	// 	switch (vis) {
	// 		case "Network":
	// 			// alert("Yet to come");
	// 			break;
	// 		case "Map":
	// 			// alert("Yet to come");
	// 			break;
	// 		case "Themeriver":
	// 			// alert(this.clickedw.join());
	// 			$.ajax({
	// 				url: '/visualization/wcld2themerv',
	// 				type: "POST",
	// 				success: function(xhr) {
	// 					console.log(xhr);
	// 					themerv(xhr);
	// 				},
	// 				failure: function(xhr) {
	// 					alert("failed to load the entries!")
	// 				},
	// 				data: {
	// 					Wordlist: this.clickedw.join()
	// 				}
	// 			});

	// 			break;
	// 		case "ThreadedView":
	// 			// alert("Yet to come");
	// 			break;

	// 	}

	// },

	// themerv: function(data) {
	// 	// alert(data[0]['date']);
	// 	chart("orange");

	// 	var datearray = [];
	// 	var colorrange = [];

	// 	function chart(color) {

	// 		if (color == "blue") {
	// 			colorrange = ["#045A8D", "#2B8CBE", "#74A9CF", "#A6BDDB", "#D0D1E6", "#F1EEF6"];
	// 		} else if (color == "pink") {
	// 			colorrange = ["#980043", "#DD1C77", "#DF65B0", "#C994C7", "#D4B9DA", "#F1EEF6"];
	// 		} else if (color == "orange") {
	// 			colorrange = ["#7700ff", "#00bbff", "#ff6d10", "#f9ff38", "#ff3838", "#aaff38"];
	// 		}
	// 		strokecolor = colorrange[0];

	// 		var format = d3.time.format("%m/%d/%y");

	// 		var margin = {
	// 			top: 20,
	// 			right: 40,
	// 			bottom: 30,
	// 			left: 30
	// 		};
	// 		var width = document.body.clientWidth * 2 / 3 - margin.left - margin.right;
	// 		var height = 400 - margin.top - margin.bottom;

	// 		var tooltip = d3.select(".wcld2themerv").append("div").attr("class", "remove").style("position", "absolute").style("z-index", "20").style("visibility", "hidden");
	// 		// .style("top", "30px")
	// 		// .style("left", "55px");

	// 		var x = d3.time.scale().range([0, width]);

	// 		var y = d3.scale.linear().range([height - 10, 0]);

	// 		var z = d3.scale.ordinal().range(colorrange);

	// 		var xAxis = d3.svg.axis().scale(x).orient("bottom");
	// 		// .ticks(d3.time.weeks);

	// 		var yAxis = d3.svg.axis().scale(y);

	// 		var yAxisr = d3.svg.axis().scale(y);

	// 		var stack = d3.layout.stack().offset("silhouette").values(function(d) {
	// 			return d.values;
	// 		}).x(function(d) {
	// 			return d.date;
	// 		}).y(function(d) {
	// 			return d.value;
	// 		});

	// 		var nest = d3.nest().key(function(d) {
	// 			return d.key;
	// 		});

	// 		var area = d3.svg.area().interpolate("cardinal").x(function(d) {
	// 			return x(d.date);
	// 		}).y0(function(d) {
	// 			return y(d.y0);
	// 		}).y1(function(d) {
	// 			return y(d.y0 + d.y);
	// 		});

	// 		if (exist_cld2rv) {
	// 			// $(".wcld2themerv").dialog('widget').removeClass('wcld2themerv').dialog("close");

	// 		} else {
	// 			exist_cld2rv = true;
	// 			$("<div>").addClass('wcld2themerv').dialog($.extend({
	// 				"title": "Themeriver from WordCloud Selection",
	// 				"width": 1260,
	// 				"height": 500,
	// 				"modal": false,
	// 				"resizable": false,
	// 				"draggable": true,
	// 				close: function(event, ui) {
	// 					exist_cld2rv = false;
	// 					$(this).dialog("destroy").remove();
	// 				}
	// 			}));
	// 		}
	// 		d3.select(".wcld2themerv").selectAll("svg").remove();
	// 		var svg = d3.select(".wcld2themerv").append("svg").attr("width", width + margin.left + margin.right).attr("height", height + margin.top + margin.bottom).append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

	// 		// data = JSON.parse(data);

	// 		data.forEach(function(d) {
	// 			d.date = format.parse(d.date);
	// 			d.value = +d.value;
	// 		});

	// 		var layers = stack(nest.entries(data));

	// 		x.domain(d3.extent(data, function(d) {
	// 			return d.date;
	// 		}));
	// 		y.domain([0, d3.max(data, function(d) {
	// 			return d.y0 + d.y;
	// 		})]);

	// 		svg.selectAll(".layer").data(layers).enter().append("path").attr("class", "layer").attr("data-legend", function(d) {
	// 			return d.key
	// 		}).attr("d", function(d) {
	// 			return area(d.values);
	// 		}).style("fill", function(d, i) {
	// 			return z(i);
	// 		});

	// 		svg.append("g").attr("class", "x axis").attr("transform", "translate(0," + height + ")").call(xAxis);

	// 		svg.append("g").attr("class", "y axis").attr("transform", "translate(" + width + ", 0)").call(yAxis.orient("right"));

	// 		svg.append("g").attr("class", "y axis").call(yAxis.orient("left"));

	// 		svg.selectAll(".layer").attr("opacity", 1).on("mouseover", function(d, i) {
	// 			svg.selectAll(".layer").transition().duration(250).attr("opacity", function(d, j) {
	// 				return j != i ? 0.6 : 1;
	// 			})
	// 		})

	// 		.on("mousemove", function(d, i) {
	// 			mousex = d3.mouse(this);
	// 			mousex = mousex[0];
	// 			var invertedx = x.invert(mousex);
	// 			invertedx = invertedx.getMonth() + invertedx.getDate();
	// 			var selected = (d.values);
	// 			for (var k = 0; k < selected.length; k++) {
	// 				datearray[k] = selected[k].date
	// 				datearray[k] = datearray[k].getMonth() + datearray[k].getDate();
	// 			}

	// 			mousedate = datearray.indexOf(invertedx);
	// 			pro = d.values[mousedate].value;

	// 			d3.select(this).classed("hover", true).attr("stroke", strokecolor).attr("stroke-width", "0.5px"), tooltip.html("<p>" + d.key + "<br>" + pro + "</p>").attr("transform", "translate(" + margin.left + "," + margin.top + ")").style("visibility", "visible").style("left", (d3.event.pageX - 540) + "px").style("top", (d3.event.pageY - 500) + "px");

	// 		}).on("mouseout", function(d, i) {
	// 			svg.selectAll(".layer").transition().duration(250).attr("opacity", "1");
	// 			d3.select(this).classed("hover", false).attr("stroke-width", "0px"), tooltip.html("<p>" + d.key + "<br>" + pro + "</p>").style("visibility", "hidden");
	// 		})

	// 		legend = svg.append("g").attr("class", "legend").attr("transform", "translate(50,30)").style("font-size", "12px").call(d3.legend)

	// 		var vertical = d3.select(".themeriver").append("div").attr("class", "remove").style("position", "absolute").style("z-index", "19").style("width", "1px").style("height", "380px").style("top", "10px").style("bottom", "30px").style("left", "0px").style("background", "#fff");

	// 		d3.select(".themeriver").on("mousemove", function() {
	// 			mousex = d3.mouse(this);
	// 			mousex = mousex[0] + 5;
	// 			vertical.style("left", mousex + "px")
	// 		}).on("mouseover", function() {
	// 			mousex = d3.mouse(this);
	// 			mousex = mousex[0] + 5;
	// 			vertical.style("left", mousex + "px")
	// 		});

	// 	}
	// },

	update: function() {
		var self = this;
		
		$(".wc-area").empty();
		self.chart();
	},
	// changeControlValue: function() {
	// 	var self = this;
	// 	var dateFormat = d3.time.format("%m/%d/%y");
	// 	var timeFormat = d3.time.format("%m/%d/%y %H:%M:%S");
	// 	var minDate = dateFormat.parse(self.startdate),
	// 		minTime = timeFormat.parse(self.starttime);
	// 	var maxDate = dateFormat.parse(self.enddate),
	// 		maxTime = timeFormat.parse(self.endtime);
	// 	$("#wc-slider").slider('option', {
	// 		range: true,
	// 		min: 0,
	// 		max: Math.floor((maxTime.getTime() - minTime.getTime()) / (3600 * 1000) + 1),
	// 		values: [0, Math.floor((maxTime.getTime() - minTime.getTime()) / (3600 * 1000) + 1)],
	// 		slide: function(event, ui) {
	// 			var startTime = new Date(minTime.getTime() + ui.values[0] * 3600 * 1000);
	// 			$('#wc-startdate').val($.datepicker.formatDate('mm/dd/yy', startTime));
	// 			$('#wc-starttime').val(startTime.getHours().pad(2) + ":" + startTime.getMinutes().pad(2));

	// 			var endTime = new Date(minTime.getTime() + ui.values[1] * 3600 * 1000);
	// 			$('#wc-enddate').val($.datepicker.formatDate('mm/dd/yy', endTime));
	// 			$('#wc-endtime').val(endTime.getHours().pad(2) + ":" + endTime.getMinutes().pad(2));
	// 		}
	// 	});
	// 	$('#wc-startdate').val($.datepicker.formatDate('mm/dd/yy', minDate));
	// 	$('#wc-enddate').val($.datepicker.formatDate('mm/dd/yy', maxDate));
	// 	$("#wc-starttime").val(minTime.getHours().pad(2) + ":" + minTime.getMinutes().pad(2));
	// 	$("#wc-endtime").val(maxTime.getHours().pad(2) + ":" + maxTime.getMinutes().pad(2));
	// },
});