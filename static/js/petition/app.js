var viz;
var workbook;

function initializeViz() {
  var placeholderDiv = document.getElementById("tableauViz");
  var url = "https://public.tableau.com/views/petitions-reviewed/Dashboard?:embed=y&:display_count=yes&publish=yes";
  var options = {
    width: placeholderDiv.offsetWidth,
    height: placeholderDiv.offsetHeight,
    hideTabs: true,
    hideToolbar: true,
    onFirstInteractive: function () {
      workbook = viz.getWorkbook();
      activeSheet = workbook.getActiveSheet();
      $(".tab-toolbar-container").hide();
    }
  };
  viz = new tableau.Viz(placeholderDiv, url, options);
  listenToMarksSelection();
}

$(initializeViz);

var showForumCommentList = function() {
  $.ajax({
    url: '/api_va/get_statement_comment_list/',
    type: 'post',
    data: {
    },
    success: function(xhr) {  
      $('#forum-comment').html(xhr.forum_comment);
      $(".comment .text p").each(function( index ) {
        var str = $(this).html();
        str = str.replaceAll("{", '<a href="#" class="visref_id " value="');
        str = str.replaceAll("}", '"><span class="ui-icon ui-icon-image"></span></a>');
        $(this).html(str);
      });
    },
    error: function(xhr) {
      if (xhr.status == 403) {
        Utils.notify('error', xhr.responseText);
      }
    }
  }); 
}

String.prototype.replaceAll = function(search, replacement) {
    var target = this;
    return target.replace(new RegExp(search, 'g'), replacement);
}; 

function listenToMarksSelection() {
  viz.addEventListener(tableau.TableauEventName.MARKS_SELECTION, onMarksSelection);
}

function onMarksSelection(marksEvent) {

  // paramObjs = workbook.getParametersAsync();
  // paramObjs.then(function(paramObjs) {
  //   for (var i = 0; i < paramObjs.length; i++) {
  //     try {
  //       var name = paramObjs[i].getName();
  //       var value = paramObjs[i].getCurrentValue();
  //       params[name] = value.value;
  //       console.log(name);
  //     } catch (e) { }
  //   }
  // });

  return marksEvent.getMarksAsync().then(reportSelectedMarks);
}

function reportSelectedMarks(marks) {
  var html = [];
  for (var markIndex = 0; markIndex < marks.length; markIndex++) {
    var pairs = marks[markIndex].getPairs();
    html.push("<b>Mark " + markIndex + ":</b><ul>");
    for (var pairIndex = 0; pairIndex < pairs.length; pairIndex++) {
      var pair = pairs[pairIndex];
      html.push("<li><b>fieldName:</b> " + pair.fieldName);
      html.push("<br/><b>formattedValue:</b> " + pair.formattedValue + "</li>");
    }
    html.push("</ul>");
  }

  var dialog = $("#dialog");
  dialog.html(html.join(""));
  dialog.dialog("open");
}

var init_comment_events = function() {
  $("body").on("click", "#resetFilters", function(){
    var visref_id = $(this).attr("value");
    workbook.activateSheetAsync("Dashboard 1")
      .then(function (dashboard) {
        var worksheets = dashboard.getWorksheets();
        for (var i = 0; i < worksheets.length; i++) {
          var worksheet = worksheets[i];
          worksheet.clearFilterAsync("Location");
        }
      });
  }).on("click", ".visref_id", function(){
    var visref_id = $(this).attr("value");

    workbook.activateSheetAsync("Spending")
      .then(function (dashboard) {
        var worksheets = dashboard.getWorksheets();
        for (var i = 0; i < worksheets.length; i++) {
          var worksheet = worksheets[i];

          worksheet.getFiltersAsync().then(
            function(filter) { 
              var values = filter;
          });

          if (i === 0) {
            //worksheet.clearSelectedMarksAsync();

            worksheet.selectMarksAsync(
              {
                "Location": "Bean There Done That",
                "Full Name": "Gustav Cazar",
              },
              tableau.SelectionUpdateType.REPLACE
            );  
            
            worksheet.selectMarksAsync(
              {
                "Location": "Abila Airport",
                "Full Name": "Henk Mies",
              },
              tableau.SelectionUpdateType.ADD
            );            
          }

        }
      });

  }).on("click", ".ref-vis", function(){
    var $textarea = $(this).closest(".form").find("textarea");
    var config = JSON.stringify(fil);
    var visref_parent = sessionStorage.getItem("visref_parent");
    if (!visref_parent) visref_parent = "null";
    $.ajax({
      url: '/api_va/put_visref/',
      type: 'post',
      data: {
        'config': config,
        'visref_parent': visref_parent,
      },
      success: function(xhr) {
        console.log(xhr);
        var content = $textarea.val();
        content = content + "{" + xhr.visref_id + "}";
        $textarea.val(content);
      },
      error: function(xhr) {
        if (xhr.status == 403) {
          Utils.notify('error', xhr.responseText);
        }
      }
    }); 
  }).on("click", ".comment-reply-capture", function(){
    var $textarea = $(this).closest(".form").find("textarea");
    var config = JSON.stringify(fil);
    var visref_parent = sessionStorage.getItem("visref_parent");
    if (!visref_parent) visref_parent = "null";
    $.ajax({
      url: '/api_va/put_visref/',
      type: 'post',
      data: {
        'config': config,
        'visref_parent': visref_parent,
      },
      success: function(xhr) {
        console.log(xhr);
        var content = $textarea.val();
        content = content + "{" + xhr.visref_id + "}";
        $textarea.val(content);
      },
      error: function(xhr) {
        if (xhr.status == 403) {
          Utils.notify('error', xhr.responseText);
        }
      }
    }); 
  }).on("click", ".comment-post", function(){
    var textarea = $(this).closest(".comment-container").find("textarea");
    var text = textarea.val();
    var parent_id = "";
    if (text == "") {
      Utils.notify('warning', "Empty content not accepted");
    } else {
      $.ajax({
        url: '/phase5/put_statement_comment/',
        type: 'post',
        data: {
          'text': text,
          'parent_id': parent_id,
        },
        success: function(xhr) {
          textarea.val("");
          showForumCommentList();
        },
        error: function(xhr) {
          if (xhr.status == 403) {
            Utils.notify('error', xhr.responseText);
          }
        }
      });     
    }
  }).on("click", ".comment-reply-save", function(){
    var text = $(this).closest("form").find("textarea").val();
    var parent_id = $(this).closest(".comment").attr("comment-id");
    var textarea = $(this).closest("form").find("textarea");
    $.ajax({
      url: '/phase5/put_statement_comment/',
      type: 'post',
      data: {
        'text': text,
        'parent_id': parent_id,
      },
      success: function(xhr) {
        textarea.val("");
        textarea.closest(".form").hide();
        showForumCommentList();
      },
      error: function(xhr) {
        if (xhr.status == 403) {
          Utils.notify('error', xhr.responseText);
        }
      }
    });
  }).on("click", ".comment-reply-cancel", function(){
    var textarea = $(this).closest("form").find("textarea");
    textarea.val("");
    textarea.closest(".form").hide();
  }).on("click", ".comment-reply", function(){
    $(this).closest(".content").find(".form").show();
    $('textarea').each(function () {
      this.setAttribute('style', 'height:' + (this.scrollHeight) + 'px;overflow-y:hidden;');
    }).on('input', function () {
      this.style.height = 'auto';
      this.style.height = (this.scrollHeight) + 'px';
    });
  });
}

