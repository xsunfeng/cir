define([
  'd3',
  'sankey',
  'jquery'
], function(
  d3,
  sankey_module,
  $
) {


var units = "Nuggets";
 
var margin = {top: 10, right: 10, bottom: 10, left: 10},
    width = 1200 - margin.left - margin.right,
    height = 1000 - margin.top - margin.bottom;
 
var formatNumber = d3.format(",.0f"),    // zero decimal places
    format = function(d) { return formatNumber(d) + " " + units; },
    color = d3.scale.category20b();
 
// append the svg canvas to the page
var svg = d3.select("#chart").append("svg")
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

    $.ajax({
      url: '/sankey/get_graph/',
      type: 'post',
      data: {},
      success: function(xhr) {
        // create graph from xhr
        var graph = {}
        graph["links"] = xhr["links"]
        graph["nodes"] = xhr["nodes"]

        // convert source/target type from string to object
        var nodeMap = {};
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
            .layout(32);
       
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
            .attr("transform", function(d) { 
            return "translate(" + d.x + "," + d.y + ")"; })
          .call(d3.behavior.drag()
            .origin(function(d) { 
              return d; 
            })
            .on("dragstart", function() { 
            this.parentNode.appendChild(this); })
            .on("drag", dragmove));


        node.classed("dummy-node", function(d) {
          if((d.name).indexOf("dummy") > 0) {
            return true;
          } else {
            return false;
          }
        });

        link.classed("dummy-link", function(l) {
          if((l.source.name).indexOf("dummy") > 0 || (l.target.name).indexOf("dummy") > 0) {
            return true;
          } else {
            return false;
          }
        });

        node.on('mouseover', function(d) {
          link.style('stroke-opacity', function(l) {
            var opacity = 0
            if (d === l.source || d === l.target) {
              opacity = 0.5;
            } else {
              opacity = 0.2;
            }
            return opacity;
          });
          clear_dummy();
        });
        node.on('mouseout', function(d) {
          link.style('stroke-opacity', function(l) {
            var opacity = 0.2;
            return opacity;
          });
          clear_dummy();
        });

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
                return d.color = color(d.name.replace(/ .*/, ""));
            })
            .style("stroke", function(d) { 
              return d3.rgb(d.color).darker(2); })
          .append("title")
            .text(function(d) { 
            return d.name + "\n" + format(d.value); });
       
        // add in the title for the nodes
        node.append("text")
            .attr("x", -6)
            .attr("y", function(d) { return d.dy / 2; })
            .attr("dy", ".35em")
            .attr("text-anchor", "end")
            .attr("transform", null)
            .text(function(d) { return d.text; })
          .filter(function(d) { return d.x < width / 2; })
            .attr("x", 6 + sankey.nodeWidth())
            .attr("text-anchor", "start");
      
        function clear_dummy() {
          // dummy nodes
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
              "translate(" + (
                   d.x = Math.max(0, Math.min(width - d.dx, d3.event.x))
                ) + "," + (
                         d.y = Math.max(0, Math.min(height - d.dy, d3.event.y))
                  ) + ")");
          sankey.relayout();
          link.attr("d", path);
        }

      },
      error: function(xhr) {
        if (xhr.status == 403) {
          Utils.notify('error', xhr.responseText);
        }
      }
    });

  var module = {};
  return module;

  function zeros(dimensions) {
    var array = [];
    for (var i = 0; i < dimensions[0]; ++i) {
        array.push(dimensions.length == 1 ? 0 : zeros(dimensions.slice(1)));
    }
    return array;
  }
});