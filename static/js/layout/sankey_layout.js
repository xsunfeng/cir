define([
  'd3',
  'd3-tooltip',
  'sankey',
  'jquery',
  'semantic-ui',
  'utils',
  'workbench2',
  'nouislider'
], function(
  d3,
  tip,
  sankey_module,
  $,
  semantic,
  Utils,
  workbench_module,
  noUiSlider
) {

  var module = {};

  module.init = function() {
    barchart_size = {width: 700, height:230};
    sankey_size = {width: 700, height:600}
    timerange_num_interval = 40;
    module.focus_node = "";

    module["focusNode"];
    module["nodeStyle"] = {};
    module.time_lower_bound = "1970 01 01 00 00 00";
    module.time_upper_bound = "2100 01 01 00 00 00";
    
    module.barchart_ajax;
    module.nodeMap = {};
    module.time_bound_list = [];

    module["relation"] = $("#sankey-relation .item.active").attr("data-value");

    module.coverage_map = {}
    module.coverage_map_filtered = {}
    module.coverage_map_selected = {};

    isDown = false;   // Tracks status of mouse button
    $(document).mousedown(function() {
      isDown = true;      // When mouse goes down, set isDown to true
    })
    .mouseup(function() {
      isDown = false;    // When mouse goes up, set isDown to false
    });

    hide_rec();
    init_slider();
    add_selection_elements();
    module.get_sankey();
    module.get_barchart();
    init_eventhandlers();

    $('#sankey-relation .item').tab();
  }

  // update bar chart
  module.update_barchart = function () {
    var selected = $(".node.active").attr("data-id");
    var filter = get_filter();
    module.barchart_ajax = $.ajax({
      url: '/sankey/get_barchart/',
      type: 'post',
      data: {
        "time_lower_bound": filter.time_lower_bound,
        "time_upper_bound": filter.time_upper_bound,
        "doc_ids": filter.doc_ids,
        "author_ids": filter.author_ids,
        "theme_ids": filter.theme_ids,
        "selected": selected
      },
      success: function(xhr) {

        var data = xhr.data;
        var ageNames = ["num_nugget_ind", "num_nugget_sel"];
        data.forEach(function(d) {
          d.ages = ageNames.map(function(name) { 
            return {name: name, value: +d[name]}; 
          });
        });
        var svg = d3.select("#barchart").select("svg")
        var state = svg.selectAll(".state")
            .data(data);

        var margin = {top: 20, right: 20, bottom: 30, left: 40},
            width = barchart_size.width - margin.left - margin.right,
            height = barchart_size.height - margin.top - margin.bottom;

        state.selectAll("rect")
            .data(function(d) { return d.ages; })
            .attr("width", function(d) {
              return sankey_x1.rangeBand();
            })
            .attr("x", function(d) { return sankey_x1(d.name); })
            .attr("y", function(d) { 
              return sankey_y(d.value); 
            })
            .attr("height", function(d) { 
              return height - sankey_y(d.value); 
            });

      },
      error: function(xhr) {
        if (xhr.status == 403) {
          Utils.notify('error', xhr.responseText);
        }
      }
    });
  }

  // enter bar chart
  module.get_barchart = function () {

    if (module.barchart_ajax) module.barchart_ajax.abort();
    var loader_str = '<div class="ui segment" style="height:' + barchart_size.height + 'px;">' +
      '<div class="ui inverted dimmer active">' +
      '<div class="ui large text loader">Loading</div>' +
      '</div><p></p><p></p><p></p></div>';
    $("#barchart").html(loader_str);

    var selected = "" | $(".node.active").attr("data-id");
    var filter = get_filter();
    module.barchart_ajax = $.ajax({
      url: '/sankey/get_barchart/',
      type: 'post',
      data: {
        "time_lower_bound": filter.time_lower_bound,
        "time_upper_bound": filter.time_upper_bound,
        "doc_ids": filter.doc_ids,
        "author_ids": filter.author_ids,
        "theme_ids": filter.theme_ids,
        "selected": selected
      },
      success: function(xhr) {

        $("#barchart").html("");
        var data = xhr.data;

        // initiate once, set time range
        if ($(timerange_lower_value).attr("data-value") === "0") {
          var xs = data[0].time_lower_bound;
          var xl = data[data.length - 1].time_upper_bound;
          var min_time = date2number(xs);
          var max_time = date2number(xl);
          var interval = Math.ceil((max_time - min_time) / (timerange_num_interval - 1));
          for(var i = 0; i < timerange_num_interval; i++) {
              timerange_arr[i] = min_time + i * interval;
          }
          $(timerange_lower_value).attr("data-value", min_time);
          $(timerange_upper_value).attr("data-value", max_time);
          $(timerange_lower_value).text(number2date_pretty(min_time));
          $(timerange_upper_value).text(number2date_pretty(max_time));
        }

        var margin = {top: 20, right: 20, bottom: 30, left: 40},
            width = barchart_size.width - margin.left - margin.right,
            height = barchart_size.height - margin.top - margin.bottom;

        sankey_x0 = d3.scale.ordinal()
            .rangeRoundBands([0, width], .2);

        sankey_x1 = d3.scale.ordinal();

        sankey_y = d3.scale.linear()
            .range([height, 0]);

        var color = d3.scale.ordinal()
            .range(["#98abc5", "#8a89a6", "#7b6888", "#6b486b", "#a05d56", "#d0743c", "#ff8c00"]);

        var xAxis = d3.svg.axis()
            .scale(sankey_x0)
            .orient("bottom");

        var yAxis = d3.svg.axis()
            .scale(sankey_y)
            .orient("left")
            .tickFormat(d3.format(".2s"));

        var svg = d3.select("#barchart").append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
          .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

          var ageNames = ["num_nugget_ind", "num_nugget_sel"];

          data.forEach(function(d) {
            d.ages = ageNames.map(function(name) { 
              return {name: name, value: +d[name]}; 
            });
          });

          sankey_x0.domain(data.map(function(d) { 
            return d.time; 
          }));
          sankey_x1.domain(ageNames).rangeRoundBands([0, sankey_x0.rangeBand()]);
          sankey_y.domain([0, d3.max(data, function(d) { 
            return d3.max(d.ages, function(d) { 
              return d.value; 
            }); 
          })]);

          svg.append("g")
              .attr("class", "x axis")
              .attr("transform", "translate(0," + height + ")")
              .call(xAxis);

          svg.append("g")
              .attr("class", "y axis")
              .call(yAxis)
            .append("text")
              .attr("transform", "rotate(-90)")
              .attr("y", 6)
              .attr("dy", ".71em")
              .style("text-anchor", "end")
              .text("#nuggets");

          var state = svg.selectAll(".state")
              .data(data)
            .enter().append("g")
              .attr("class", "state")
              .attr("transform", function(d) { return "translate(" + sankey_x0(d.time) + ",0)"; });

          state.selectAll("rect")
              .data(function(d) { return d.ages; })
            .enter().append("rect")
              .attr("width", function(d) { return sankey_x1.rangeBand(); })
              .attr("x", function(d) { return sankey_x1(d.name); })
              .attr("y", function(d) { return sankey_y(d.value); })
              .attr("height", function(d) { return height - sankey_y(d.value); })
              .style("fill", function(d) { 
                if (d.name === ageNames[0]) return "#C0E7F3";
                if (d.name === ageNames[1]) return "#67C7E2";
              });

          var legend = svg.selectAll(".legend")
              .data(ageNames.slice().reverse())
            .enter().append("g")
              .attr("class", "legend")
              .attr("transform", function(d, i) { return "translate(0," + i * 20 + ")"; });

          legend.append("rect")
              .attr("x", width - 18)
              .attr("width", 18)
              .attr("height", 18)
              .style("fill", function(d){
                if (d === ageNames[0]) return "#C0E7F3";
                if (d === ageNames[1]) return "#67C7E2";
              });

          legend.append("text")
              .attr("x", width - 24)
              .attr("y", 9)
              .attr("dy", ".35em")
              .style("text-anchor", "end")
              .text(function(d) { 
                if (d === ageNames[0]) return "filtered";
                if (d === ageNames[1]) return "selected";
              });

      },
      error: function(xhr) {
        if (xhr.status == 403) {
          Utils.notify('error', xhr.responseText);
        }
      }
    });
  }

  // sankey
  module.get_sankey = function() {   
    
    if (module.sankey_ajax) module.sankey_ajax.abort();

    var loader_str = '<div class="ui segment" style="height:' + sankey_size.height + 'px;">' +
      '<div class="ui inverted dimmer active">' +
      '<div class="ui large text loader">Loading</div>' +
      '</div><p></p><p></p><p></p></div>';
    $("#sankey").html(loader_str);

    filter = get_filter();
    var sankey_ajax = $.ajax({
      url: '/sankey/get_graph/',
      type: 'post',
      data: {
        "time_lower_bound": filter.time_lower_bound,
        "time_upper_bound": filter.time_upper_bound,
        "doc_ids": filter.doc_ids,
        "author_ids": filter.author_ids,
        "theme_ids": filter.theme_ids,
        "relation": module["relation"]
      },
      success: function(xhr) {
        $("#sankey").html("");
        init_sankey(xhr);
        // $("svg").attr("class", "ui segment");
      },
      error: function(xhr) {
        if (xhr.status == 403) {
          Utils.notify('error', xhr.responseText);
        }
      }
    });
  }

  function init_sankey(xhr){

        var units = "Nuggets";
         
        var margin = {top: 30, right: 30, bottom: 30, left: 30},
            width = sankey_size.width - margin.left - margin.right,
            height = sankey_size.height - margin.top - margin.bottom;
         
        var formatNumber = d3.format(",.0f"),    // zero decimal places
            format = function(d) { 
              return formatNumber(d) + " " + units; 
            },
            color = d3.scale.category20b();

        // append the svg canvas to the page
        var svg = d3.select("#sankey").append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
          .append("g")
            .attr("transform", 
                  "translate(" + margin.left + "," + margin.top + ")");
         
        // Set the sankey diagram properties
        var sankey = d3.sankey()
            .nodeWidth(40)
            .nodePadding(10)
            .size([width, height]);
         
        var path = sankey.link();

        // create graph from xhr
        var graph = {}
        graph["links"] = xhr["links"]
        graph["nodes"] = xhr["nodes"]

        // convert source/target type from string to object
        module.nodeMap = {};
        graph.nodes.forEach(function(x) { module.nodeMap[x.name] = x; });
        graph.links = graph.links.map(function(x) {
          return {
            source: module.nodeMap[x.source],
            target: module.nodeMap[x.target],
            value: x.value
          };
        });

        sankey
            .nodes(graph.nodes)
            .links(graph.links)
            .layout(1);
       
        // add in the links
        var link = svg.append("g").selectAll(".link")
            .data(graph.links)
          .enter().append("path")
            .attr("class", "link")
            .attr("d", path)
            .style("stroke-width", function(d) { return Math.max(1, d.dy); })
            .sort(function(a, b) { return b.dy - a.dy; });
       
        // add the link titles
        link.append("title")
              .text(function(d) {
              // return d.source.name + " → " + 
              //         d.target.name + "\n" + format(d.value); });
              return format(d.value) + " extarcted from " + d.source.name + " belong to " + d.target.name ; });
       
        // add in the nodes
        var node = svg.append("g").selectAll(".node")
            .data(graph.nodes)
          .enter().append("g")
            .attr("class", "node")
            .attr("data-id", function(d) {
              // thus name has to follow format 'type-id'
              return d.name;
            })
            .attr("num-nugget", function(d){ return d.value; })
            .attr("transform", function(d) { 
            return "translate(" + d.x + "," + d.y + ")"; });
          // .call(d3.behavior.drag()
          //   .origin(function(d) { 
          //     return d; 
          //   })
          //   .on("dragstart", function() { 
          //   this.parentNode.appendChild(this); })
          //   .on("drag", dragmove));

        node.classed("doc-node", function(d) {
          if(d.name.includes("doc")) return true;
          else return false;
        });
        node.classed("section-node", function(d) {
          if(d.name.includes("section")) return true;
          else return false;
        });
        node.classed("author-node", function(d) {
          if(d.name.includes("author")) return true;
          else return false;
        });
        node.classed("theme-node", function(d) {
          if(d.name.includes("theme")) return true;
          else return false;
        });

        // mouseover and mouseout events on node
        node.on('click', function(d) {
          if (d3.select(this).classed("active")) {
            d3.select(this).classed("active", false);
            link.style('stroke-opacity', function(l) {
              var opacity = 0.2;
              return opacity;
            });
          } else {

            d3.selectAll(".node.active").classed("active",false)
            link.style('stroke-opacity', function(l) {
              var opacity = 0.2;
              return opacity;
            });
            d3.select(this).classed("active", true);

            if (d.name.startsWith("doc")){
              module.focus_node = d.name;
              get_doc_bar();
            } else {
              if (module.focus_node === "") {
                get_doc_bar();
              } else {
                var doc_id = module.focus_node.split("-")[1];
                get_doc_bar();    
              }
            }

            var focusLinkSet = new Set();
            var focusNodeSet = new Set();

            if (d.name.includes("doc")) {
              // from doc --> doc --> theme
              focusNodeSet.add(d);
              link.style('', function(l) {
                if (d === l.source) {
                  focusLinkSet.add(l);
                  focusNodeSet.add(l.target);
                }
              });
              link.style('', function(l) {
                if (d === l.source) {
                  focusNodeSet.has(l.source);
                  focusLinkSet.add(l);
                }
              });
              link.style('stroke-opacity', function(l) {
                var opacity = 0.2;
                if(focusNodeSet.has(l.source)) {
                  opacity = 0.5;
                }
                return opacity;
              });
            } else if (d.name.includes("theme")) {
              // from theme --> section --> doc
              focusNodeSet.add(d);
              link.style('', function(l) {
                if (d === l.target) {
                  focusLinkSet.add(l);
                  focusNodeSet.add(l.source);
                }
              });
              link.style('', function(l) {
                if (d === l.target) {
                  focusNodeSet.has(l.target);
                  focusLinkSet.add(l);
                }
              });
              link.style('stroke-opacity', function(l) {
                var opacity = 0.2;
                if(focusNodeSet.has(l.target)) {
                  opacity = 0.5;
                }
                return opacity;
              });
            } else {
              link.style('stroke-opacity', function(l) {
                var opacity = 0.2;
              if (d === l.source || d === l.target) {
                opacity = 0.5;
              }
                return opacity;
              });           
            }
          }
          module.update_barchart();
        });

        // add the rectangles for the nodes
        node.append("rect")
            .attr("height", function(d) { return d.dy; })
            .attr("width", sankey.nodeWidth())
            .style("fill", function(d) { 
              if (d.name.includes("section")) {
                return d.color = "blue";
              }
              if (d.name.includes("theme")) {
                return d.color = "yellow";
              }
              if (d.name.includes("doc")) {
                return d.color = "green";
              }
              if (d.name.includes("author")) {
                return d.color = "red";
              }
              return d.color = color(d.name.replace(/ .*/, ""));
            })
            .style("fill-opacity", function(d) { return 0.5;})
            .style("stroke-width", function(d) { return "0"; })
          .append("title")
            .text(function(d) { 
              // return d.text + "\n" + format(d.value);
              return d.text + "\n" + format(d.value); 
            });

        // add in the title for the nodes
        node.append("text")
            .attr("x", -6)
            .attr("y", function(d) { return d.dy / 2; })
            .attr("dy", ".35em")
            .attr("text-anchor", "end")
            .attr("transform", null)
            .text(function(d) {
              // if (d.text.length > 25) {
              //   return d.text.slice(0, 25) + "...";
              // } else {
              //   return d.text; 
              // }
              if (d.name.includes("author")) {
                return "P" + d.name.split("-")[1];
              } else {
                return d.text;
              }
            })
          .filter(function(d) { return d.x < width / 2; })
            .attr("x", 6 + sankey.nodeWidth())
            .attr("text-anchor", "start");

        // the function for moving the nodes
        function dragmove(d) {
          d3.select(this).attr("transform", 
              "translate(" + (d.x = Math.max(0, Math.min(width - d.dx, d3.event.x))) + "," + (
                              d.y = Math.max(0, Math.min(height - d.dy, d3.event.y))  ) + ")");
          sankey.relayout();
          link.attr("d", path);
        }
  }

  function get_doc_preview(doc_id) {
    $.ajax({
      url: '/workbench/api_get_doc_by_doc_id/',
      type: 'post',
      data: {
        'doc_id': doc_id,
      },
      success: function(xhr) {
        $("#sankey-document").html(xhr.workbench_document);
        $("#sankey-document").height(800);
        $("#sankey-document-container").animate({scrollTop: 0}, 0);
        workbench_module.doc_id = xhr.doc_id;
        // workbench_module.load_highlights_by_doc();
        var doc_id = xhr.doc_id;
        $("#sankey-document .section-content").each(function(){
          var sec_id = $(this).attr("data-id");
          var tks = $(this).find(".tk");
          for (var i = 0; i < tks.length; i++) {
            if (module.coverage_map_selected[doc_id][sec_id][i]) {
              $(tks[i]).addClass( "blue-m" );
            } else if (module.coverage_map_filtered[doc_id][sec_id][i]) {
              $(tks[i]).addClass( "blue-s" );
            }
          }
        })
      },
      error: function(xhr) {
        if (xhr.status == 403) {
          Utils.notify('error', xhr.responseText);
        }
      }
    });
  }

  function init_eventhandlers() {

    $("body").on("click", ".doc-bar-elem", function(e) {
      var data_id = $(this).parents(".doc-bar").attr("data-id");
      module.focus_node = data_id;
      get_doc_bar();
    })

    $("body").on("click", ".select-sort", function(e){
      $(".select-sort").removeClass("active");
      $(this).addClass("active");
    })    

    $("body").on("click", ".select-element", function(e){

      if ($(this).hasClass("active")) {
        $(this).removeClass("green").removeClass("active");
      } else {
        $(this).addClass("green").addClass("active");
      }

      get_doc_bar();
      hide_rec();
      module.update_barchart();
      module.get_sankey();
    })

    $("body").on("click", "#sankey-close-screenshot", function() {
           $("#dark-fullscreen-sankey").hide();
           $("#test").html("").hide();
           $("#white-fullscreen-sankey").hide();
    });

    $('#sankey-workbench').on('click', '.sankey-workbench-item-remove', function(e) {
      $(this).closest(".item").remove();
      put_workbench();
    }).on('click', '.sankey-workbench-item-add', function(e) {
      var content = $(this).closest(".item").find("textarea").val();
      var operation = '<a class="sankey-workbench-item-remove"><i class="large red minus square outline icon"></i></a>';
      $(this).closest(".item").find(".sankey-workbench-item-show-screenshot").each(function(){
        operation = this.outerHTML + operation;
      });
      var divider = '<div class="ui divider" style="margin: 1px;"></div>';
      var new_item = '<div class="item">' + content + operation + divider + '</div>';
      $(this).closest(".item").before(new_item);
      $(this).closest(".item").find("textarea").val("");
      $(this).closest(".item").find(".sankey-workbench-item-show-screenshot").remove();
      put_workbench();
    }).on('click', '.sankey-workbench-item-capture-screenshot', function(e) {
      $("#countdown-number").show();
      var self = this;
      self.count=6;
      self.counter=setInterval(timer, 1000); //1000 will  run it every 1 second
      function timer()
      {
        self.count=self.count-1;
        if (self.count <= 0)
        {
            clearInterval(self.counter);
            $("#countdown-number").text("");
            $("#countdown-number").hide();
            //counter ended, do something here

            var screenshot = $("#sankey-and-barchart").html();
            $.ajax({
              url: '/sankey/put_screenshot/',
              type: 'post',
              data: {
                screenshot_html: screenshot,
              },
              success: function(xhr) {
                var screenshot_id = xhr.screenshot_id;
                var screenshot_btn = '<a class="sankey-workbench-item-show-screenshot" data-id="' + screenshot_id + '"><i class="large blue file icon"></i></a>'
                $(self).before(screenshot_btn);
              },
              error: function(xhr) {
                if (xhr.status == 403) {
                  Utils.notify('error', xhr.responseText);
                }
              }
            });
           return;
        }
        $("#countdown-number").text(self.count);
      }
    }).on('click', '.sankey-workbench-item-show-screenshot', function(e) {
      $.ajax({
        url: '/sankey/get_screenshot/',
        type: 'post',
        data: {
          screenshot_id: $(this).attr("data-id"),
        },
        success: function(xhr) {
           $("#dark-fullscreen-sankey").show();
           $("#test").html(xhr.screenshot_html).show();
           $("#white-fullscreen-sankey").show();
        },
        error: function(xhr) {
          if (xhr.status == 403) {
            Utils.notify('error', xhr.responseText);
          }
        }
      });
    });

    // $('body').on('contextmenu', '#sankey-container', function(e) {
    //   e.preventDefault();
    //   $('#context-menu-screenshot').css('left', e.pageX).css('top', e.pageY).show();
    // }).on('click', function(e) {
    //   $('#context-menu-screenshot').hide();
    // }).on('click', '#context-menu-screenshot', function(e) {
    //   var evidence = '<a data-id=""><i class="large blue file icon"></i></a>'
    // });

    $("body").on("click", "#update-sankey", function(e){
      $(".select-toolbar.active .select-element.active").click();
      hide_rec();
      clear_filters();
      module.get_sankey();
      module.get_barchart();
    });
    $("body").on("click", "#refresh-sankey", function(e){
      module.get_sankey();
      module.get_barchart();
      get_doc_bar();
    });

    $("body").on("click", "#context-menu-goto", function(e){
      var doc_id = module.focus_node.split("-")[1];
      $("#loading-status").show();
        $.ajax({
          url: '/workbench/api_get_doc_by_doc_id/',
          type: 'post',
          data: {
            'doc_id': doc_id,
          },
          success: function(xhr) {
            $("#context-menu-cancel").click();
            $("#sankey-container").hide();
            $("#dark-fullscreen").hide();
            
            $("#workbench-document").html(xhr.workbench_document);
            $("#workbench-document").height($(window).height() - workbench_module.body_bottom);
            $("#workbench2-document-container").animate({scrollTop: 0}, 0);
            workbench_module.doc_id = xhr.doc_id;
            workbench_module.load_highlights_by_doc();
          },
          error: function(xhr) {
            if (xhr.status == 403) {
              Utils.notify('error', xhr.responseText);
            }
          }
        });
    });

    $("body").on("click", "#sankey-relation .item.active", function(e){
      module["relation"] = $("#sankey-relation .item.active").attr("data-value");
      hide_rec();
      clear_filters();
      add_selection_elements();
      module.get_sankey();
      module.get_barchart();
    })
  };

  function put_workbench(){
    $.ajax({
      url: '/sankey/put_workbench/',
      type: 'post',
      data: {
        workbench_html: $("#sankey-workbench").html(),
      },
      success: function(xhr) {

      },
      error: function(xhr) {
        if (xhr.status == 403) {
          Utils.notify('error', xhr.responseText);
        }
      }
    });
  };

  function get_workbench(){
    $.ajax({
      url: '/sankey/get_workbench/',
      type: 'post',
      success: function(xhr) {
        if (xhr.workbench_html != null && xhr.workbench_html.length > 0) {
          $("#sankey-workbench").html(xhr.workbench_html);
        }
      },
      error: function(xhr) {
        if (xhr.status == 403) {
          Utils.notify('error', xhr.responseText);
        }
      }
    });
  };

  function get_filter() {
    var res = {}
    res["time_lower_bound"] = "0";
    res["time_upper_bound"] = "1489003465486";   
    if ($(timerange_lower_value).attr("data-value") !== "0") {
      res["time_lower_bound"] = $(timerange_lower_value).attr("data-value");
      res["time_upper_bound"] = $(timerange_upper_value).attr("data-value");
    }
    res["theme_ids"] = ""
    $(".select-toolbar.active .select-theme-elements .select-element.active").each(function(){
      res["theme_ids"] = res["theme_ids"] + " " + $(this).attr("data-id").split("-")[1];
    });
    res["doc_ids"] = ""
    $(".select-toolbar.active .select-document-elements .select-element.active").each(function(){
      res["doc_ids"] = res["doc_ids"] + " " + $(this).attr("data-id").split("-")[1];
    })
    res["author_ids"] = ""
    $(".select-toolbar.active .select-author-elements .select-element.active").each(function(){
      res["author_ids"] = res["author_ids"] + " " + $(this).attr("data-id").split("-")[1];
    })
    res["theme_ids"] = res["theme_ids"].trim();
    res["doc_ids"] = res["doc_ids"].trim();
    res["author_ids"] = res["author_ids"].trim();
    return res;
  }

  function get_doc_bar() {

    var selected = $(".node.active").attr("data-id");
    var filter = get_filter();
    $.ajax({
      url: '/sankey/get_doc_coverage/',
      data: {
        "time_lower_bound": filter.time_lower_bound,
        "time_upper_bound": filter.time_upper_bound,
        "doc_ids": filter.doc_ids,
        "author_ids": filter.author_ids,
        "theme_ids": filter.theme_ids,
        "selected": selected 
      },
      type: 'post',
      success: function(xhr) {
        module.coverage_map = xhr.coverage_map;
        module.coverage_map_filtered = xhr.coverage_map_filtered;
        module.coverage_map_selected = xhr.coverage_map_selected;
        if (module.focus_node !== "") {
          var doc_id = module.focus_node.split("-")[1];
          get_doc_preview(doc_id);
        }

        var reverse = $("#select-sort-descending").hasClass("active");
        $('#doc-bar-container').empty();

        // get unit height
        var doc_length_map = {}
        var doc_max_length = 0;
        $(".select-toolbar.active .select-document-elements .select-element").each(function(){
          var doc_id = $(this).attr("data-id").split("-")[1];
          var count = 0;
          for (var key in xhr.coverage_map[doc_id]) {
            if (key !== undefined) {
              count = count + xhr.coverage_map[doc_id][key].length;
            }
            // html = html + '<div style="width:30px; background: white; height:5px;"></div>';
          }
          if (count > doc_max_length) { doc_max_length = count };
        });
        var nugget_map_unit = 800 / doc_max_length;

        var doc_length_map = {}
        $(".select-toolbar.active .select-document-elements .select-element").each(function(){
          var doc_id = $(this).attr("data-id").split("-")[1];
          var count = 0;
          var html = ""
          html = html + '<div class="doc-bar" style="margin-left:20px;float:left;" data-id="' + $(this).attr("data-id") + '">';
          for (var key in xhr.coverage_map[doc_id]) {
            if (key !== undefined) {
              for (var i = 0; i < xhr.coverage_map[doc_id][key].length; i++) {
                if (xhr.author_map_filtered[doc_id][key][i]) {
                  html = html + '<div class="latest-activity doc-bar-elem blue-l" data-id="' + xhr.author_map_filtered[doc_id][key][i] + '" style="width:30px; background-color:#25A0C5; height:' + nugget_map_unit + 'px;"></div>';
                } else if (xhr.coverage_map_selected[doc_id][key][i]) {
                  html = html + '<div class="doc-bar-elem blue-m" style="width:30px; height:' + nugget_map_unit + 'px;"></div>';
                } else if (xhr.coverage_map_filtered[doc_id][key][i]) {
                  html = html + '<div class="doc-bar-elem blue-s" style="width:30px; height:' + nugget_map_unit + 'px;"></div>';
                } else {
                  html = html + '<div class="doc-bar-elem" style="width:30px; background-color: Azure; height:' + nugget_map_unit + 'px;"></div>';
                }
              }
              count = count + xhr.coverage_map[doc_id][key].length;
            }
            // html = html + '<div style="width:30px; background: white; height:5px;"></div>';
          }
          html = html + "</div>";
          $('#doc-bar-container').append(html);
          doc_length_map[doc_id] = count
        });

        $(".doc-bar").each(function(){
          var doc_id = $(this).attr("data-id").split("-")[1]
          var height = $(this).height();
          if (height === 0) {
            heatmap_unit = nugget_map_unit * doc_length_map[doc_id] / 100;
          } else {
            heatmap_unit = height / 100;
          }
          var html = "";
          html = html + '<div class="doc-heatmap" style="margin:0; float:left;">';
          if (doc_id in xhr.heatmap) {
            for (var i = 0; i < 100; i++) {
              html = html + '<div class="color-' + (xhr.heatmap[doc_id][i] + 1) + '" style="width:10px; height:' + heatmap_unit + 'px;"></div>';
            }
            html = html + "</div>";
            $(this).after(html);        
          }
        });

        // add bar wrapper
        if (module.focus_node !== "") {

          $("#doc-bar-indicator").show();
          $bar = $(".doc-bar[data-id=" + module.focus_node + "]")
          $("#doc-bar-indicator").css("left", $bar.offset().left - 10).css("top", $bar.offset().top - 10);
          $node = $(".doc-node[data-id='" + module.focus_node + "']")
          $("#sankey-doc-arrow").show();
          $("#sankey-doc-arrow").css("left", $node.offset().left - 20).css("top", $node.offset().top - 10);   
        }

        // add author lastest activity
        var your_id = $("#header-user-name").attr("data-id");
        $(".latest-activity").each(function(){
            var author_id = $(this).attr("data-id");
            if (your_id === author_id) {
              var tooltip = "You recently worked on " + xhr.author_theme_map[author_id];
              var arrow = '<div class="latest-activity-arrow" data-tooltip="' + tooltip + '" data-id="' + author_id + '" style="position:fixed;">' +
                  '<i class="icon big olive user"></i>' +
                '</div>';       
            } else {
              var tooltip = "P" + author_id + " recently worked on " + xhr.author_theme_map[author_id];
              var arrow = '<div class="latest-activity-arrow" data-tooltip="' + tooltip + '" data-id="' + author_id + '" style="position:fixed;">' +
                      '<i class="icon big red user"></i>' +
                '</div>';  
            }
          $(this).append(arrow);
            $(".latest-activity-arrow[data-id=" + author_id +  "]").css("left", $(this).offset().left - 20).css("top", $(this).offset().top - 10);
        })
      },
      error: function(xhr) {
        if (xhr.status == 403) {
          Utils.notify('error', xhr.responseText);
        }
      }
    });
  }

  function getSorted(selector, attrName, reverse) {
    return $($(selector).toArray().sort(function(a, b){
        var aVal = parseInt(a.getAttribute(attrName)),
            bVal = parseInt(b.getAttribute(attrName));
        return reverse ? bVal - aVal : aVal - bVal;
    }));
  }

  function add_selection_elements() {
    $.ajax({
      url: '/sankey/get_entities/',
      type: 'post',
      success: function(xhr) {
        var reverse = $("#select-sort-descending").hasClass("active");
        if ($(".select-document").length !== 0) {
          $(".select-document-elements").empty();
          for (var i = 0; i < xhr.docs.length; i ++) {
            var num = "0"
            if ($(".doc-node[data-id='" + xhr.docs[i].id + "']").length === 1) {
              num = $(".doc-node[data-id='" + xhr.docs[i].id + "']").attr("num-nugget");
            }
            $(".select-document-elements").append('<a class="ui label select-element active green" data-id="' + xhr.docs[i].id + '"> ' 
              + xhr.docs[i].name + '</a>');
          }   
          $(".doc-labels").find("span").text($(".select-toolbar.active .select-document-elements .select-element").length);
        }

        if ($(".select-author").length !== 0) {
          $(".select-author-elements").empty();
          for (var i = 0; i < xhr.authors.length; i ++) {
            var num = "0"
            if ($(".author-node[data-id='" + xhr.authors[i] + "']").length === 1) {
              num = $(".author-node[data-id='" + xhr.authors[i] + "']").attr("num-nugget");
            }
            $(".select-author-elements").append('<a class="ui label select-element active green" data-id="' + xhr.authors[i].id + '"> ' 
              + xhr.authors[i].name + '</a>');
          }   
          $(".author-labels").find("span").text($(".select-toolbar.active .select-author-elements .select-element").length);
        } 

        if ($(".select-theme").length !== 0) {
          $(".select-theme-elements").empty();
          for (var i = 0; i < xhr.themes.length; i ++) {
            var num = "0"
            if ($(".theme-node[data-id='" + xhr.themes[i] + "']").length === 1) {
              num = $(".theme-node[data-id='" + xhr.themes[i] + "']").attr("num-nugget");
            }
            $(".select-theme-elements").append('<a class="ui label select-element active green" data-id="' + xhr.themes[i].id + '"> ' 
              + xhr.themes[i].name + '</a>');
          }   
          $(".theme-labels").find("span").text($(".select-toolbar.active .select-theme-elements .select-element").length);
        }

        get_doc_bar();
      },
      error: function(xhr) {
        if (xhr.status == 403) {
          Utils.notify('error', xhr.responseText);
        }
      }
    });
  }

// --------------------------------------------------------
// -------------- Time range slider control ---------------
// --------------------------------------------------------

function init_slider() {
  slider_timerange = document.getElementById('sankey-timerange-slider');
  timerange_lower_value = document.getElementById('sankey-timerange-lower-value');
  timerange_upper_value = document.getElementById('sankey-timerange-upper-value');
  timerange_arr = [];
  for(var i = 0; i < timerange_num_interval; i++) {
      timerange_arr.push(0);
  }

  noUiSlider.create(slider_timerange, {
    start: [0, timerange_num_interval],
    connect: true,
    step: 1,
    range: {
      'min': 0,
      'max': timerange_num_interval - 1
    }
  }); 

  slider_timerange.noUiSlider.on('update', function( values, handle ) {
    var date = new Date();
    if ( !handle ) {
      var num = timerange_arr[Number(values[0])];
      $(timerange_lower_value).text(number2date_pretty(num));
      $(timerange_lower_value).attr("data-value", num);
    } else {
      var num = timerange_arr[Number(values[1])];
      $(timerange_upper_value).text(number2date_pretty(num));
      $(timerange_upper_value).attr("data-value", num);
    }
  });

  slider_timerange.noUiSlider.on('change', function(){
    module.get_sankey();
    module.get_barchart();
    hide_rec();
    get_doc_bar();
  });

  $("#sankey-document").bind('scroll', function() {
    if (module.focus_node.split("-")[0] === "doc") {
      var perc = ($("#sankey-document").scrollTop() + $("#sankey-document").height() / 2) / $("#sankey-document .workbench-doc-item").height();
      var index = Math.floor(($(".doc-bar[data-id='" + module.focus_node + "']").children().length - 1) * perc);
      var elem = $(".doc-bar[data-id='" + module.focus_node + "']").children()[index];
      $("#doc-bar-arrow").show();
      $("#doc-bar-arrow").css("left", $(elem).offset().left - 25).css("top", $(elem).offset().top - 15);
    }
  });
}

function hide_rec() {
  $("#doc-bar-arrow").hide();
  $("#doc-bar-indicator").hide();
}

function number2date(num) {
    var offset = 0;
    var date = new Date(Number(num) + offset * 3600 * 1000);
    var res = date.getFullYear() + " " 
      + ("0" + (date.getMonth() + 1)).slice(-2) + " " 
      + ("0" + date.getDate()).slice(-2) + " " 
      + ("0" + date.getHours()).slice(-2) + " " 
      + ("0" + date.getMinutes()).slice(-2) + " " 
      + ("0" + date.getSeconds()).slice(-2);
    return res;
}

function number2date_pretty(num) {
    var offset = 0;
    var date = new Date(Number(num) + offset * 3600 * 1000);
    var res = date.getFullYear() + "/" 
      + ("0" + (date.getMonth() + 1)).slice(-2) + "/" 
      + ("0" + date.getDate()).slice(-2) + " " 
      + ("0" + date.getHours()).slice(-2) + ":" 
      + ("0" + date.getMinutes()).slice(-2) + ":" 
      + ("0" + date.getSeconds()).slice(-2);
    return res;
}

function date2number(str) {
    var date = new Date();  
    var arr = str.split(" ")
    date.setYear(arr[0]);
    date.setMonth(arr[1] - 1);
    date.setDate(arr[2]);
    date.setHours(arr[3]);
    date.setMinutes(arr[4]);
    date.setSeconds(arr[5]);
    return date.getTime();
}

  // activity heatmap
  idleTime = 0
  idleInterval = setInterval(function() {
    idleTime = idleTime + 1;
    // console.log(idleTime);
    if (idleTime < 2 && $(".workbench-doc-item").is(":visible") && !$("#sankey-container").is(":visible")) { // 30s
      var upper = $("#workbench-document").scrollTop();
      var lower = $("#workbench-document").scrollTop() + $("#workbench-document").height();
      var height = $("#workbench-document .workbench-doc-item").height();
      var doc_id = $(".workbench-doc-item").attr("data-id");
      var author_id = $("#header-user-name").attr("data-id");
      $.ajax({
        url: '/sankey/put_heatmap/',
        type: 'post',
        data: {
          "doc_id": doc_id,
          "lower": lower,
          "upper": upper,
          "height": height,
          "theme_id": workbench_module.currentThemeId,
          "author_id": author_id
        },
        success: function(xhr) {

        },
        error: function(xhr) {
          if (xhr.status == 403) {
            Utils.notify('error', xhr.responseText);
          }
        }
      });
    }
  }, 3000); // 1 minute

  //Zero the idle timer on mouse movement.
  $("body").on("mousemove", "#workbench2-document-container", function(e){
    idleTime = 0;
  })


  return module;

});