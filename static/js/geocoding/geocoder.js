define([

	'jquery',
	'utils',
	'ol',
], function(
	$,
	Utils,
	ol
) {
	var urlPrefix = '/geocoder/';
	var alreadyInitialized = false;
	var sortBy;
	var searchResults;
	var matchedAnnotations;
	var drawSource, vectorSource;
	var map;
	var searchText;
	var module = {
		resolvedPlaceId: -1,
		resolvedPlaceType: '',
		getRecommendation: function(text) {
			var previousAnnotation = false;
			searchText = text;

			$('#previous_annotations').html('<b>Searching previous annotations</b>');
			$('#local_results').html('');
			$('#global_results').html('');
			searchResults = {};
			$.ajax({
				url: urlPrefix + 'search_annotation',
				data: {text: text},
				success: function(xhr) {
					matchedAnnotations = {};
					$('#previous_annotations').html(xhr.html);
					previousAnnotation = (xhr.matches.length != 0);
					if (previousAnnotation) {
						for (var i = 0; i < xhr.matches.length; i++) {
							var match = xhr.matches[i];
							matchedAnnotations[match.place_id] = match;
						}
					}
				}
			}).done(function() {
				if (previousAnnotation) return;
				searchLocal(text, function() {
					if (Object.keys(searchResults).length != 0) {
						return;
					}
					searchGlobal(text);
				});
			});
		},
		init: function() {
			initAnnotationControls();
			$('#geocoding')
				.on('click', '.delete_annotation', function() {
					var id = this.getAttribute('data-id');
					var that = this;
					$.ajax({
						url: urlPrefix + 'delete_annotation',
						type: 'post',
						data: {id: id},
						success: function() {
							window.activityTable
								.row($(that).parents('tr'))
								.remove()
								.draw(false);
						}
					})
				}).on('click', '#rebuild_index', function() {
					$('#geocoding').off('click', '#rebuild_index');
					$.ajax(urlPrefix + 'update_index');
				}).on('click', '.sort_by', function(e) {
					e.preventDefault();
					sortBy = this.getAttribute('data-sort');
					$('#search_nominatim').trigger('click');
				});

			$('#save_shape').click(function(e) {
				e.preventDefault();
				var feature = drawSource.getFeatures();
				if (feature.length != 1) {
					alert('There should be exactly 1 shape on the map.');
					return;
				}

				var text = searchText;
				var place_name = window.prompt('Please input the name of this place', text);
				if (place_name == null) {
					return; // do nothing more; allow user to redraw
				}
				if (place_name.length == 0) {
					alert('Place name should not be empty.');
					return;
				}
				var confirmtext = "Save the following annotation?" +
					"\nAnnotated text: " + text +
					"\nPlace name: " + place_name +
					"\nShape: (the line/polygon you drew)."
				var dosave = window.confirm(confirmtext);
				if (dosave == false) return;

				feature[0].getGeometry().transform('EPSG:3857', 'EPSG:4326');
				var geotext = new ol.format.WKT().writeFeature(feature[0]);
				$.ajax({
					url: urlPrefix + 'new_annotation',
					data: {
						'text': text,
						'place_name': place_name,
						'geotext': geotext
					},
					type: 'post',
					success: function (xhr) {
						searchText = '';
						drawSource.clear();
						$('#save_shape').attr('disabled', 'true');
						$('#save_annotation').attr('disabled', 'true');
						module.resolvedPlaceId = xhr.custom_place_id;
						module.resolvedPlaceType = 'previous';
						showDetail(geotext, 'custom');
						require('postcir/postcir').resolvePlace(module.resolvedPlaceId, module.resolvedPlaceType);
					}
				})
			});
			$('#draw_line,#draw_polygon').click(function() {
				$('#draw_line,#draw_polygon').attr('disabled', 'true');
				drawSource.clear();
				var value = $(this).is('#draw_line') ? 'LineString' : 'Polygon';
				window.draw = new ol.interaction.Draw({
					source: drawSource,
					type: /** @type {ol.geom.GeometryType} */ (value)
				});
				map.addInteraction(window.draw);
				window.draw.on('drawend', endDrawing);
				$('#searcher_overlay').show();
			});

			function endDrawing() {
				map.removeInteraction(window.draw);
				$('#draw_line').removeAttr('disabled');
				$('#draw_polygon').removeAttr('disabled');
				$('#save_shape').removeAttr('disabled');
				$('#searcher_overlay').hide();
			}

			$('#geocoding').on('click', '.place.item', function() {
				var place_id = this.getAttribute('data-place-id');
				var geotext = searchResults[place_id].geotext;
				showDetail(geotext);
				module.resolvedPlaceId = place_id;

				$('#save_annotation').removeAttr('disabled');
				if ($(this).parents('#local_results').length > 0) {
					// from local results
					module.resolvedPlaceType = 'local';
				} else if ($(this).parents('#global_results').length > 0) {
					// from global results
					module.resolvedPlaceType = 'global';
				}
			}).on('click', '.previous_anno.item', function() {
				var place_id = this.getAttribute('data-place-id');
				if (!alreadyInitialized) initmap();
				module.resolvedPlaceId = place_id;
				module.resolvedPlaceType = 'previous';
				$('#save_annotation').removeAttr('disabled');
				if (this.getAttribute('data-place-type') == 'custom') {
					showDetail(matchedAnnotations[place_id].shape, 'custom');
				} else {
					showDetail(matchedAnnotations[place_id].shape);
				}
			}).on('click', '#save_annotation', function(e) {
				e.preventDefault();
				require('postcir/postcir').resolvePlace(module.resolvedPlaceId, module.resolvedPlaceType);
			});
		}
	};

	function initmap() {
		if (alreadyInitialized) return;
		alreadyInitialized = true;
		$('#map-toolbar').show();
		vectorSource = new ol.source.Vector();
		drawSource = new ol.source.Vector();


		window.highlightsData = {};
		window.overallCentroid = [-77.864398, 40.792031];
		drawSource.clear();

		window.currentFocus = {
			coordinates: [-77.864398, 40.792031],
			state: 'Pennsylvania',
			county: 'Centre County',
			city: 'State College',
			neighbourhood: 'Downtown State College'
		};

		window.vectorStyles = {
			nominatim: new ol.style.Style({
				stroke: new ol.style.Stroke({
					color: 'blue',
					width: 3
				}),
				fill: new ol.style.Fill({
					color: 'rgba(0, 0, 255, 0.1)'
				}),
				image: new ol.style.Circle({
					radius: 15,
					fill: new ol.style.Fill({
						color: 'blue'
					})
				})
			}),
			custom: new ol.style.Style({
				stroke: new ol.style.Stroke({
					color: '#FF66CC',
					width: 3
				}),
				fill: new ol.style.Fill({
					color: 'rgba(0, 0, 255, 0.1)'
				}),
				image: new ol.style.Circle({
					radius: 15,
					fill: new ol.style.Fill({
						color: '#FF66CC'
					})
				})
			})
		};

		map = new ol.Map({
			target: 'map',
			interactions: ol.interaction.defaults({doubleClickZoom: false}),
			layers: [
				new ol.layer.Tile({
					source: new ol.source.OSM()
				}),
				new ol.layer.Vector({
					source: vectorSource,
				}),
				new ol.layer.Vector({
					source: drawSource,
					style: new ol.style.Style({
						fill: new ol.style.Fill({
							color: 'rgba(255, 255, 255, 0.2)'
						}),
						stroke: new ol.style.Stroke({
							color: '#ff66cc',
							width: 3
						}),
						image: new ol.style.Circle({
							radius: 7,
							fill: new ol.style.Fill({
								color: '#ff66cc'
							})
						})
					})
				})
			],
			view: new ol.View({
				center: ol.proj.fromLonLat([-77.86, 40.80]),
				maxZoom: 19,
				zoom: 12
			})
		});
	}

	function searchLocal(searchtext, finalCallback) {
		searchtext = searchtext.trim().replace(' ', '+');
		var results = [];
		$('#local_results').html('<b>Searching locally...</b>');
		$.ajax({
			url: '//gir.ist.psu.edu/nominatim/search.php',
			data: 'q=' + searchtext + '&format=json&addressdetails=1&polygon_text=1',
			success: function(xhr) {
				if (xhr.length == 0) {
					showLocalResults(results);
					if (typeof finalCallback == 'function') {
						finalCallback();
					}
					return;
				}
				results = results.concat(xhr);
				var newquery = 'q=' + searchtext + '&format=json&addressdetails=1&polygon_text=1&exclude_place_ids=';
				for (var i = 0; i < results.length; i++) {
					newquery  += results[i].place_id + ',';
				}
				$.ajax({
					url: '//gir.ist.psu.edu/nominatim/search.php',
					data: newquery,
					success: function(xhr) {
						if (xhr.length == 0) {
							showLocalResults(results);
							if (typeof finalCallback == 'function') {
								finalCallback();
							}
							return;
						}
						results = results.concat(xhr);
						var newnewquery = 'q=' + searchtext + '&format=json&addressdetails=1&polygon_text=1&exclude_place_ids=';
						for (var i = 0; i < results.length;i ++) {
							newnewquery  += results[i].place_id + ',';
						}
						$.ajax({
							url: '//gir.ist.psu.edu/nominatim/search.php',
							data: newnewquery,
							success: function(xhr) {
								results = results.concat(xhr);
								showLocalResults(results);
								if (typeof finalCallback == 'function') {
									finalCallback();
								}
							}
						});
					}
				});
			}
		});
	}

	function showLocalResults(results) {
		if (results.length > 0) {
			presentLocalResults(results, againstTarget);
		} else {
			$('#local_results').html('<b>No local results.</b>');
		}
	}

	function presentLocalResults(results, againstTarget) {
		if (!alreadyInitialized) initmap();
		var wgs84Sphere = new ol.Sphere(6378137);
		var alternativeSort =  (window.sortBy == 'ontology' ? 'distance' : 'ontology');
		var html = '<b>Local results:</b>' + againstTarget +
			'<a class="sort_by" data-sort="' + alternativeSort + '">by ' + alternativeSort + '</a>' +
			'<div class="ui celled list">';
		for (var i = 0; i < results.length; i ++) {
			results[i].distance = wgs84Sphere.haversineDistance(window.overallCentroid, [
				results[i].lon,
				results[i].lat
			]);
			results[i].ont_distance = getOntologyDistance(results[i].address);
			searchResults[results[i].place_id] = results[i];
		}
		results.sort(function(a, b) {
			if (window.sortBy == 'ontology') {
				// sort by ontology
				if (a.ont_distance.code < b.ont_distance.code) {
					return 1;
				}
				if (a.ont_distance.code > b.ont_distance.code) {
					return -1;
				}
				return (a.importance < b.importance) ? 1 : ((b.importance < a.importance) ? -1 : 0);
			} else {
				// sort by distance
				return (a.distance > b.distance) ? 1 : ((b.distance > a.distance) ? -1 : 0);
			}
		});

		for (var i = 0; i < results.length; i ++) {
			var shortname = results[i].display_name.replace(/, United States of America$/, '');
			var distance = results[i].distance / 1609.34;
			distance = distance.toPrecision(3);
			html += '<a class="place item" data-place-id="' + results[i].place_id + '">' +
				(results[i].icon ? '<img class="ui avatar image" src="' + results[i].icon + '">' : '') +
				(window.sortBy == 'ontology' ? ('<span class="ui grey circular label">' + results[i].ont_distance.text + '</span>') : '') +
				(window.sortBy == 'distance' ? ('<span class="ui label">' + distance + ' mi</span>') : '') +
				shortname + ' (' +
				results[i].importance + ')</a>';
		}
		html += '</div>';
		$('#local_results').html(html);
	}

	function searchGlobal(searchtext) {
		$('#global_results').html('<b>Searching globally...</b>');
		searchtext = searchtext.trim().replace(' ', '+');
		$.ajax({
			url: '//nominatim.openstreetmap.org/search.php',
			data: 'q=' + searchtext + '&format=json&countrycodes=us&polygon_text=1&addressdetails=1',
			success: function (xhr) {
				showGlobalResults(xhr);
			}
		});
	}

	function showGlobalResults(results) {
		if (!alreadyInitialized) initmap();
		if (results.length > 0) {
			var html = '<b>Global results:</b><div class="ui celled list">';
			for (var i =0; i < results.length; i ++) {
				results[i].ont_distance = getOntologyDistance(results[i].address);
				searchResults[results[i].place_id] = results[i];
			}
			results.sort(function(a, b) {
				if (b.importance > a.importance) {
					return 1;
				}
				if (b.importance < a.importance) {
					return -1;
				}
				return (a.ont_distance.code < b.ont_distance.code) ? 1 : ((b.ont_distance.code < a.ont_distance.code) ? -1 : 0);
			});
			for (var i =0; i < results.length; i ++) {
				var result = results[i];
				var shortname = result.display_name.replace(/, United States of America$/, '');
				html += '<a class="place item" data-place-id="' + result.place_id + '">' +
					(result.icon ? '<img class="ui avatar image" src="' + result.icon + '">' : '') +
					'<span class="ui grey circular label">' + result.ont_distance.text + '</span>' +
					shortname +
					' (' + result.importance + ')</a>';
			}
			html += '</div>';
			$('#global_results').html(html);
		} else {
			$('#global_results').html('<b>No global results.</b>');
		}

	}

	function getOntologyDistance(address) {
		var currentFocus = window.currentFocus;
		var dist = {'code': 0, 'text': 'US'}; // country
		if (! (address.state == currentFocus.state)) return dist;
		dist = {'code': 1, 'text': 'State'};
		if (!
				('county' in address && 'county' in currentFocus && address.county == currentFocus.county)
		) return dist;
		dist = {'code': 2, 'text': 'County'};
		if (!
				('city' in address && 'city' in currentFocus && address.city == currentFocus.city) ||
			('township' in address && 'township' in currentFocus && address.township == currentFocus.township)
		) return dist;
		dist = {'code': 3, 'text': 'City'};
		if (!
				('neighbourhood' in address && 'neighborhood' in currentFocus && address.neighbourhood == currentFocus.neighbourhood)
		) return dist;
		dist = {'code': 4, 'text': 'Neighbor'};
		return dist;
	}

	function initAnnotationControls() {
		$('#geocoding').on('click', '#search_nominatim', function(e) {
			e.preventDefault();
			searchLocal(searchText);

		}).on('click', '#search_global', function(e) {
			e.preventDefault();
			searchGlobal(searchText);
		});

	}

	function showDetail(geotext, shapetype) {
		vectorSource.clear();
		window.geotext = geotext;

		var format = new ol.format.WKT();
		var feature = format.readFeature(geotext);
		feature.getGeometry().transform('EPSG:4326', 'EPSG:3857');
		if (shapetype == 'custom') {
			feature.setStyle(window.vectorStyles.custom);
		} else {
			feature.setStyle(window.vectorStyles.nominatim);
		}
		vectorSource.addFeature(feature);
		map.getView().fit(vectorSource.getExtent(), map.getSize(), {
			maxZoom: 16
		});
	}
	return module;
});