showForumCommentList();
init_comment_events();

// var module = {};

// var tasks;
// var gantt;

// var name2CarId = {};
// var cars_id = [35, 4, 19, 10, 7, 11, 32, 34, 17, 12, 18, 20, 16, 6, 3, 26, 1, 29, 21, 14, 33, 13, 2, 27, 8, 101, 24, 23, 25, 30, 15, 28, 5, 22, 9, 107, 104, 105, 106, 31];
// var colorShop2Cat = {};
// var shop2Cat = {};
// var nutrients;

// var width = 960,
//   height = 540;

// // render map begin

// var mapProjection = d3.geo.mercator()
//   .center([-1955.6,36])
//   .scale(25000)
//   .rotate([-180,0]);

// var mapSvg = d3.select("#map").append("svg")
//   .attr("width", width)
//   .attr("height", height);
// var mapBackground = mapSvg.append("rect")
//   .attr("width", width)
//   .attr("height", height)
//   .attr("fill", "rgba(30, 153, 255, 0.1)");

// var mapPath = d3.geo.path()
//   .projection(mapProjection);
        
// var mapG = mapSvg.append("g")
//         .attr("id", "gTranslate");

// var mapZoom = d3.behavior.zoom()
//   .on("zoom",function() {
//     mapG.attr("transform","translate("+ 
//       d3.event.translate.join(",")+")scale("+d3.event.scale+")");
// });
        
// mapSvg.call(mapZoom)
// initMapPos();

// // render map end

// var lastCar;
// var lastCars = [];
// var car_ass = {};
// var flights = [], flights_filtered = [];

// var dateChart = dc.barChart("#date-chart");
// var hourChart = dc.barChart("#hour-chart");
// var carChart = dc.barChart("#car-chart");

// var fil = {
//   "sDate": new Date(2014, 0, 10),
//   "eDate": new Date(2014, 0, 12),
//   "sHour": 7,
//   "eHour": 9,
//   "cars": cars_id
// };

// var fil_init = {
//   "sDate": new Date(2014, 0, 5),
//   "eDate": new Date(2014, 0, 20),
//   "sHour": -1,
//   "eHour": 24,
//   "cars": cars_id
// };

// var sDateStr = fil["sDate"].toDateString();
// var eDateStr = fil["eDate"].toDateString();
// $("#date-chart .sdate").html(sDateStr);
// $("#date-chart .edate").html(eDateStr);
// var sHourStr = fil["sHour"];
// var eHourStr = fil["eHour"];
// $("#hour-chart .shour").html(sHourStr);
// $("#hour-chart .ehour").html(eHourStr);


// var flight, date, hour, hours, carDim, carGroup;

// function setRadio(id, checked) {
//     var radio = $('#' + id);
//     radio[0].checked = checked;
//     radio.button("refresh");
// }

// // ADD/REMOVE DRIVER/S
// $(document).ready(function() {

//   showForumCommentList();
//   init_comment_events();

//   $( function() {
//     $( ".checkbox" ).checkboxradio({
//       icon: false
//     });
//   } );

//   var user_name = $("#user_name").text();
//   if (user_name === "") {
//     $("body").removeClass("loadding");
//     $( "#dialog-message" ).dialog({
//       modal: true,
//     });
//     throw new Error("Please log in first to post comment!");
//   } else {
//     $("#user_name").text(user_name);
//   }

//   // overide d3 click events
//   jQuery.fn.d3Click = function () {
//     this.each(function (i, e) {
//       var evt = new MouseEvent("click");
//       e.dispatchEvent(evt);
//     });
//   };

//   // initialize resizable textarea
//   $( "#comment-textarea" ).resizable({
//     handles: "se"
//   });

//   // initialize jquery ui tabs
//   $( "#visualization-tabs" ).tabs();

