function getJson(url) {
  return JSON.parse($.ajax({
    type: 'GET',
    url: url,
    dataType: 'json',
    global: false,
    async:false,
    success: function(data) {
      return data;
    }
  }).responseText);
}

function postJson(url, data) {
  return JSON.parse($.ajax({
    type: 'POST',
    url: url,
    data: data,
    dataType: 'json',
    global: false,
    async:false,
    success: function(data) {
      return data;
    }
  }).responseText);
}

jQuery.fn.serializeObject = function() {
  var arrayData, objectData;
  arrayData = this.serializeArray();
  //console.log(arrayData);
  objectData = {};

  $.each(arrayData, function() {
    var value;

    if (this.value != null) {
      value = this.value;
    } else {
      value = '';
    }

    if (objectData[this.name] != null) {
      if (!objectData[this.name].push) {
        objectData[this.name] = [objectData[this.name]];
      }

      objectData[this.name].push(value);
    } else {
      objectData[this.name] = value;
    }
  });

  return objectData;
};

var 
  ass_file = "data/car-assignments.csv",
  mapfile = "data/Kronos_topo2.json",
  imagemap_file = "data/MC2-tourist.jpg"
  shoplocations_file = "data/shop_locations2.csv";

  
var coordinate_url = '/vast/coordinatetrunc2';
var cars_id_url = '/vast/carsid';

//var colors = ['#66CCFF', '#66FF66', '#FF6600', '#CC66FF'];
var colors = ["#000000",
	      "#C51C81",
	      "#E21E26",
	      "#E12052",
	      "#AA216D",
	      "#C12136",
	      "#522D89",
	      "#262E7D",
	      "#E73127",
	      "#953291",
	      "#263C95",
	      "#68449C",
	      "#0B5597",
	      "#B258A3",
	      "#3C59A9",
	      "#ED5B31",
	      "#CE6326",
	      "#146AAA",
	      "#EA6C90",
	      "#7677B8",
	      "#EE7726",
	      "#1286AE",
	      "#CF962A",
	      "#15974C",
	      "#D098C1",
	      "#F49926",
	      "#F79A5B",
	      "#179DC8",
	      "#3DA947",
	      "#50A9D4",
	      "#6EAF42",
	      "#24B060",
	      "#F9B690",
	      "#E4BD20",
	      "#FDC01F",
	      "#95C13C",
	      "#CCC12C",
	      "#7BC25C",
	      "#91C2DF",
	      "#82CBA1",
	      "#BCD434",
	      "#B0D466",
	      "#F5DF54",
	      "#F3E5A8",
	      "#F3E81A",
	      "#F4E97E",
	      "#E4EBD1",
	      "#797A75"];
  
var width = 1260,
  height = 660;

var projection = d3.geo.mercator()
  .center([-1955.6,36])
  .scale(25000)
  .rotate([-180,0]);

var svg = d3.select("#map").append("svg")
  .attr("width", width)
  .attr("height", height);
var background = svg.append("rect")
  .attr("width", width)
  .attr("height", height)
  .attr("fill", "rgba(30, 153, 255, 0.1)");

        
var path = d3.geo.path()
  .projection(projection);
        
var g = svg.append("g")
	      .attr("id", "gTranslate");
/*
json = 
{
  "1": [
    { Timestamp="01/14/2014 08:05:26", id="1", lat="36.06104612", long="24.88398233"},
    { Timestamp="01/14/2014 08:05:26", id="1", lat="36.06104612", long="24.88398233"},
    ...
  ]
  "2": [...]
    ...
}
*/

var lastCar;
var lastCars = [];
var car_ass = {};

d3.csv(ass_file, function(error, data) {
  // retrieve car assignments
  // populate json
  data.filter(function(row) {
    var id = row['CarID'];
    if (id) {
      car_ass[id] = row;
    }
  });
});



