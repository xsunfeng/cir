define([
  'd3',
  'd3-tooltip',
  'sankey',
  'jquery',
  'semantic-ui',
  'tagcloud',
  'utils',
  'workbench2'
], function(
  d3,
  tip,
  sankey_module,
  $,
  semantic,
  tagcloud,
  Utils,
  workbench_module
) {

  // initiate module
  var module = {};
  module["focusNode"];
  module["nodeStyle"] = {};
  module.time_lower_bound = "1970 01 01 00 00 00";
  module.time_upper_bound = "2100 01 01 00 00 00";
  var barchart_ajax;

  var nodeMap = {};


  module.get_barchart = function () {

    if (barchart_ajax) barchart_ajax.abort();
    
    // for barchart
    $("#barchart").html(
    '<div class="ui active inverted dimmer">' +
    '<div class="ui text loader">drawing, pleae wait...</div>' +
    '</div>' +
    '<p></p>'
    );
    var theme_id = $("#sankey-filter-theme").attr("theme-id");
    var author_id = $("#sankey-filter-author").attr("author-id");
    
    barchart_ajax = $.ajax({
      url: '/sankey/get_barchart/',
      type: 'post',
      data: {
        theme_id: theme_id,
        author_id: author_id
      },
      success: function(xhr) {
        $("#barchart").html("");
        var data = xhr.data;

        var margin = {top: 20, right: 20, bottom: 30, left: 40},
            width = 900 - margin.left - margin.right,
            height = 230 - margin.top - margin.bottom;

        var x = d3.scale.ordinal()
            .rangeRoundBands([0, width], .1);

        var y = d3.scale.linear()
            .range([height, 0]);

        var xAxis = d3.svg.axis()
            .scale(x)
            .orient("bottom");

        var yAxis = d3.svg.axis()
            .scale(y)
            .orient("left")
            .ticks(1, "");

        var svg = d3.select("#barchart").append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
          .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        var tip = d3.tip()
          .attr('class', 'd3-tip')
          .offset([-10, 0])
          .html(function(d) {
            var res = "<div>from: <span>" + d.time_lower_bound + "</span></div>" 
              + "<div>to: <span>" + d.time_upper_bound + "</span></div>" 
              + "<div>#nuggets: <span>" + d.num_nugget + "</span></div>";
            return res;
          })
        svg.call(tip);

          x.domain(data.map(function(d) { return d.time; }));
          y.domain([0, d3.max(data, function(d) { return d.num_nugget; })]);

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
              .text("Num_nugget");

          svg.selectAll(".bar")
              .data(data)
            .enter().append("rect")
              .attr("class", "bar nugget-bar")
              .attr("time-upper-bound", function(d) {
                return d.time_upper_bound; 
              }).attr("time-lower-bound", function(d) {
                return d.time_lower_bound; 
              }).attr("num-nugget", function(d) {
                return d.num_nugget; 
              })
              .attr("x", function(d) {
                return x(d.time); 
              })
              .attr("width", x.rangeBand())
              .attr("y", function(d) { return y(d.num_nugget); })
              .attr("height", function(d) { return height - y(d.num_nugget); })
              .on("mousedown", function(d){
                time_bound_list = []
                time_bound_list.push(d.time_lower_bound);
                time_bound_list.push(d.time_upper_bound);

                d3.selectAll(".nugget-bar.selected").classed("selected", false);
                d3.select(this).classed("selected", true);

                var p = d3.mouse(this);
                svg.append( "rect")
                .attr({
                    rx      : 6,
                    ry      : 6,
                    class   : "selection",
                    x       : p[0],
                    y       : p[1],
                    width   : 0,
                    height  : 0
                })  
              })
              .on('mouseover', function(d){
                tip.show(d);
                if(isDown) {        // Only change css if mouse is down
                  d3.select(this).classed("selected", true);
                  time_bound_list.push(d.time_lower_bound);
                  time_bound_list.push(d.time_upper_bound);
                }
              })
              .on('mouseout', tip.hide)
              .on("mousemove", function(d){
                    var s = svg.select( "rect.selection");
                    if( !s.empty()) {
                        var p = d3.mouse(this),
                            d = {
                                x       : parseInt( s.attr( "x"), 10),
                                y       : parseInt( s.attr( "y"), 10),
                                width   : parseInt( s.attr( "width"), 10),
                                height  : parseInt( s.attr( "height"), 10)
                            },
                            move = {
                                x : p[0] - d.x,
                                y : p[1] - d.y
                            }
                        ;

                        if( move.x < 1 || (move.x*2<d.width)) {
                            d.x = p[0];
                            d.width -= move.x;
                        } else {
                            d.width = move.x;       
                        }

                        if( move.y < 1 || (move.y*2<d.height)) {
                            d.y = p[1];
                            d.height -= move.y;
                        } else {
                            d.height = move.y;       
                        }
                       
                        s.attr( d);
                        //console.log( d);
                    }
              })
              .on("click", function(e){
                // if (! d3.select(this).classed("selected")) {
                //   d3.select(".nugget-bar.selected").classed("selected", false);
                //   d3.select(this).classed("selected", true);                
                // } else {
                //   d3.select(".nugget-bar.selected").classed("selected", false);
                // }
              }).on( "mouseup", function() {
                d3.selectAll(".selection").remove();
                var res = max_min_string(time_bound_list);
                $("#sankey-filter-time").attr("time-lower-bound", res[0]);
                $("#sankey-filter-time").attr("time-upper-bound", res[1]);
                var a1 = res[0].split(" "), a2 = res[1].split(" ");
                var text =  a1[0] + "/" + a1[1] + "/" + a1[2] + " " + a1[3] + ":" + a1[4] + ":" + a1[5] + " -- "
                          + a2[0] + "/" + a2[1] + "/" + a2[2] + " " + a2[3] + ":" + a2[4] + ":" + a2[5];
                $("#sankey-filter-time").find("span").text(text);
                module.get_sankey(module["relation"]);
              })

              d3.selectAll(".nugget-bar").classed("selected", true);

        function type(d) {
          d.num_nugget = +d.num_nugget;
          return d;
        }

        function max_min_string(string_list) {
          var max = "1970 01 01 00 00 00";
          var min = "2100 01 01 00 00 00";
          string_list.forEach(function(item) {
            if (item < min) min = item;
            if (item > max) max = item;
          })
          return [min, max];
        }

      },
      error: function(xhr) {
        if (xhr.status == 403) {
          Utils.notify('error', xhr.responseText);
        }
      }
    });
  }

  module.get_sankey = function(relation) {
    var time_lower_bound = $("#sankey-filter-time").attr("time-lower-bound");
    var time_upper_bound = $("#sankey-filter-time").attr("time-upper-bound");
    time_lower_bound = time_lower_bound || "1970 01 01 00 00 00";
    time_upper_bound = time_upper_bound || "2100 01 01 00 00 00";

    $("#sankey").html(
      '<div class="ui active inverted dimmer">' +
      '<div class="ui text loader">drawing, pleae wait...</div>' +
      '</div>' +
      '<p></p>'
      );
    var promise = $.ajax({
      url: '/sankey/get_graph/',
      type: 'post',
      data: {
        relation: relation,
        time_lower_bound: time_lower_bound,
        time_upper_bound: time_upper_bound
      },
      success: function(xhr) {
        $("#sankey").html("");
        init(xhr);
        // $("svg").attr("class", "ui segment");
      },
      error: function(xhr) {
        if (xhr.status == 403) {
          Utils.notify('error', xhr.responseText);
        }
      }
    });  
    return promise;
  }

  $(".sankey-related").hover(function(){
    $("#sankey-element-checkbox-list").css("left", $("#sankey").offset().left - $("#sankey-element-checkbox-list").css("width").slice(0, -2) + 10);
    $("#sankey-element-checkbox-list").css("top", $("#sankey").offset().top + 10);
    $("#sankey-element-checkbox-list").show();

    // $("#sankey-operations").css("left", $("#sankey").offset().left - $("#sankey-operations").css("width").slice(0, -2) + 10);
    // $("#sankey-operations").css("top", $("#sankey-element-checkbox-list").css("top").slice(0, -2) - - $("#sankey-element-checkbox-list").height() + 10);
    // $("#sankey-operations").show();
  },function(){
    $("#sankey-element-checkbox-list").hide();
    // $("#sankey-operations").hide();
  });

  init_eventhandlers();


  function init(xhr){
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
        nodeMap = {};
        graph.nodes.forEach(function(x) { nodeMap[x.name] = x; });
        graph.links = graph.links.map(function(x) {
          return {
            source: nodeMap[x.source],
            target: nodeMap[x.target],
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
            .attr("transform", function(d) { 
            return "translate(" + d.x + "," + d.y + ")"; });
          // .call(d3.behavior.drag()
          //   .origin(function(d) { 
          //     return d; 
          //   })
          //   .on("dragstart", function() { 
          //   this.parentNode.appendChild(this); })
          //   .on("drag", dragmove));
        

        // add dummy class to dummy nodes
        node.classed("dummy-node", function(d) {
          if(d.name.includes("dummy")) return true;
          else return false;
        });
        link.classed("dummy-link", function(l) {
          if(l.source.name.includes("dummy") || l.target.name.includes("dummy")) return true;
          else return false;
        });

        node.classed("doc-node", function(d) {
          if(d.name.includes("doc")) {
            return true;
          } else {
            return false;
          }
        });
        node.classed("section-node", function(d) {
          if(d.name.includes("section")) {
            return true;
          } else {
            return false;
          }
        });
        node.classed("author-node", function(d) {
          if(d.name.includes("author")) {
            return true;
          } else {
            return false;
          }
        });
        node.classed("theme-node", function(d) {
          if(d.name.includes("theme")) {
            return true;
          } else {
            return false;
          }
        });

        // mouseover and mouseout events on node
        node.on('mouseover', function(d) {
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
          clear_dummy();
        });
        node.on('mouseout', function(d) {
          link.style('stroke-opacity', function(l) {
            var opacity = 0.2;
            return opacity;
          });
          clear_dummy();
        });

        // mouseover and mouseout events on links
        $(".link").on("mouseover",function(){
          this.style["stroke-opacity"] = 0.5;
          clear_dummy();
        });
        $(".link").on("mouseout",function(){
          this.style["stroke-opacity"] = 0.2;
          clear_dummy();
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
            .style("fill-opacity", function(d) { 
              return Math.random();
            })
            .style("stroke", function(d) { 
              return d3.rgb(d.color).darker(2); })
          .append("title")
            .text(function(d) { 
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
              if (d.text.length > 25) {
                return d.text.slice(0, 25) + "...";
              } else {
                return d.text; 
              }
            })
          .filter(function(d) { return d.x < width / 2; })
            .attr("x", 6 + sankey.nodeWidth())
            .attr("text-anchor", "start");

        // save all nodes styles
        var normal_nodes = $(".node").find("rect");
        for (var i = 0; i < normal_nodes.length; i ++) {
          var key = $(normal_nodes[i].parentNode).attr("data-id");
          module["nodeStyle"][key] = {}
          module["nodeStyle"][key]["fill"] = normal_nodes[i].style["fill"];
          module["nodeStyle"][key]["fill-opacity"] = normal_nodes[i].style["fill-opacity"];
          module["nodeStyle"][key]["stroke"] = normal_nodes[i].style["stroke"];
        }
      
        // clear dummy nodes and links
        function clear_dummy() {
          // dummy nodes
          $(".dummy-node").attr("font-size","0");
          var dummy_nodes = $(".dummy-node").find("rect");
          for (var i = 0; i < dummy_nodes.length; i ++) {
            dummy_nodes[i].style["fill"] = "black";
            dummy_nodes[i].style["fill-opacity"] = "0.05";
            dummy_nodes[i].style["stroke"] = "";
          }
          var dummy_links = $(".dummy-link");
          for (var i = 0; i < dummy_links.length; i ++) {
            dummy_links[i].style["stroke-opacity"] = "0.05";
          }
        };
        clear_dummy();

        // the function for moving the nodes
        function dragmove(d) {
          d3.select(this).attr("transform", 
              "translate(" + (d.x = Math.max(0, Math.min(width - d.dx, d3.event.x))) + "," + (
                              d.y = Math.max(0, Math.min(height - d.dy, d3.event.y))  ) + ")");
          sankey.relayout();
          link.attr("d", path);
        }

        function hide_node(focus_node) {
          d3.selectAll('.link:not(.dummy-link)').classed("dummy-link", function(l) {
            if (focus_node === l.source || focus_node === l.target) return true;
            else return false;
          }); 
          d3.selectAll('.node:not(.dummy-node)').classed("dummy-node", function(n) {
            if (n === focus_node) return true;
            else return false;
          }); 
        };

        function show_node(focus_node) {
          d3.selectAll('.dummy-link').classed("dummy-link", function(l) {
            if (focus_node === l.source || focus_node === l.target) return false;
            else return true;
          });
          var normal_links = $(".link");
          for (var i = 0; i < normal_links.length; i ++) {
            normal_links[i].style["stroke-opacity"] = "0.2";
          }     
          d3.selectAll('.dummy-node').classed("dummy-node", function(n) {
            if (focus_node === n) return false;
            else return true;
          });
          var p = $(".node[data-id='" + focus_node.name + "']");
          p.find("rect")[0].style["fill"] = module["nodeStyle"][focus_node.name]["fill"];
          p.find("rect")[0].style["fill-opacity"] = module["nodeStyle"][focus_node.name]["fill-opacity"];
          p.find("rect")[0].style["stroke"] = module["nodeStyle"][focus_node.name]["stroke"];
        }

  }

  function clear_filters() {
    $("#sankey-filter-time").attr("time-lower-bound", "");
    $("#sankey-filter-time").attr("time-upper-bound", "");
    $("#sankey-filter-time").find("span").text("timespan: all");

    $("#sankey-filter-theme").attr("theme-id", "-1");
    $("#sankey-filter-theme").find("span").text("theme: all");
    
    $("#sankey-filter-author").attr("author-id", "-1");
    $("#sankey-filter-author").find("span").text("author: all");
  }

  function init_eventhandlers() {

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


    $("body").on("mouseenter", ".author-node", function(e){
      if ($("#sankey-filter-time").attr("time-lower-bound") == "") {
        clear_filters();
        var author_id = $(this).attr("data-id").split("-")[1];
        module["focusNode"] = nodeMap["author-" + author_id];
        $("#sankey-filter-author").attr("author-id", author_id);
        $("#sankey-filter-author").find("span").text("author:" + $(this).find("text").text());
        module.get_barchart();
      }
    }).on("mouseleave", ".author-node", function(e){
      if ($("#sankey-filter-time").attr("time-lower-bound") == "") {
        clear_filters();
        module.get_barchart();       
      }
    });

    $("body").on("mouseenter", ".theme-node", function(e){
      if ($("#sankey-filter-time").attr("time-lower-bound") == "") {
        clear_filters();
        var theme_id = $(this).attr("data-id").split("-")[1];
        module["focusNode"] = nodeMap["theme-" + theme_id];
        $("#sankey-filter-theme").attr("theme-id", theme_id);
        $("#sankey-filter-theme").find("span").text("theme:" + $(this).find("text").text());
        module.get_barchart();
      }
    }).on("mouseleave", ".theme-node", function(e){
      if ($("#sankey-filter-time").attr("time-lower-bound") == "") {
        clear_filters();
        module.get_barchart();       
      }
    });

    $("body").on("click", "#update-sankey", function(e){
      clear_filters();
      supported_relations = ["dt", "dst", "dpt"];
      if (supported_relations.includes(module["relation"])) {
        module.get_sankey(module["relation"]); 
      } else {
        Utils.notify("error", "this relation not supported");
      }
      module.get_barchart();
    });

    $("body").on("click", ".doc-node", function(e){
      $('#context-menu-info').html("");
      // $('#context-menu-action').css('left', e.pageX).css('top', e.pageY).show();
      $('#context-menu-action').css('left', e.pageX - $("#sankey-container").offset().left).css('top', e.pageY - $("#sankey-container").offset().top).show();

      var context_menu_action_right = Number.parseInt($('#context-menu-action').css('left')) 
                                    + Number.parseInt($('#context-menu-action').css('width')) + 10 + "px";
      $('#context-menu-info').css('left', context_menu_action_right).css('top', e.pageY - $("#sankey-container").offset().top).show();
      var doc_id = $(this).attr("data-id").split("-")[1];
      module["focusNode"] = nodeMap["doc-" + doc_id];
      $.ajax({
        url: '/sankey/get_doc/',
        type: 'post',
        data: {
          doc_id: doc_id,
        },
        success: function(xhr) {
          $('#context-menu-info').html(xhr.html);
          $.fn.tagcloud.defaults = {
            size: {start: 10, end: 20, unit: 'pt'},
            color: {start: '#ff2222', end: '#2222ff'}
          };

          $(function () {
            $('#whatever a').tagcloud();
            $('.wordcount-word').each(function(){
              $(this).popup({
                  title    : this.text,
                  content  : "freq.: " + $(this).attr("rel")
              });
            });
          });
        },
        error: function(xhr) {
          if (xhr.status == 403) {
            Utils.notify('error', xhr.responseText);
          }
        }
      });
      if (this.classList.contains("dummy-node")) {
        $('#context-menu-show').show();
        $('#context-menu-hide').hide(); 
        $('#context-menu-info').hide();        
      } else {
        $('#context-menu-hide').show();
        $('#context-menu-show').hide();
        $('#context-menu-info').show();  
      }
      return false;
    });

    $("body").on("click", "#context-menu-goto", function(e){
      var doc_id = module["focusNode"].name.split("-")[1];
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
    }).on("click", "#context-menu-cancel", function(e){
      $('#context-menu-action').hide();
      $('#context-menu-info').hide();
    }).on("click", "#context-menu-hide", function(e){
      hide_node(module["focusNode"]);
      $('#context-menu-action').hide();
      $('#context-menu-info').hide();
      module["focusNode"] = null;
      clear_dummy();
    }).on("click", "#context-menu-show", function(e){
      show_node(module["focusNode"]);
      $('#context-menu-action').hide();
      $('#context-menu-info').hide();
      module["focusNode"] = null;
      clear_dummy();
    });

    $('#sankey-element-checkbox-list .checkbox')
      .checkbox({
        // Fire on load to set parent value
        fireOnInit : true,
        // Change parent state on each child checkbox change
        onChange   : function() {
          var
            $listGroup      = $(this).closest('#sankey-element-checkbox-list'),
            $checkbox       = $listGroup.find('.checkbox');
          // check to see if all other siblings are checked or unchecked
          module["relation"] = "";
          $checkbox.each(function() {
              if ($(this).checkbox('is checked')) {
                var cur = $(this).attr("data-value");
                module["relation"] = module["relation"] + cur;
              }
          });
        }
      })
    ;

  };

  var time_bound_list = [];

  var isDown = false;   // Tracks status of mouse button

  $(document).mousedown(function() {
    isDown = true;      // When mouse goes down, set isDown to true
  })
  .mouseup(function() {
    isDown = false;    // When mouse goes up, set isDown to false
  });

  module.get_barchart();

  // for sankey
  // by default -- dst
  module["relation"] = "dpt";
  module.get_sankey(module["relation"]);
  var l = module["relation"].split("");
  l.forEach(function(e) {
    $(".checkbox[data-value='" + e + "']").checkbox("set checked");
  });

  get_workbench();

  var units = "Nuggets";
   
  var margin = {top: 30, right: 30, bottom: 30, left: 30},
      width = 900 - margin.left - margin.right,
      height = 600 - margin.top - margin.bottom;
   
  var formatNumber = d3.format(",.0f"),    // zero decimal places
      format = function(d) { 
        return formatNumber(d) + " " + units; 
      },
      color = d3.scale.category20b();

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
      data: {

      },
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

  return module;

});