//   // initialize multiselect
//   $('#optgroup').multiSelect({ 
//     selectableOptgroup: true,
//     selectableHeader: "<div class='custom-header'>Selectable items</div>",
//     selectionHeader: "<div class='custom-header'>Selection items</div>",
//     cssClass: "multiselect-container-css",
//       afterSelect: function(values){
//         var names = []
//       values.forEach(function(value) {
//         names.push(genNameFromCarId(value));
//       });
//       d3.selectAll("#car-chart .bar").each(function(d){
//         var name = (d.x);
//         if (names.includes(name)) {
//           $(this).d3Click();
//         }
//       })
//     },
//     afterDeselect: function(values){
//         var names = []
//       values.forEach(function(value) {
//         names.push(genNameFromCarId(value));
//       });
//       d3.selectAll("#car-chart .bar").each(function(d){
//         var name = (d.x);
//         if (names.includes(name)) {
//           $(this).d3Click();
//         }
//       })
//     }
//   });

//   // initialize time picker
//   $('#basicExample .time').timepicker({
//       'showDuration': true,
//       'timeFormat': 'g:ia'
//   });

//   $('#basicExample .date').datepicker({
//       'format': 'm/d/yyyy',
//       'autoclose': true
//   });

//   datepair_format = d3.time.format("%m/%d/%Y %H:%M%p");
//   $('#basicExample input').on('change', function(){
//     var sDateTimeStr = $('#basicExample .date.start').val() + " " + $('#basicExample .time.start').val();
//     var eDateTimeStr = $('#basicExample .date.end').val() + " " + $('#basicExample .time.end').val();
//     var sDateTime = datepair_format.parse(sDateTimeStr);
//     var eDateTime = datepair_format.parse(eDateTimeStr);
//     fil["sDate"] = sDateTime;
//     fil["eDate"] = eDateTime;
//     fil["sHour"] = sDateTime.getHours();
//     fil["eHour"] = eDateTime.getHours();

//     if (this.classList.contains("date")) {
//       date.filterRange([fil["sDate"], fil["eDate"]]);
//       var brush = dateChart.brush();
//       brush.extent([fil["sDate"], fil["eDate"]]);
//       flights_filtered = date.bottom(Infinity);
//     } else { //this.classList.contains("time")
//       hour.filterRange([fil["sHour"], fil["eHour"]]);
//       var brush = hourChart.brush();
//       brush.extent([fil["sHour"], fil["eHour"]]);
//       flights_filtered = hour.bottom(Infinity);
//     }
//     flights_filtered = flights_filtered.sort(function(a, b) {
//       return (a.date > b.date) ? 1 : ((a.date < b.date) ? -1 : 0);
//     });
//     map_filters(fil["cars"]);
//     dc.redrawAll();
//   });

//   // $('body').on("click", "#update-datetime", function() {
//   //   dc.filterAll();
//   //   // date.filterRange([fil["sDate"], fil["eDate"]]);
//   //   // hour.filterRange([fil["sHour"], fil["eHour"]]);
//   //   // flights_filtered = date.bottom(Infinity);
//   //   // flights_filtered = flights_filtered.sort(function(a, b) {
//   //   //   return (a.date > b.date) ? 1 : ((a.date < b.date) ? -1 : 0);
//   //   // });
//   //   // hourChart.filter(dc.filters.RangedFilter(fil["sHour"], fil["eHour"]));
//   //   // dateChart.filter(dc.filters.RangedFilter(fil["sDate"], fil["eDate"]));
//   //   map_filters(fil["cars"]);
//   //   dc.redrawAll();
//   // })


//   // function filterAge(low, high) {
// //   dc.filterAll();
// //   hourChart.filter(dc.filters.RangedFilter(low, high));
// //   dc.redrawAll();
// // }

//   // initialize datepair
//   var basicExampleEl = document.getElementById('basicExample');
//   var datepair = new Datepair(basicExampleEl);

//   // initialize datetime based on fil_init
//   // $('#basicExample .date.end').val(new Date())
//   // datepair.refresh();


//   // for spending 
//   selected_set = new Set();

//   d3.csv(shop_locations, function(data) {
//     data.forEach(function(d, i) {
//         colorShop2Cat[d.location] = d.color;
//         shop2Cat[d.location] = d.type
//     });
//   });

//   d3.csv(ass_file, function(error, data) {
//     // retrieve car assignments
//     // populate json
//     data.filter(function(row) {
//       var id = row['CarID'];
//       if (id) {
//         car_ass[id] = row;
//       }
//     });
//   });

// // render map : begin
//   d3.json(mapfile, function(error, topology) {
//       mapG.append("image")
//       .attr("id", "imageMap")
//       .attr("x", "663")
//       .attr("y", "198")
//       .attr("width", "40")
//       .attr("height", "30")
//       .attr("xlink:href", imagemap_file);

//     // draw map
//     mapG.selectAll("path")
//       .data(topojson.object(topology, topology.objects.Kronos).geometries)
//       .enter()
//       .append("path")
//       .attr("d", mapPath)
//       .style("fill-opacity", "0.55");
      
//     draw_location(shoplocations_file);
//   });

// // render map : end

// // for spending visualization : begin
//   d3.csv(cc_data, function(data) {

//     nutrients = crossfilter(data);

//     var peopleShopDim = nutrients.dimension(function(d) { return d["FirstName"] + " " + d["LastName"] + "_" + d["location"]; }),
//     priceByPeopleShop = peopleShopDim.group().reduceSum(
//       function(d) {
//         return d.price; 
//       }
//     ),
//     topPrices = priceByPeopleShop.top(10);
//     var size = priceByPeopleShop.size();
//     var spendings = priceByPeopleShop.top(size);
//     var max_spending = spendings[0].value;
//     var min_spending = spendings[size - 1].value;
//     $("#spending-lowerbound").val(min_spending);
//     $("#spending-upperbound").val(max_spending);

//     // display dataset size
//     d3.select("#spending-size").text(nutrients.size());

//     // display top K lists
//     renderTopList("#spending-list", topPrices);

//     spendingData = priceByPeopleShop.all();
     
//     margin = {top: 20, right: 15, bottom: 100, left: 150}
//       , width = 960 - margin.left - margin.right
//       , height = 640 - margin.top - margin.bottom;
    