// ADD/REMOVE DRIVER/S
$(document).ready(function() {

  $('#btn-add').click(function(){
    var added = [];
    $('#select-from option:selected').each( function() {
      //$('#select-to').append("<option value='"+$(this).val()+"'>"+$(this).text()+"</option>");
      $('#select-to').append( $(this) );
      added.push($(this).val());
      //$(this).remove();
    });
  
    //added.map(filter);
    filter(added);
    lastCars = lastCars.concat(added);
  });
  
  $('#btn-remove').click(function(){
    var removed = [];
    $('#select-to option:selected').each( function() {
      //$('#select-from').append("<option value='"+$(this).val()+"'>"+$(this).text()+"</option>");
      $('#select-from').append( $(this) );
      removed.push($(this).val());
      //$(this).remove();
    });

    remove_paths(removed);
    lastCars = lastCars.filter(function(x) { return removed.indexOf(x) < 0 });
    
  });

  $('#btn-sort-add').click(function () {
    $('#select-from option').sortElements(function(a, b){
      return $(a).text() > $(b).text() ? 1 : -1;
    });
  });
  
  $('#btn-sort-remove').click(function () {
    $('#select-to option').sortElements(function(a, b){
      return $(a).text() > $(b).text() ? 1 : -1;
    });
  });
  
  $('#btn-del-remove').click(function () {
    var removed = [];
    $('.car_path:empty').each( function() {
      //$('#select-from').append("<option value='"+$(this).val()+"'>"+$(this).text()+"</option>");
      id = $(this).attr('id').replace('car_','');
      
      console.log("#select-from option[value='"+id+"']");
    
      $("#select-from").append( $("#select-to option[value='"+id+"']") );
      removed.push(id);
    });

    remove_paths(removed);
    lastCars = lastCars.filter(function(x) { return removed.indexOf(x) < 0 });
    
  });
  
});


// SORT
jQuery.fn.sortElements = (function(){
 
    var sort = [].sort;
 
    return function(comparator, getSortable) {
 
        getSortable = getSortable || function(){return this;};
 
        var placements = this.map(function(){
 
            var sortElement = getSortable.call(this),
                parentNode = sortElement.parentNode,
 
                // Since the element itself will change position, we have
                // to have some way of storing its original position in
                // the DOM. The easiest way is to have a 'flag' node:
                nextSibling = parentNode.insertBefore(
                    document.createTextNode(''),
                    sortElement.nextSibling
                );
 
            return function() {
 
                if (parentNode === this) {
                    throw new Error(
                        "You can't sort elements if any one is a descendant of another."
                    );
                }
 
                // Insert before flag:
                parentNode.insertBefore(this, nextSibling);
                // Remove flag:
                parentNode.removeChild(nextSibling);
 
            };
 
        });
 
        return sort.call(this, comparator).each(function(i){
            placements[i].call(getSortable.call(this));
        });
 
    };
 
})();












/*
$('.timesel').change(function() {
  //carid = $( "#carid option:selected" ).attr('value');
  //filter(carid);
  cars = getcars();
  filters(cars);
});
*/

// DISABLE SUBMIT BUTTON
$('form').on('submit',function(e) {
  e.preventDefault(); 
});

/*
.click(function() {
// do something
})
*/


var filters = function(cars) {

  remove_paths(lastCars);
  console.log("###1");
  //cars.map(filter);
  filter(cars);
  console.log("###11");
  lastCars = cars;
  
}

function remove_paths(cars) {
  
  cars.map(function(item) {
    $("#car_" + item).remove();    
  });
  
}

function getcars(){
  var options = [];
  $('#select-to option').each(function(){
      options.push($(this).attr('value'));
  });
  return options;
}

var filter = function(cars) {
/*
  var form_arr = $('#form1').serializeObject();
  delete form_arr['selectfrom[]'];
  delete form_arr['selectto[]'];
  form_arr['carids'] = getcars();

  var data = postJson(coordinate_url, form_arr);
  draw_path(car, data[parseInt(car)]);
*/
  console.log("###2");

  var par = {};
  var dayVal0 = $("#daySlider").slider("values", 0),
      dayVal1 = $("#daySlider").slider("values", 1);
  par["sDate"] = "2014-01-"+pad2(dayVal0);
  par["eDate"] = "2014-01-"+pad2(dayVal1);
  var timeVal0 = $("#timeSlider").slider("values", 0),
      timeVal1 = $("#timeSlider").slider("values", 1);
  par["sTime"] = time2query(timeVal0);
  par["eTime"] = time2query(timeVal1);
  //par['carids'] = getcars();
  par['carids'] = cars;

  var data = postJson(coordinate_url, par);
  console.log("###4");

  for (i in cars) {
    draw_path(cars[i], data[parseInt(cars[i])]);
  }

  console.log("###Re-enabling");
  $( "#daySlider" ).slider( "enable" );
  $( "#timeSlider" ).slider( "enable" );
  
};

