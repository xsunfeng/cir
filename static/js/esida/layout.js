define([
  'd3',
  'seedrandom',
  'jquery',
  'semantic-ui',
  'utils',
], function(
  d3,
  seedrandom,
  $,
  semantic,
  Utils,
) {

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
        var cords = xhr['pca'];
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

    $.ajax({
      url: '/api_esida/update_topics/',
      type: 'post',
      data: {
        'json_topics': get_topics(),
      },
      success: function(xhr) {
        $("#topics-container").html(xhr['topics-container']);
      },
      error: function(xhr) {
        if (xhr.status == 403) {
          Utils.notify('error', xhr.responseText);
        }
      }
    });
  });

  // split
  $('body').on("click", "#split", function(){
    var checked = $('.topic-checkbox:checkbox:checked');
    if(checked.length == 1) {
      var topic_id = checked[0].closest('.header').textContent.trim().split(" ")[1];
      $.ajax({
        url: '/api_esida/split_topics/',
        type: 'post',
        data: {
          'topic_id': topic_id,
          'json_topics': get_topics(),
        },
        success: function(xhr) {
          $("#topics-container").html(xhr['topics-container']);
        },
        error: function(xhr) {
          if (xhr.status == 403) {
            Utils.notify('error', xhr.responseText);
          }
        }
      });
    } else {
      console.log("split needs 1 topic.")
    }
  });

  // split
  $('body').on("click", "#merge", function(){
    var checked = $('.topic-checkbox:checkbox:checked');
    if(checked.length == 2) {
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
        },
        error: function(xhr) {
          if (xhr.status == 403) {
            Utils.notify('error', xhr.responseText);
          }
        }
      });
    } else {
      console.log("merge needs 2 topics.")
    }
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

});