//     x = d3.scale.ordinal().rangeRoundBands([0, width], .05);
//     x.domain(spendingData.map(function(d) { return parsePeopleShop(d.key)[0]; }));
    
//     y = d3.scale.ordinal().rangeRoundBands([0, height], .05);
//     y.domain(spendingData.map(function(d) { return parsePeopleShop(d.key)[1]; }));
   
//     chart = d3.select('#spending-content')
//       .append('svg:svg')
//       .attr('width', width + margin.right + margin.left)
//       .attr('height', height + margin.top + margin.bottom)
//       .attr('class', 'chart')

//     main = chart.append('g')
//       .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
//       .attr('width', width)
//       .attr('height', height)
//       .attr('class', 'main')   
          
//       // draw the x axis
//     xAxis = d3.svg.axis()
//       .scale(x)
//       .orient('bottom');

//     main.append('g')
//       .attr('transform', 'translate(0,' + height + ')')
//       .attr('class', 'main axis date')
//       .call(xAxis)
//       .selectAll("text")
//       .style("text-anchor", "end")
//       .attr("dx", "-.8em")
//       .attr("dy", "-.55em")
//       .attr("transform", "rotate(-90)" );;

//       // draw the y axis
//     yAxis = d3.svg.axis()
//       .scale(y)
//       .orient('left');

//     main.append('g')
//       .attr('transform', 'translate(0,0)')
//       .attr('class', 'main axis date')
//       .call(yAxis);

//     gg = main.append("svg:g"); 
//     max_value = d3.max(spendingData, function(d) { return d.value; }),
//     cell_width = width / x.range().length,
//     cell_height = height / y.range().length,
//     max_radius = Math.min(cell_width, cell_height) / 2,
//     min_radius = 2;

//     dots = gg.selectAll("scatter-dots")
//       .data(spendingData)
//       .enter().append("svg:circle")
//         .attr("cx", function (d,i) { 
//           return x(parsePeopleShop(d.key)[0]) + cell_width / 2; 
//         })
//         .attr("cy", function (d) { 
//           return y(parsePeopleShop(d.key)[1]) + cell_height / 2; 
//         })
//         .attr("r", function (d) {
//           if (d.value > 0) {
//             return min_radius + (max_radius - min_radius) * Math.sqrt((d.value - min_spending) / (max_spending - min_spending));
//           }
//           return 0; 
//         })
//         .style('fill', function(d) {
//           return colorShop2Cat[parsePeopleShop(d.key)[1]];
//         })
//         .attr('fill-opacity', 0.8)
//         .on("click", function(d) {
//           var selected = this.classList.contains("selected");
//           if (!selected) {
//             if (selected_set.size === 0) {
//               chart.selectAll("circle").attr('fill-opacity', 0.2);
//             }
//             this.classList.add("selected");
//             $(this).attr('fill-opacity', 0.8);
//             selected_set.add(d.key);
//             var name = parsePeopleShop(d.key)[0],
//               shop = parsePeopleShop(d.key)[1],
//               category = shop2Cat[shop];
//               price = d.value,
//               html = '<tr id="' + 
//                 removeNonAlphanumeric(d.key) + 
//                 '"><td>' + 
//                 name + 
//                 "</td><td>" + 
//                 shop + 
//                 "</td><td>" + 
//                 category + 
//                 "</td><td>" + 
//                 price + 
//                 "</td></tr>";
//             $("#selected-spending").append(html);
//           } else {
//             this.classList.remove("selected");
//             $(this).attr('fill-opacity', 0.2);
//             selected_set.delete(d.key);
//             if (selected_set.size === 0) {
//               chart.selectAll("circle").attr('fill-opacity', 0.8);
//             }
//             $('#' + removeNonAlphanumeric(d.key)).remove();
//           }
//         });
//   });

//   // http://stackoverflow.com/a/1830844
//   function isNumber(n) {
//     return !isNaN(parseFloat(n)) && isFinite(n);
//   }

//   function parsePeopleShop(peopleShop) {
//     return peopleShop.split('_');
//   }

//   function renderTopList(selector, topPrices) {
//     d3.select(selector).selectAll("li")
//       .data(topPrices)
//       .enter().append("li")
//       .text(function(d) { return d.key + ": " + d.value });
//   }

//   function removeNonAlphanumeric(str) {
//     return str.replace(/\W/g, '');
//   }

//   d3.select('#update')
//       .on("click",update);

//   d3.select('#reset')
//       .on("click",reset);

//   function update() {
//       d3.csv(cc_data, function(data) {
//         var dateFormat = d3.time.format("%-m/%-d/%Y %-H:%M");
//         data.forEach(function(d, i) {
//           d.price = d.price;
//       });

//     nutrients = crossfilter(data);

//     var peopleShopDim = nutrients.dimension(function(d) { return d["FirstName"] + " " + d["LastName"] + "_" + d["location"]; }),
//     priceByPeopleShop = peopleShopDim.group().reduceSum(
//       function(d) {
//         return d.price; 
//       }
//     );

//     var spending_lowerbound = $("#spending-lowerbound").val();
//     var spending_upperbound = $("#spending-upperbound").val();
//     var min_spending = spending_upperbound;
//     var max_spending = spending_lowerbound;
//     var data = priceByPeopleShop.all();
//     data.forEach(function(d, i) {
//       if (d.value > 0) {
//         if (d.value >= spending_lowerbound && d.value <= spending_upperbound) {
//           min_spending = Math.min(min_spending, d.value);
//           max_spending = Math.max(max_spending, d.value); 
//         } else {
//           d.value = 0;
//         }
//       }
//     });
      