function draw_path(car, data) {

  var lineFunction = d3.svg.line()
			      .x(function(d) { return projection([d.lon, d.lat])[0]; })
			      .y(function(d) { return projection([d.lon, d.lat])[1]; })
			      .interpolate("linear");

  console.log("car");
  console.log(car);
  console.log("data");
  console.log(data);
  console.log("car_ass");
  console.log(car_ass);
    

  g.append("g")
    .attr("id", "car_" + car)
    .attr("class", "car_path")
    .selectAll("path")
    .data(data)
    .enter()
    .append("path")
      .attr("d", function (d) { return lineFunction(d); })
      .attr("style", function() { index_color = parseInt(car)%60; return "stroke: "+colors[index_color]+"; stroke-width: 0.07; stroke-opacity: 0.4; fill: none;"; })
      .attr("title", function(d) { return car_ass[car]['FirstName']+' '+car_ass[car]['LastName']+" - "+d[0].datetime.split(" ")[0]; } )
      .attr("class", "tooltipsy");

  //$('#car_' + car).tooltipsy({ 
  $('#car_'+car+' .tooltipsy').tooltipsy({ 
    alignTo: 'cursor',
    gravity: 'w',
    html: true
  });

/*
  g.append("path")
      .attr("id", "car_" + car)
      .attr("d", function () { return lineFunction(data); })
      .attr("style", "stroke: "+colors[parseInt(car)]+"; stroke-width: 0.1; fill: none;")
      .attr("title", car_ass[car]['LastName'] + ' ');
      $('#car_' + car).tooltipsy({ 
        alignTo: 'cursor',
	gravity: 'w', 
        html: true
      });
*/
}


function draw_location(file) {
    
  d3.csv(file, function(data) {
    g.append("g")
      .attr("id", "shops")
      //.style("fill", "green")
      .selectAll("circle")
      .data(data)
      .enter()
      .append("circle")
	.attr("cx", function(d) {
	  return projection([d.long.replace(",","."), d.lat.replace(",",".")])[0];
	})
	.attr("cy", function(d) {
	  return projection([d.long.replace(",","."), d.lat.replace(",",".")])[1];
	})
	.style("fill", function(d) { return d.color; } )
	.attr("r", 0.25)
	.attr("title", function(d) {return d.location;});
  
    $('#shops circle').tooltipsy({ 
      gravity: 'w', 
      html: true
    });
    
  });
  
}


function populate_idsel(cars_id, car_ass, id_el) {

  console.log(cars_id);
  
  // selection of the car
  d3.select(id_el).selectAll("option")
    .data(cars_id)
    .enter()
    .append("option")
    //.attr("onclick", function(d) {
    //  return "filter(" + d + ")";})
    .attr("value", function(d) {
      return d;})
    .attr("style", function(d) { index_color = parseInt(d)%60; return "background-color:"+colors[index_color]+";"; })
    .text(function(d) {
      if (car_ass[d]) {
        var fname = car_ass[d].FirstName;
        var lname = car_ass[d].LastName;
        return fname + " " + lname;
      } else {
        // there are cars not assigned to drivers
        return "car_" + d;
      }
    });
}

d3.json(mapfile, function(error, topology) {

  var cars_id = getJson(cars_id_url);
  populate_idsel(cars_id, car_ass, "#select-from");

  g.append("image")
    .attr("id", "imageMap")
//    .attr("x", "667")
//    .attr("y", "205")
//    .attr("width", "35")
//    .attr("height", "21")
    .attr("x", "663")
    .attr("y", "198")
    .attr("width", "40")
    .attr("height", "30")
    .attr("xlink:href", imagemap_file);
  
  // draw map
  g.selectAll("path")
    .data(topojson.object(topology, topology.objects.Kronos).geometries)
    .enter()
    .append("path")
    .attr("d", path)
    .style("fill-opacity", "0.55");
  
  draw_location(shoplocations_file);
  //filter(cars_id[1]);
  
});


// zoom and pan
var zoom = d3.behavior.zoom()
  .on("zoom",function() {
              
    g.attr("transform","translate("+ 
      d3.event.translate.join(",")+")scale("+d3.event.scale+")");
    //g.selectAll("circle")
    //  .attr("d", path.projection(projection));
    //g.selectAll("path")  
    //  .attr("d", path.projection(projection)); 
        
});
        
svg.call(zoom)


