define([
  'd3',
  'seedrandom',
  'jquery',
  'semantic-ui',
  'utils',
  'lasso'
], function(
  d3,
  seedrandom,
  $,
  semantic,
  Utils,
  lasso
) {

  $.ajax({
    url: '/api_esida/get_init_cords/',
    type: 'post',
    success: function(xhr) {
      get_cords(xhr['cords']);
    },
    error: function(xhr) {
      if (xhr.status == 403) {
        Utils.notify('error', xhr.responseText);
      }
    }
  });

  allowDrop = function(ev) {
      ev.preventDefault();
  }

  drag = function(ev) {
      ev.dataTransfer.setData("text", ev.target.id);
  }

  drop = function(ev) {
      ev.preventDefault();
      var data = ev.dataTransfer.getData("text");
      ev.target.appendChild(document.getElementById(data));
  }

function saveJSON(data, filename){

    if(!data) {
        console.error('No data')
        return;
    }

    if(!filename) filename = 'console.json'

    if(typeof data === "object"){
        data = JSON.stringify(data, undefined, 4)
    }

    var blob = new Blob([data], {type: 'text/json'}),
        e    = document.createEvent('MouseEvents'),
        a    = document.createElement('a')

    a.download = filename
    a.href = window.URL.createObjectURL(blob)
    a.dataset.downloadurl =  ['text/json', a.download, a.href].join(':')
    e.initMouseEvent('click', true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null)
    a.dispatchEvent(e)
}

  // gen_json
  $('body').on("click", "#gen_json", function(){
    $.ajax({
      url: '/api_esida/gen_json/',
      type: 'post',
      data: {
      },
      success: function(xhr) {
        var cords = xhr['cords'];
        saveJSON(cords, 'cords.json');
        console.log(cords);
      },
      error: function(xhr) {
        if (xhr.status == 403) {
          Utils.notify('error', xhr.responseText);
        }
      }
    });
  });

  // move topic terms
  $('body').on("click", "#reallocation", function(){
    seconds = 0;
    loading = setInterval(function(){ myTimer() }, 1000);
    
    window.scrollTo(0, 0);

    $.ajax({
      url: '/api_esida/update_topics/',
      type: 'post',
      data: {
        'json_topics': get_topics(),
      },
      success: function(xhr) {
        $("#topics-container").html(xhr['topics-container']);
        get_cords(xhr['cords']);
      },
      error: function(xhr) {
        if (xhr.status == 403) {
          Utils.notify('error', xhr.responseText);
        }
      }
    });
  });

  // split
  $('body').on("click", ".split-topic", function(){

    window.scrollTo(0, 0);
    var num_split = $(this).siblings('input')[0].value;
    var topic_id = $(this).attr("topic-id");

    if ($.isNumeric(num_split) && num_split > 0) {

      seconds = 0;
      loading = setInterval(function(){ myTimer() }, 1000);

      $.ajax({
        url: '/api_esida/split_topics/',
        type: 'post',
        data: {
          'topic_id': topic_id,
          'num_split': num_split,
          'json_topics': get_topics(),
        },
        success: function(xhr) {
          $("#topics-container").html(xhr['topics-container']);
          get_cords(xhr['cords']);
        },
        error: function(xhr) {
          if (xhr.status == 403) {
            Utils.notify('error', xhr.responseText);
          }
        }
      });
    } else {
      $(".warning .header").text('Invalid number of spliting a topic');
    }
  });

  // merge
  $('body').on("click", "#merge", function(){

    window.scrollTo(0, 0);

    var checked = $('.topic-checkbox:checkbox:checked');
    if(checked.length == 2) {
      seconds = 0;
      loading = setInterval(function(){ myTimer() }, 1000);

      var topic1_id = checked[0].closest('.header').textContent.trim().split(" ")[1];
      var topic2_id = checked[1].closest('.header').textContent.trim().split(" ")[1];
      $.ajax({
        url: '/api_esida/merge_topics/',
        type: 'post',
        data: {
          'topic1_id': topic1_id,
          'topic2_id': topic2_id,
          'json_topics': get_topics(),
        },
        success: function(xhr) {
          $("#topics-container").html(xhr['topics-container']);
          get_cords(xhr['cords']);
        },
        error: function(xhr) {
          if (xhr.status == 403) {
            Utils.notify('error', xhr.responseText);
          }
        }
      });
    } else {
      $(".warning .header").text('Merge requires [2] topics selected.');
    }
  });

  // show petitions
  $('body').on("click", ".show-petitions", function(){
    svg.selectAll(".dot")
      .attr("r",3.5) // reset size
      .classed({"not_possible":true,"selected":false}); // style as not possible

    var topic_id = $(this).attr("topic-id");
    
    var selected_doc_ids = []
    svg.selectAll(".dot")
      .filter(function(d) {
        if (d.topic_id == topic_id) {
          selected_doc_ids.push(d.doc_id);
        }
        return d.topic_id == topic_id
      })
      .classed({"not_possible":false,"possible":false})
      .attr("r",7);

    $("#docList .item").each(function(index) {
      var doc_id = $(this).attr('doc-idx');
      if (selected_doc_ids.length === 0 || selected_doc_ids.includes(doc_id)) {
        $(this).show();
      } else {
        $(this).hide();
      }
    });

    var docCount = $("#docList .item:visible").length;
    $("#numDocFound").text(docCount);
  });

  // undo
  $('body').on("click", "#undo", function(){
    window.scrollTo(0, 0);
    $.ajax({
      url: '/api_esida/last_state/',
      type: 'post',
      data: {
      },
      success: function(xhr) {
        $("#topics-container").html(xhr['topics-container']);
        get_cords(xhr['cords']);
      },
      error: function(xhr) {
        if (xhr.status == 403) {
          Utils.notify('error', xhr.responseText);
        }
      }
    });
  });

  // restart
  $('body').on("click", "#restart", function(){
    window.scrollTo(0, 0);
    $.ajax({
      url: '/api_esida/init_state/',
      type: 'post',
      data: {
      },
      success: function(xhr) {
        $("#topics-container").html(xhr['topics-container']);
        get_cords(xhr['cords']);
      },
      error: function(xhr) {
        if (xhr.status == 403) {
          Utils.notify('error', xhr.responseText);
        }
      }
    });
  });

  // click a document
  $('#docList .item .header').on("click", function(){
    $("#docList .item .header").css("border", "");
    $(this).css("border", "1px solid");
    var $doc_container = $('#docDetail');
    var doc_idx = $(this).attr('doc-idx');
    get_doc($doc_container, doc_idx);
  });

  var get_topics = function(){
    var topics = []
    for (var i = 0; i < $(".topic-container").length; i++) {
      topics[i] = []
      var labels = $($(".topic-container")[i]).find(".label");
      for (var j = 0; j < labels.length; j++) {
        topics[i].push(labels[j].id);
      }
    }
    return JSON.stringify(topics);
  }

  var get_doc = function($doc_container, doc_idx){
    $.ajax({
      url: '/api_esida/get_doc/',
      type: 'post',
      data: {
        'doc_idx': doc_idx,
      },
      success: function(xhr) {
        $doc_container.find('._title').text(xhr.title);
        $doc_container.find('._body').text(xhr.body);
        $doc_container.find('._signature_count').text(xhr.signature_count);
        $doc_container.find('._signature_threshold').text(xhr.signature_threshold);
        $doc_container.find('.q-topic').val(xhr.topic_accuracy);
        $doc_container.attr('doc-idx', doc_idx);

        // add topic names
        $doc_container.find('._topic_names').empty();
        var topic_ids = $("#docList .header[doc-idx=" + doc_idx + "]").attr('topic-ids').split(' ');
        for (var i = 0; i < topic_ids.length; i++) {
          var topic_id = topic_ids[i];
          var label = '<a class="ui basic label">' + 'Topic ' + topic_id + '</a>';
          $doc_container.find('._topic_names').append(label);
        }

        // sig progress
        $doc_container.find('.progress').progress({
          percent: xhr.sig_percent
        });
      },
      error: function(xhr) {
        if (xhr.status == 403) {
          Utils.notify('error', xhr.responseText);
        }
      }
    });
  }

d3.scale.category30 = function() {
return d3.scale.ordinal().range(d3_category437);
};

// https://stackoverflow.com/questions/20847161/how-can-i-generate-as-many-colors-as-i-want-using-d3/46305307#46305307
var color_category30 = [
"d3fe14",  
"1da49c", 
"ccf6e9", 
"a54509", 
"7d5bf0", 
"d08f5d", 
"fec24c",  
"0d906b", 
"7a9293", 
"7ed8fe",  
"d9a742",  
"c7ecf9",  
"72805e", 
"dccc69",  
"86757e",  
"a0acd2",  
"fecd0f",  
"4a9bda", 
"bdb363",  
"b1485d",  
"b98b91",  
"86df9c",  
"6e6089",
"826cae", 
"4b8d5f", 
"8193e5",  
"b39da2", 
"5bfce4", 
"df4280", 
"a2aca6"
];

function d3_rgbString (value) {
  return d3.rgb(value >> 16, value >> 8 & 0xff, value & 0xff);
}

  function get_cords(cords){
    var margin = {top: 20, right: 20, bottom: 30, left: 40},
        width = 1600 - margin.left - margin.right,
        height = 800 - margin.top - margin.bottom;

    var x = d3.scale.linear()
        .range([0, width]);

    var y = d3.scale.linear()
        .range([height, 0]);

    // var color = d3.scale.category20();
    var color = d3.scale.ordinal() // D3 Version 4
    .range(color_category30);

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom");

    var yAxis = d3.svg.axis()
        .scale(y)
        .orient("left");

    $("#vis").empty();
    svg = d3.select("#vis").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    clearInterval(loading);
    $(".warning .header").text('Update complete.');

    // Lasso functions to execute while lassoing
    var lasso_start = function() {
      lasso.items()
        .attr("r",3.5) // reset size
        .style("fill",null) // clear all of the fills
        .classed({"not_possible":true,"selected":false}); // style as not possible
    };

    var lasso_draw = function() {
      // Style the possible dots
      lasso.items().filter(function(d) {return d.possible===true})
        .classed({"not_possible":false,"possible":true});

      // Style the not possible dot
      lasso.items().filter(function(d) {return d.possible===false})
        .classed({"not_possible":true,"possible":false});
    };

    var lasso_end = function() {
      var selected_doc_ids = []
      // Reset the color of all dots
      lasso.items()
         .style("fill", function(d) { return color_category30[d.topic_id]; });

      // Style the selected dots
      lasso.items().filter(function(d) {
          if (d.selected){
            selected_doc_ids.push(d['doc_id'])
          }
          return d.selected===true
        })
        .classed({"not_possible":false,"possible":false})
        .attr("r",7);

      // Reset the style of the not selected dots
      lasso.items().filter(function(d) {return d.selected===false})
        .classed({"not_possible":false,"possible":false})
        .attr("r",3.5);

      $("#docList .item").each(function(index) {
        var doc_id = $(this).attr('doc-idx');
        if (selected_doc_ids.length === 0 || selected_doc_ids.includes(doc_id)) {
          $(this).show();
        } else {
          $(this).hide();
        }
      });

      var docCount = $("#docList .item:visible").length;
      $("#numDocFound").text(docCount);

    };

    // Create the area where the lasso event can be triggered
    var lasso_area = svg.append("rect")
                          .attr("width",width)
                          .attr("height",height)
                          .style("opacity",0);

    // Define the lasso
    var lasso = d3.lasso()
          .closePathDistance(75) // max distance for the lasso loop to be closed
          .closePathSelect(true) // can items be selected by closing the path?
          .hoverSelect(true) // can items by selected by hovering over them?
          .area(lasso_area) // area where the lasso can be started
          .on("start",lasso_start) // lasso start function
          .on("draw",lasso_draw) // lasso draw function
          .on("end",lasso_end); // lasso end function

    // Init the lasso on the svg:g that contains the dots
    svg.call(lasso);

    data = cords

    data.forEach(function(d) {
      d.cord_x = +d.cord_x;
      d.cord_y = +d.cord_y;
    });

    x.domain(d3.extent(data, function(d) { return d.cord_x; })).nice();
    y.domain(d3.extent(data, function(d) { return d.cord_y; })).nice();

    // svg.append("g")
    //     .attr("class", "x axis")
    //     .attr("transform", "translate(0," + height + ")")
    //     .call(xAxis)
    //   .append("text")
    //     .attr("class", "label")
    //     .attr("x", width)
    //     .attr("y", -6)
    //     .style("text-anchor", "end")
    //     .text("Sepal Width (cm)");

    // svg.append("g")
    //     .attr("class", "y axis")
    //     .call(yAxis)
    //   .append("text")
    //     .attr("class", "label")
    //     .attr("transform", "rotate(-90)")
    //     .attr("y", 6)
    //     .attr("dy", ".71em")
    //     .style("text-anchor", "end")
    //     .text("Sepal Length (cm)")

    svg.selectAll(".dot")
        .data(data)
      .enter().append("circle")
        .attr("id",function(d,i) {
          return "dot_" + i;}
        ) // added
        .attr("class", "dot")
        .attr("r", 3.5)
        .attr("cx", function(d) { return x(d.cord_x); })
        .attr("cy", function(d) { return y(d.cord_y); })
        .attr("topic-id", function(d) { return d.topic_id; })
        .style("fill", function(d) { return color_category30[d.topic_id]; });

    lasso.items(d3.selectAll(".dot")); 
  }

  // var seconds = 0;
  // var el = document.getElementById('seconds-counter');
  // var loading = setInterval(function(){ 
  //   seconds += 1;
  //   el.innerText = "You have been here for " + seconds + " seconds.";
  // }, 1000);

  var seconds = 0;
  var el = document.getElementById('seconds-counter');
  var loading = setInterval(function(){ myTimer() }, 1000);

  function myTimer() {
      seconds += 1;
      el.innerText = "Update in progress: " + seconds + " seconds...";
  }

});