//       var max_value = d3.max(data, function(d) { return d.value; }),
//       cell_width = width / x.range().length,
//       cell_height = height / y.range().length,
//       max_radius = Math.min(cell_width, cell_height) / 2,
//       min_radius = 2;
//     dots = dots.data(data);
//       dots.transition()
//       .duration(750)
//       .attr("r", function(d) {
//         if (d.value > 0) {
//           return min_radius + (max_radius - min_radius) * Math.sqrt((d.value - min_spending) / (max_spending - min_spending));
//         }
//         return 0; 
//           });
//       });
//   };

//   function reset() {
//       d3.csv(cc_data, function(data) {
//         var dateFormat = d3.time.format("%-m/%-d/%Y %-H:%M");
//         data.forEach(function(d, i) {
//           d.price = d.price;
//       });

//     nutrients = crossfilter(data);

//     var peopleShopDim = nutrients.dimension(function(d) { return d["FirstName"] + " " + d["LastName"] + "_" + d["location"]; }),
//     priceByPeopleShop = peopleShopDim.group().reduceSum(
//       function(d) {
//         return d.price; 
//       }
//     );
//     topPrices = priceByPeopleShop.top(10);
//     var size = priceByPeopleShop.size();
//     var spendings = priceByPeopleShop.top(size);
//     var max_spending = spendings[0].value;
//     var min_spending = spendings[size - 1].value;
//     $("#spending-lowerbound").val(min_spending);
//     $("#spending-upperbound").val(max_spending);

//     var data = priceByPeopleShop.all();
      
//       var max_value = d3.max(data, function(d) { return d.value; }),
//       cell_width = width / x.range().length,
//       cell_height = height / y.range().length,
//       max_radius = Math.min(cell_width, cell_height) / 2,
//       min_radius = 2;
//     dots = dots.data(data);
//       dots.transition()
//       .duration(750)
//       .attr("r", function(d) {
//         if (d.value > 0) {
//           return min_radius + (max_radius - min_radius) * Math.sqrt((d.value - min_spending) / (max_spending - min_spending));
//         }
//         return 0; 
//           });
//       });

//       selected_set.clear();
//       d3.selectAll("circle").classed("selected", false);
//       $("#selected-spending").empty();
//       $("#selected-spending").append('<tr><th>Name</th><th>Shop</th><th>Type</th><th>Spending</th></tr>');
//       d3.selectAll("circle").attr('fill-opacity', 0.8);
//   };

// // for spending visualization : end

// // for trajectory visualization : begin

//   d3.csv(gps_data, function(error, data) {

//     var dateFormat = d3.time.format("%m/%d/%Y %H:%M:%S");
//     var numberFormat = d3.format(".2f");

//     data.forEach(function (d) {
//         d.date = dateFormat.parse(d.Timestamp);
//         d.name = genNameFromCarId(d.id);
//         name2CarId[d.name] = d.id;
//     });

//     flight = crossfilter(data);
//     date = flight.dimension(function(d) { return d.date; });
//     dates = date.group(d3.time.day);
//     hour = flight.dimension(function(d) { return d.date.getHours() + d.date.getMinutes() / 60; });
//     hours = hour.group(Math.floor);
//     carDim = flight.dimension(function(d) { return d.name; });
//     carGroup = carDim.group().reduceSum(function(d) { return 1; });

//     carChart
//       .width(960)
//       .height(180)
//       .margins({top: 10, right: 10, bottom: 100, left: 50})
//       .x(d3.scale.ordinal())
//       .xUnits(dc.units.ordinal)
//       .elasticY(true)
//       .elasticX(true)
//       .brushOn(false)
//       .dimension(carDim)
//       .barPadding(0.1)
//       .outerPadding(0.05)
//       .group(carGroup)
//       .renderlet(function(chart){
//           chart.selectAll("rect.bar").attr("fill", function(d){
//             if (d) {
//               return stringToColour(d.x);          
//             }
//           });
//           chart.selectAll("rect.bar.deselected").style("fill", function (d) {
//               return '#ccc';
//           });
//       })
//       .on('pretransition', function (chart) {
//           chart.selectAll("rect.bar").style("fill", function (d) {
//               if (d) {
//                 return stringToColour(d.x);          
//               }
//           });
//           chart.selectAll("rect.bar.deselected").style("fill", function (d) {
//               return '#ccc';
//           });
//       })
//       .yAxis().ticks(5);

//     carChart.on("filtered", function (chart) {
//       fil["cars"] = []
//       var f = chart.filters();
//       if (f.length === 0) {
//         fil["cars"] = fil_init["cars"];
//       } else {
//         for (key in f) {
//           fil["cars"].push(name2CarId[f[key]]);
//         }     
//       }
//       map_filters(fil["cars"]);
//     });

//     $("body").on("click", "#car-chart .bar", function(e) {

//       var name1 = this.textContent.split(":")[0];

//       if (this.classList.contains("selected")) {
//         $(".ms-elem-selectable").each(function(d) {
//           var name2 = this.textContent.split("(")[0].trim();
//           if (name1 === name2) {
//             this.style.display = "none";
//             if ($(this).siblings(".ms-elem-selectable:visible").length === 0) {
//               $(this).siblings(".ms-optgroup-label")[0].style.display = "none";
//             } 
//           }
//         });
//         $(".ms-elem-selection").each(function(d) {
//           var name2 = this.textContent.split("(")[0].trim();
//           if (name1 === name2) {
//             this.style.display = "";
//             $(this).siblings(".ms-optgroup-label")[0].style.display = "";
//           }
//         });
//       }

//       if (this.classList.contains("deselected")) {
//         $(".ms-elem-selection").each(function(d) {
//           var name2 = this.textContent.split("(")[0].trim();
//           if (name1 === name2) {
//             this.style.display = "none";
//             if ($(this).siblings(".ms-elem-selection:visible").length === 0) {
//               $(this).siblings(".ms-optgroup-label")[0].style.display = "none";
//             } 
//           }
//         });
//         $(".ms-elem-selectable").each(function(d) {
//           var name2 = this.textContent.split("(")[0].trim();
//           if (name1 === name2) {
//             this.style.display = "";
//             $(this).siblings(".ms-optgroup-label")[0].style.display = "";
//           }
//         });
//       }