function initSliders() {
  // DAYSLIDER
  $("#daySlider").slider({
    range: true,
    min: 6,
    max: 19,
    values: [15, 19],
    slide: slideDay,
    stop: slideDraw
  });
  
  var val0 = $("#daySlider").slider("values", 0),
      val1 = $("#daySlider").slider("values", 1)
  var start = "01-"+pad2(val0)+"-2014",
      end = "01-"+pad2(val1)+"-2014";
  $("#startDaySlider-info").text(start);
  $("#endDaySlider-info").text(end);
  
  
  //$( "#daySlider .ui-slider-handle").mouseup(function(){
  //  cars = getcars();
  //  console.log(cars);
  //  filters(cars);
  //});
/*
  $( "#daySlider .ui-slider-handle" ).mouseenter(function() {
    var value = $( "#daySlider" ).slider( "option", "values" );
    $('#daySlider .ui-slider-handle:first').attr("title", "01-"+pad2(value[0])+"-2014");
    $('#daySlider .ui-slider-handle:last').attr("title", "01-"+pad2(value[1])+"-2014");
  })
*/
  
  //TIMESLIDER
  $("#timeSlider").slider({
    orientation: "vertical",
    step: 15,
    range: true,
    min: 0,
    max: 2879,
    values: [1200, 1800],
    slide: slideTime,
    stop: slideDraw
  });
  
  var val0 = $("#timeSlider").slider("values", 0),
      val1 = $("#timeSlider").slider("values", 1);
  var start = time2print(val0);
  var end = time2print(val1);

  $("#startTimeSlider-info").text(start);
  $("#endTimeSlider-info").text(end);
  
  //$("#startTimeSlider-info").attr("class", "tooltipsy");
/*
  $( "#timeSlider .ui-slider-handle" ).mouseover(function() {
    var value = $( "#timeSlider" ).slider( "option", "values" );
    var start = time2print(value[0]);
    var end = time2print(value[1]);
    //$('.ui-slider-handle:first').html('<div class="tooltip top slider-tip"><div class="tooltip-arrow"></div><div class="tooltip-inner">' + value[0] + '</div></div>');
    //$('.ui-slider-handle:last').html('<div class="tooltip top slider-tip"><div class="tooltip-arrow"></div><div class="tooltip-inner">' + value[1] + '</div></div>');
    $('#timeSlider .ui-slider-handle:first').attr("title", start);
    $('#timeSlider .ui-slider-handle:last').attr("title", end);
  })
*/
}
initSliders();

function slideDraw(event, ui) {
  $( "#daySlider" ).slider( "disable" );
  $( "#timeSlider" ).slider( "disable" );
  cars = getcars();
  console.log(cars);
  filters(cars);
}
  
function time2query(num) {
  hours = parseInt(num / 60 % 24, 10);
  minutes = parseInt(num % 60, 10);
  
  console.log(pad2(hours)+":"+pad2(minutes)+":00");
  return pad2(hours)+":"+pad2(minutes)+":00";
}

function time2print(num) {
  hours = parseInt(num / 60 % 24, 10);
  minutes = parseInt(num % 60, 10);
  return getTime2Show(hours, minutes);
}

function getTime2Show(hours, minutes) {
    var time = (hours < 12) ? 'AM' : 'PM';
    minutes = minutes + "";
    if (hours == 0) {
        hours = 12;
    }
    if (hours > 12) {
        hours -= 12;
    }
    return pad2(hours) + ":" + pad2(minutes) + " " + time;
}



function pad2(number) {
  return (parseInt(number) < 10 ? '0' : '') + number;
}

function slideDay(event, ui){
  // necessario per avere values aggiornati fuori (probabilmente jquery li aggiorna alla fine dell'esec. di
  //	questo metodo, ma a me servono aggiornati in nell'ultima istruzione di questo metodo)
  $(this).slider('values', ui.values);
  
  var val0 = ui.values[0],
      val1 = ui.values[1];
  var start = "01-"+pad2(val0)+"-2014",
      end = "01-"+pad2(val1)+"-2014";
  $("#startDaySlider-info").text(start);
  $("#endDaySlider-info").text(end);

    
  //cars = getcars();
  //console.log(cars);
  //filters(cars);
  
}

function slideTime(event, ui){
  // necessario per avere values aggiornati fuori (probabilmente jquery li aggiorna alla fine dell'esec. di
  //	questo metodo, ma a me servono aggiornati in nell'ultima istruzione di questo metodo)
  $(this).slider('values', ui.values);

  
  var val0 = ui.values[0],
      val1 = ui.values[1];
  var start = time2print(val0);
  var end = time2print(val1);
  $("#startTimeSlider-info").text(start);
  $("#endTimeSlider-info").text(end);
  
  $('#timeSlider .ui-slider-handle:first').attr("title", start);
  $('#timeSlider .ui-slider-handle:last').attr("title", end);


  //cars = getcars();
  //filters(cars);

}



/*
//PUT IN BACKGROUND:

var map = $("#imageMap").detach();
//$("#gTranslate :first-child").remove();
map.insertBefore( $("#gTranslate :first-child") );
*/
