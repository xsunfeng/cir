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
      url: '/api_dgo18/gen_json/',
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

  $('.ui.dropdown')
    .dropdown({
      onChange: function(value, text, $selectedItem) {
        var doc_id = value;
        $.ajax({
          url: '/api_dgo18/get_doc/',
          type: 'post',
          data: {
            doc_id: doc_id
          },
          success: function(xhr) {
            $("#petition-body").html(xhr['body']);
            $("#petition-topics").html(xhr['topics']);
          },
          error: function(xhr) {
            if (xhr.status == 403) {
              Utils.notify('error', xhr.responseText);
            }
          }
        });
      }
    })
  ;

  // move topic terms
  $('body').on("click", ".word-weight .edited", function(){
    $container = $(this).closest(".word-weight");
    $container.find(".edited").hide();
    $container.find(".editing").show();
  });

  $('body').on("click", ".word-weight .cancel", function(){
    $container = $(this).closest(".word-weight");
    $container.find(".edited").show();
    $container.find(".editing").hide();  
  });

  $('body').on("click", ".word-weight .save", function(){
    var topic_id = $(this).closest('table').attr('data-topic');
    var word_text = $(this).closest('tr').find('td')[0].innerText;
    var new_weight = $(this).closest('td').find('.editing input')[0].value;
    var doc_id = $('.dropdown input').val();

    $container = $(this).closest(".word-weight");
    $container.find(".edited").show();
    $container.find(".editing").hide();
    $(this).closest('td').find('.edited').text(new_weight);

    $.ajax({
      url: '/api_dgo18/save_weight/',
      type: 'post',
      data: {
        'word_text': word_text,
        'topic_id': topic_id,
        'new_weight': new_weight,
        'doc_id': doc_id
      },
      success: function(xhr) {
        $("#petition-topics").html(xhr['topics']);
      },
      error: function(xhr) {
        if (xhr.status == 403) {
          Utils.notify('error', xhr.responseText);
        }
      }
    });
  });

  // split
  $('body').on("click", "#merge", function(){
    var checked = $('.topic-checkbox:checkbox:checked');
    if(checked.length == 2) {
      var topic1_id = checked[0].closest('.header').textContent.trim().split(" ")[1];
      var topic2_id = checked[1].closest('.header').textContent.trim().split(" ")[1];
      $.ajax({
        url: '/api_dgo18/merge_topics/',
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