//     })

//     dateChart.width(960)
//       .height(100)
//       .margins({top: 10, right: 10, bottom: 20, left: 50})
//       .dimension(date)
//       .group(dates)
//       .round(d3.time.day.round)
//       .centerBar(true)
//       .gap(0)
//       .x(d3.time.scale().domain([fil_init["sDate"], fil_init["eDate"]]))
//       .filter([fil["sDate"], fil["eDate"]])
//       .xUnits(d3.time.days)
//       .elasticY(true)
//       .filterPrinter(function (filter) {
//         var sDateStr = filter[0][0].toDateString();
//         var eDateStr = filter[0][1].toDateString();
//         $("#date-chart .sdate").html(sDateStr);
//         $("#date-chart .edate").html(eDateStr);
//       });

//     dateChart.xAxis().ticks(15);
//     dateChart.yAxis().ticks(5);

//     dateChart.on('filtered', function(dateChart) {
//       if (dateChart.userIsBrushing) return;
//       if (dateChart.filter()) {
//         fil["sDate"] = dateChart.filter()[0];
//         fil["eDate"] = dateChart.filter()[1];
//       } else {
//         fil["sDate"] = fil_init["sDate"];
//         fil["eDate"] = fil_init["eDate"];  
//       }
//       date.filterRange([fil["sDate"], fil["eDate"]]);

//       var sDateStr = fil["sDate"].toLocaleString().split(",")[0];
//       var eDateStr = fil["eDate"].toLocaleString().split(",")[0];
//       $('#basicExample .date.start').val(sDateStr);
//       $('#basicExample .date.end').val(eDateStr);

//       flights_filtered = date.bottom(Infinity);
//       flights_filtered = flights_filtered.sort(function(a, b) {
//         return (a.date > b.date) ? 1 : ((a.date < b.date) ? -1 : 0);
//       });
//       map_filters(fil["cars"]);
//     });
      
//     hourChart.width(960)
//       .height(100)
//       .margins({top: 10, right: 10, bottom: 20, left: 50})
//       .dimension(hour)
//       .group(hours)
//       .round(d3.time.hour.round)
//       .centerBar(true)
//       .gap(0)
//       .x(d3.scale.linear().domain([fil_init["sHour"], fil_init["eHour"]]))
//       .filter([7, 9])
//       .elasticY(true)
//       .yAxisPadding(200)
//       .filterPrinter(function (filter) {
//         var sHourStr = Math.floor(filter[0][0])
//         var eHourStr = Math.ceil(filter[0][1])
//         $("#hour-chart .shour").html(sHourStr);
//         $("#hour-chart .ehour").html(eHourStr);
//       });

//     hourChart.xAxis().ticks(24);
//     hourChart.yAxis().ticks(5);

//     hourChart.on("filtered", function (chart) {
//       if (hourChart.userIsBrushing) return;
//       if (hourChart.filter()) {
//         fil["sHour"] = hourChart.filter()[0];
//         fil["eHour"] = hourChart.filter()[1];
//       } else {
//         fil["sHour"] = fil_init["sHour"];
//         fil["eHour"] = fil_init["eHour"];  
//       }
//       hour.filterRange([fil["sHour"], fil["eHour"]]);

//       $('#basicExample .time.start').val(floatToTime(fil["sHour"]));
//       $('#basicExample .time.end').val(floatToTime(fil["eHour"]));

//       flights_filtered = hour.bottom(Infinity);
//       flights_filtered = flights_filtered.sort(function(a, b) {
//         return (a.date > b.date) ? 1 : ((a.date < b.date) ? -1 : 0);
//       });
//       map_filters(fil["cars"]);
//     });

//     date.filterRange([fil["sDate"], fil["eDate"]]);
//     hour.filterRange([fil["sHour"], fil["eHour"]]);
//     flights_filtered = date.bottom(Infinity);
//     flights_filtered = flights_filtered.sort(function(a, b) {
//       return (a.date > b.date) ? 1 : ((a.date < b.date) ? -1 : 0);
//     });
//     map_filters(fil["cars"]);

//     dc.renderAll();

//     var dateChartBrush = dateChart.brush();
//     dateChartBrush.on('brushstart', function() {
//       dateChart.userIsBrushing = true;
//     });
//     dateChartBrush.on('brushend', function(e) {
//       dateChart.userIsBrushing = false;
//       console.log("brushend");
//     });

//     var hourChartBrush = hourChart.brush();
//     hourChartBrush.on('brushstart', function() {
//       hourChart.userIsBrushing = true;
//     });
//     hourChartBrush.on('brushend', function() {
//       hourChart.userIsBrushing = false;
//     });
//   });
  
//   // for trajectory visualization : end
// });

// var map_filters = function(cars) {
//   remove_paths(lastCars);
//   map_filter(cars);
//   lastCars = cars;
//   $("body").removeClass("loadding");
// }

// function remove_paths(cars) {
//   cars.map(function(item) {
//     $("#car_" + item).remove();    
//   });
// }

// function getRandomSubarray(arr, size) {
//     var shuffled = arr.slice(0), i = arr.length, temp, index;
//     while (i--) {
//         index = Math.floor((i + 1) * Math.random());
//         temp = shuffled[index];
//         shuffled[index] = shuffled[i];
//         shuffled[i] = temp;
//     }
//     return shuffled.slice(0, size);
// }

// var map_filter = function(cars) {
//     //data = getRandomSubarray(data, 5000);
//     var interval_threshold = 5 * 60 * 1000;
//     var time_format = d3.time.format("%m/%d/%Y %H:%M:%S");
//     var traj = {};
//     var ret = {};
//     for (key in cars_id) {
//       var car_id = cars_id[key];
//       traj[car_id.toString()] = [];
//     }
//     var data = flights_filtered;
//     for (var i = 0 ; i < data.length ; i++) {
//       var d = data[i];
//       var datetime = time_format.parse(d.Timestamp);
//       var cur = {'lat':d.lat, 'lon':d.long, 'datetime':datetime};
//       traj[d.id].push(cur);
//     }
//     for (key in cars_id) {
//       var i = cars_id[key];
//       ret[i] = [[]];
//       for (var j = 0; j < traj[i].length; j++) {
//         if (j === 0) {
//           ret[i][0].push(traj[i][j]);
//         } else {
//           var interval = traj[i][j].datetime - traj[i][j - 1].datetime;
//           if (interval < interval_threshold) {
//             ret[i][ret[i].length - 1].push(traj[i][j]);
//           } else {
//             ret[i].push([traj[i][j]]);
//           }
//         }
//       }
//     }

// // timeline visualization begin
//     tasks = [];
//     for (i in cars) {
//       var car_id = cars[i];
//       draw_path(car_id, ret[car_id]);
//       for (j in ret[car_id]) {
//         var path = ret[car_id][j];
//         if (path.length > 0) {
//           var task = {};
//           task["startDate"] = path[0].datetime;
//           task["endDate"] = path[path.length - 1].datetime;
//           task["taskName"] = genNameFromCarId(car_id);
//           task["status"] = "SUCCEEDED";
//           tasks.push(task);     
//         }
//       }
//     }

//     if ($("#timeline-chart").children().length === 0) {
//       var taskStatus = {};

//       var taskNames = Object.keys(name2CarId);

//       tasks.sort(function(a, b) {
//         return a.endDate - b.endDate;
//       });
//       var maxDate = tasks[tasks.length - 1].endDate;
//       tasks.sort(function(a, b) {
//         return a.startDate - b.startDate;
//       });
//       var minDate = tasks[0].startDate;

//       var format = "%Y/%m/%d %H:%M:%S";

//       gantt = d3.gantt().taskTypes(taskNames).taskStatus(taskStatus).tickFormat(format);
//       gantt(tasks);     
//     }
//     gantt.redraw(tasks);

// // timeline visualization end
// };

// function draw_path(car, data) {

//   var lineFunction = d3.svg.line()
//     .x(function(d) { return mapProjection([d.lon, d.lat])[0]; })
//     .y(function(d) { return mapProjection([d.lon, d.lat])[1]; })
//     .interpolate("linear");
    
//   mapG.append("g")
//     .attr("id", "car_" + car)
//     .attr("class", "car_path")
//     .selectAll("path")
//     .data(data)
//   .enter()
//     .append("path")
//     .attr("d", function (d) { return lineFunction(d); })
//     .attr("style", function() { 
//       var name = genNameFromCarId(car);
//       var color = stringToColour(name);
//       return "stroke: " + color + "; stroke-width: 0.07; stroke-opacity: 0.4; fill: none;"; 
//     })
//     .attr("title", function(d) { 
//       var name = genNameFromCarId(car);
//       return name + " </br> "+ (d.length === 0 ? "" : d[0].datetime.toLocaleString()); } 
//     )
//     .attr("class", "tooltipsy");

//   $('#car_'+car+' .tooltipsy').tooltipsy({ 
//     alignTo: 'cursor',
//     gravity: 'w',
//     html: true
//   });
// }

// function draw_location(file) {
//   d3.csv(file, function(data) {
//     mapG.append("g")
//       .attr("id", "shops")
//       //.style("fill", "green")
//       .selectAll("circle")
//       .data(data)
//       .enter()
//       .append("circle")
//   .attr("cx", function(d) {
//     return mapProjection([d.long.replace(",","."), d.lat.replace(",",".")])[0];
//   })
//   .attr("cy", function(d) {
//     return mapProjection([d.long.replace(",","."), d.lat.replace(",",".")])[1];
//   })
//   .style("fill", function(d) { return d.color; } )
//   .attr("r", 0.25)
//   .attr("title", function(d) {return d.location;});
  
//     $('#shops circle').tooltipsy({ 
//       gravity: 'w', 
//       html: true
//     });
    
//   });
// }

// function initMapPos() {
//   mapZoom.scale(23.46238603083991);
//   mapZoom.translate([-15546.28287976356, -4728.117341387566]);
//   mapSvg.transition().duration(200).call(mapZoom.event);
// }

// var stringToColour = function(str) {
//   var hash = 0;
//   for (var i = 0; i < str.length; i++) {
//     hash = str.charCodeAt(i) + ((hash << 5) - hash);
//   }
//   var colour = '#';
//   for (var i = 0; i < 3; i++) {
//     var value = (hash >> (i * 8)) & 0xFF;
//     colour += ('00' + value.toString(16)).substr(-2);
//   }
//   return colour;
// }

// var genNameFromCarId = function(id) {
//   if (car_ass[id]) {
//     var fname = car_ass[id].FirstName;
//     var lname = car_ass[id].LastName;
//     return fname + " " + lname;
//   } else {
//     return "car_" + id;
//   }
// }

// var floatToTime = function(num) {
//   var minute = Math.round((num * 60) % 60);
//   var hour = Math.floor(num);
//   var appendix = "am";
//   if (hour > 12) {
//   hour -= 12;
//   appendix = "pm";
//   }
//   return "" + hour + ":" + ("00" + Math.floor(fil["eHour"])).slice(-2) + appendix;
// }

// var showForumCommentList = function() {
//   $.ajax({
//     url: '/api_va/get_statement_comment_list/',
//     type: 'post',
//     data: {
//     },
//     success: function(xhr) {  
//       $('#forum-comment').html(xhr.forum_comment);
//       $(".comment .text p").each(function( index ) {
//         var str = $(this).html();
//         str = str.replaceAll("{", '<a href="#" class="visref_id " value="');
//         str = str.replaceAll("}", '"><span class="ui-icon ui-icon-image"></span></a>');
//         $(this).html(str);
//       });
//     },
//     error: function(xhr) {
//       if (xhr.status == 403) {
//         Utils.notify('error', xhr.responseText);
//       }
//     }
//   }); 
// }

// String.prototype.replaceAll = function(search, replacement) {
//     var target = this;
//     return target.replace(new RegExp(search, 'g'), replacement);
// };

// var init_comment_events = function() {
//   $("body").on("click", ".visref_id", function(){
//     var visref_id = $(this).attr("value");
//     $.ajax({
//       url: '/api_va/get_visref/',
//       type: 'post',
//       data: {
//         'visref_id': visref_id,
//       },
//       success: function(xhr) {
//         var config = JSON.parse(xhr.config);
//         var format = d3.time.format("%Y-%m-%d");
//         config["sDate"] = format.parse(config["sDate"].split("T")[0]);
//         config["eDate"] = format.parse(config["eDate"].split("T")[0]);
//         fil = config;

//         var sDateStr = fil["sDate"].toLocaleString().split(",")[0];
//         var eDateStr = fil["eDate"].toLocaleString().split(",")[0];
//         $('#basicExample .date.start').val(sDateStr);
//         $('#basicExample .date.end').val(eDateStr);

//         date.filterRange([fil["sDate"], fil["eDate"]]);
//         var brush = dateChart.brush();
//         brush.extent([fil["sDate"], fil["eDate"]]);
//         flights_filtered = date.bottom(Infinity);

//         hour.filterRange([fil["sHour"], fil["eHour"]]);
//         brush = hourChart.brush();
//         brush.extent([fil["sHour"], fil["eHour"]]);
//         flights_filtered = hour.bottom(Infinity);

//         flights_filtered = flights_filtered.sort(function(a, b) {
//           return (a.date > b.date) ? 1 : ((a.date < b.date) ? -1 : 0);
//         });
        
//         dc.redrawAll();

//         var _cars = fil["cars"].toString().split(",")
//         if (_cars.length === 40) {
//           d3.selectAll("#car-chart .bar").each(function(d){
//             var car_id = name2CarId[d.x];
//             if( this.classList.contains("deselected") ){
//               $(this).d3Click();
//             }
//           })          
//         } else {
//           d3.selectAll("#car-chart .bar").each(function(d){
//             var car_id = name2CarId[d.x];
//             if( (_cars.includes(car_id) && this.classList.contains("deselected") ) ||
//                 (!_cars.includes(car_id) && this.classList.contains("selected") ) 
//             ){
//               $(this).d3Click();
//             }
//           })          
//         }

//         map_filters(fil["cars"]);
//       },
//       error: function(xhr) {
//         if (xhr.status == 403) {
//           Utils.notify('error', xhr.responseText);
//         }
//       }
//     }); 
//   }).on("click", ".ref-vis", function(){
//     var $textarea = $(this).closest(".form").find("textarea");
//     var config = JSON.stringify(fil);
//     var visref_parent = sessionStorage.getItem("visref_parent");
//     if (!visref_parent) visref_parent = "null";
//     $.ajax({
//       url: '/api_va/put_visref/',
//       type: 'post',
//       data: {
//         'config': config,
//         'visref_parent': visref_parent,
//       },
//       success: function(xhr) {
//         console.log(xhr);
//         var content = $textarea.val();
//         content = content + "{" + xhr.visref_id + "}";
//         $textarea.val(content);
//       },
//       error: function(xhr) {
//         if (xhr.status == 403) {
//           Utils.notify('error', xhr.responseText);
//         }
//       }
//     }); 
//   }).on("click", ".comment-post", function(){
//     var textarea = $(this).closest(".comment-container").find("textarea");
//     var text = textarea.val();
//     var parent_id = "";
//     if (text == "") {
//       Utils.notify('warning', "Empty content not accepted");
//     } else {
//       $.ajax({
//         url: '/phase5/put_statement_comment/',
//         type: 'post',
//         data: {
//           'text': text,
//           'parent_id': parent_id,
//         },
//         success: function(xhr) {
//           textarea.val("");
//           showForumCommentList();
//         },
//         error: function(xhr) {
//           if (xhr.status == 403) {
//             Utils.notify('error', xhr.responseText);
//           }
//         }
//       });     
//     }
//   }).on("click", ".comment-reply-save", function(){
//     var text = $(this).closest("form").find("textarea").val();
//     var parent_id = $(this).closest(".comment").attr("comment-id");
//     var textarea = $(this).closest("form").find("textarea");
//     $.ajax({
//       url: '/phase5/put_statement_comment/',
//       type: 'post',
//       data: {
//         'text': text,
//         'parent_id': parent_id,
//       },
//       success: function(xhr) {
//         textarea.val("");
//         textarea.closest(".form").hide();
//         showForumCommentList();
//       },
//       error: function(xhr) {
//         if (xhr.status == 403) {
//           Utils.notify('error', xhr.responseText);
//         }
//       }
//     });
//   }).on("click", ".comment-reply-cancel", function(){
//     var textarea = $(this).closest("form").find("textarea");
//     textarea.val("");
//     textarea.closest(".form").hide();
//   }).on("click", ".comment-reply", function(){
//     $(this).closest(".content").find(".form").show();
//     $('textarea').each(function () {
//       this.setAttribute('style', 'height:' + (this.scrollHeight) + 'px;overflow-y:hidden;');
//     }).on('input', function () {
//       this.style.height = 'auto';
//       this.style.height = (this.scrollHeight) + 'px';
//     });
//   });
// }
