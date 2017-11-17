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

  var docCount = $("#docList .item").length;
  $("#numDocTotal").text(docCount);
  $("#numDocFound").text(docCount);

  $("#searchTerm").on('keyup', function (e) {
      if (e.keyCode == 13) {
          $("#searchMe").click();
      }
  });

  $('.ui.accordion').accordion();

  $("#searchMe").on("click", function(){
    applyFilter();
  });

  $("#searchRandom").on("click", function(){
    applyFilter();
    var size = Number($('#sampleSize').val());
    if (size === 0) {
      return;
    }
    var curDocCount = Number($("#numDocFound").text());
    if (size > curDocCount) size = curDocCount;
    var selected_docs = []
    $("#docList .item:visible").each(function(){
      selected_docs.push($(this).attr('doc-idx'));
    });
    Math.seedrandom('hello.');
    subarray_docs = getRandomSubarray(selected_docs, size)
    $("#docList .item:visible").each(function(){
      var doc_id = $(this).attr('doc-idx');
      if (!subarray_docs.includes(doc_id)) {
        $(this).hide();
      }
    });
    var docCount = $("#docList .item:visible").length;
    $("#numDocFound").text(docCount);
  });

  var get_recom_relevancy = function(source_id, target_id){
    $.ajax({
      url: '/api_recom/get_recom_relevancy/',
      type: 'post',
      data: {
        'source_id': source_id,
        'target_id': target_id,
      },
      success: function(xhr) {
        $('#recomDocDetail .q-similarity').val(xhr.recom_relevancy);
      },
      error: function(xhr) {
        if (xhr.status == 403) {
          Utils.notify('error', xhr.responseText);
        }
      }
    });
  }

  var get_doc = function($doc_container, doc_idx){
    $.ajax({
      url: '/api_recom/get_doc/',
      type: 'post',
      data: {
        'doc_idx': doc_idx,
      },
      success: function(xhr) {
        $doc_container.find('._title').text(xhr.title);
        $doc_container.find('._body').text(xhr.body);
        $doc_container.find('._created').text(xhr.created_pretty);
        $doc_container.find('._signature_count').text(xhr.signature_count);
        $doc_container.find('._signature_threshold').text(xhr.signature_threshold);
        $doc_container.find('.q-topic').val(xhr.topic_accuracy);
        $doc_container.attr('doc-idx', doc_idx);

        if (xhr.petition_signed == 1) {
          $doc_container.find('._sign_btn').hide();
          $doc_container.find('._unsign_btn').show();        
        } else {
          $doc_container.find('._sign_btn').show();
          $doc_container.find('._unsign_btn').hide();      
        }

        // add issue labels
        $doc_container.find('._issue_names').empty();
        xhr.issue_names.forEach(function(issue_name) {
          var label = '<a class="ui basic label">' + issue_name + '</a>';
          $doc_container.find('._issue_names').append(label);
        });

        // add topic names
        $doc_container.find('._topic_names').empty();
        for (var i = 0; i < xhr.topic_names.length; i++) {
          var topic_name = xhr.topic_names[i];
          var label = '<a class="ui basic label">' + topic_name + '</a>';
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

  $('#docList .item .header').on("click", function(){
    $("#docList .item .header").css("border", "");
    $(this).css("border", "1px solid");
    var $doc_container = $('#docDetail');
    var doc_idx = $(this).attr('doc-idx');
    get_doc($doc_container, doc_idx);
  });

  $('body').on("click", "#recom_doc_list .recom_doc_title", function(){
    $("#recom_doc_list .recom_doc_title").css("border", "");
    $(this).css("border", "1px solid");
    var $doc_container = $('#recomDocDetail');
    var doc_idx = $(this).attr('doc-idx');
    get_doc($doc_container, doc_idx);
    var source_id = $("#docDetail").attr("doc-idx");
    get_recom_relevancy(source_id, doc_idx);
  });

  // questions on topic accuracy
  $('body').on("change", "#docDetail select", function(){
    var category = $(this).attr("category");
    var score = $(this).val();
    var target_id = $("#docDetail").attr("doc-idx");
    answerPetitionQuestion(target_id, -1, category, score);
  });

  // questions on recommended petitions
  $('body').on("change", "#recomDocDetail select", function(){
    var category = $(this).attr("category");
    var score = $(this).val();
    var source_id = $("#docDetail").attr("doc-idx");
    var target_id = $("#recomDocDetail").attr("doc-idx");
    answerPetitionQuestion(target_id, source_id, category, score);
  });

  // sign petition
  $('body').on("click", "._sign_btn", function(){
    var $doc_container = $(this).closest(".doc-container");
    $doc_container.find('._sign_btn').hide();
    $doc_container.find('._unsign_btn').show();
    var category = "petition_signed";
    var score = 1;
    var target_id = $doc_container.attr("doc-idx");
    answerPetitionQuestion(target_id, -1, category, score);
  });

  // unsign petition
  $('body').on("click", "._unsign_btn", function(){
    var $doc_container = $(this).closest(".doc-container");
    $doc_container.find('._sign_btn').show();
    $doc_container.find('._unsign_btn').hide();
    var category = "petition_signed";
    var score = 0;
    var target_id = $doc_container.attr("doc-idx");
    answerPetitionQuestion(target_id, -1, category, score);
  });

  var answerPetitionQuestion = function(target_id, source_id, category, score) {
    $.ajax({
      url: '/api_recom/answer_petition_question/',
      type: 'post',
      data: {
        'category': category,
        'score': score,
        'target_id': target_id,
        'source_id': source_id
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

  $('body').on("click", "#select-topics .check-all", function(){
    $('.topic-checkbox').prop("checked", true);
  }).on("click", "#select-topics .uncheck-all", function(){
    $('.topic-checkbox').prop("checked", false);
  }).on("click", "#select-topics .apply-topics", function(){
    applyFilter();
  });

  var applyFilter = function(){
    $("#docList .item .header").css("border", "");
    $("#docList .item").show();

    var selected_topics = []
    var checkedBoxes = document.querySelectorAll('input[class=topic-checkbox]:checked');
    for (var i = 0; i < checkedBoxes.length; i++) {
      var $checkbox = $(checkedBoxes[i]);
      var topic_id = Number($checkbox.closest('.title').attr('topic-id'));
      selected_topics.push(topic_id);
    }

    var terms = $('#searchTerm').val();
    termsSplited = terms.toLowerCase().split(' ');
    for(var i=0; i < termsSplited.length; i++) {
      termsSplited[i] = stemmer(termsSplited[i]);
    }
    $("#docList .item").each(function(index) {

      var isSearched = true;
      if (terms.length > 0) {
        var titleSplited = $(this).find('.header').text().replace(/[^\w\s]/gi, '').toLowerCase().split(' ');
        for(var i=0; i < titleSplited.length; i++) {
          titleSplited[i] = stemmer(titleSplited[i]);
        }
        isSearched = termsSplited.every(function(val) { return titleSplited.indexOf(val) >= 0; })
      }

      var topics = $(this).find('.header').attr("topic-ids").split(',').map(Number);
      var isTopiced = topics.every(function(val) { return selected_topics.indexOf(val) >= 0; })
      if (isSearched && isTopiced) {
        $(this).show();
      } else {
        $(this).hide();
      }
    });

    var docCount = $("#docList .item:visible").length;
    $("#numDocFound").text(docCount);

  }

  document.querySelectorAll('input[class=topic-checkbox]:checked');

  $('#feel-lucky').on("click", function(){
    var doc_text = $('#docDetail ._title').text()
        + " " + $('#docDetail ._body').text();
    var is_strict = $('input[class=strict-mode]:checked').val();
    $.ajax({
      url: '/api_recom/find_similar/',
      type: 'post',
      data: {
        'doc_text': doc_text,
        'is_strict': is_strict
      },
      success: function(xhr) {
        $("#recom_doc_list").html(xhr.recom_doc_list);
        var recom_docs = $('#recom_doc_list ._recom_doc');
        for (var i = 0; i < Math.min(recom_docs.length, 10); i++) {
          $(recom_docs[i]).show();
        }
      },
      error: function(xhr) {
        $('#claim-pane-overview').removeClass('loading');
        if (xhr.status == 403) {
          Utils.notify('error', xhr.responseText);
        }
        $('#claim-filter-pane .ui.dropdown').removeClass('disabled');
      }
    });
  });

  $('body').on("click", "#show-ten-more", function(){
    var st = $('#recom_doc_list ._recom_doc:visible').length;
    var ed = $('#recom_doc_list ._recom_doc:visible').length + 10;
    var recom_docs = $('#recom_doc_list ._recom_doc');
    for (var i = st; i < ed; i++) {
      $(recom_docs[i]).show();
    }
  });

  $('body').on("click", "._topic_names .label", function(){
    var topic_title = $(this).text();
    $(".accordion .title:contains('" + topic_title + "')").click();
  });

  function getRandomSubarray(arr, size) {
      var shuffled = arr.slice(0), i = arr.length, min = i - size, temp, index;
      while (i-- > min) {
          index = Math.floor((i + 1) * Math.random());
          temp = shuffled[index];
          shuffled[index] = shuffled[i];
          shuffled[i] = temp;
      }
      return shuffled.slice(min);
  }

  // https://github.com/kristopolous/Porter-Stemmer
  // stemmed word = stemmer(<word to stem>)
  var stemmer=function(){function h(){}function i(){console.log(Array.prototype.slice.call(arguments).join(" "))}var j={ational:"ate",tional:"tion",enci:"ence",anci:"ance",izer:"ize",bli:"ble",alli:"al",entli:"ent",eli:"e",ousli:"ous",ization:"ize",ation:"ate",ator:"ate",alism:"al",iveness:"ive",fulness:"ful",ousness:"ous",aliti:"al",iviti:"ive",biliti:"ble",logi:"log"},k={icate:"ic",ative:"",alize:"al",iciti:"ic",ical:"ic",ful:"",ness:""};return function(a,l){var d,b,g,c,f,e;e=l?i:h;if(3>a.length)return a;
  g=a.substr(0,1);"y"==g&&(a=g.toUpperCase()+a.substr(1));c=/^(.+?)(ss|i)es$/;b=/^(.+?)([^s])s$/;c.test(a)?(a=a.replace(c,"$1$2"),e("1a",c,a)):b.test(a)&&(a=a.replace(b,"$1$2"),e("1a",b,a));c=/^(.+?)eed$/;b=/^(.+?)(ed|ing)$/;c.test(a)?(b=c.exec(a),c=/^([^aeiou][^aeiouy]*)?[aeiouy][aeiou]*[^aeiou][^aeiouy]*/,c.test(b[1])&&(c=/.$/,a=a.replace(c,""),e("1b",c,a))):b.test(a)&&(b=b.exec(a),d=b[1],b=/^([^aeiou][^aeiouy]*)?[aeiouy]/,b.test(d)&&(a=d,e("1b",b,a),b=/(at|bl|iz)$/,f=/([^aeiouylsz])\1$/,d=/^[^aeiou][^aeiouy]*[aeiouy][^aeiouwxy]$/,
  b.test(a)?(a+="e",e("1b",b,a)):f.test(a)?(c=/.$/,a=a.replace(c,""),e("1b",f,a)):d.test(a)&&(a+="e",e("1b",d,a))));c=/^(.*[aeiouy].*)y$/;c.test(a)&&(b=c.exec(a),d=b[1],a=d+"i",e("1c",c,a));c=/^(.+?)(ational|tional|enci|anci|izer|bli|alli|entli|eli|ousli|ization|ation|ator|alism|iveness|fulness|ousness|aliti|iviti|biliti|logi)$/;c.test(a)&&(b=c.exec(a),d=b[1],b=b[2],c=/^([^aeiou][^aeiouy]*)?[aeiouy][aeiou]*[^aeiou][^aeiouy]*/,c.test(d)&&(a=d+j[b],e("2",c,a)));c=/^(.+?)(icate|ative|alize|iciti|ical|ful|ness)$/;
  c.test(a)&&(b=c.exec(a),d=b[1],b=b[2],c=/^([^aeiou][^aeiouy]*)?[aeiouy][aeiou]*[^aeiou][^aeiouy]*/,c.test(d)&&(a=d+k[b],e("3",c,a)));c=/^(.+?)(al|ance|ence|er|ic|able|ible|ant|ement|ment|ent|ou|ism|ate|iti|ous|ive|ize)$/;b=/^(.+?)(s|t)(ion)$/;c.test(a)?(b=c.exec(a),d=b[1],c=/^([^aeiou][^aeiouy]*)?[aeiouy][aeiou]*[^aeiou][^aeiouy]*[aeiouy][aeiou]*[^aeiou][^aeiouy]*/,c.test(d)&&(a=d,e("4",c,a))):b.test(a)&&(b=b.exec(a),d=b[1]+b[2],b=/^([^aeiou][^aeiouy]*)?[aeiouy][aeiou]*[^aeiou][^aeiouy]*[aeiouy][aeiou]*[^aeiou][^aeiouy]*/,
  b.test(d)&&(a=d,e("4",b,a)));c=/^(.+?)e$/;if(c.test(a)&&(b=c.exec(a),d=b[1],c=/^([^aeiou][^aeiouy]*)?[aeiouy][aeiou]*[^aeiou][^aeiouy]*[aeiouy][aeiou]*[^aeiou][^aeiouy]*/,b=/^([^aeiou][^aeiouy]*)?[aeiouy][aeiou]*[^aeiou][^aeiouy]*([aeiouy][aeiou]*)?$/,f=/^[^aeiou][^aeiouy]*[aeiouy][^aeiouwxy]$/,c.test(d)||b.test(d)&&!f.test(d)))a=d,e("5",c,b,f,a);c=/ll$/;b=/^([^aeiou][^aeiouy]*)?[aeiouy][aeiou]*[^aeiou][^aeiouy]*[aeiouy][aeiou]*[^aeiou][^aeiouy]*/;c.test(a)&&b.test(a)&&(c=/.$/,a=a.replace(c,""),e("5",
  c,b,a));"y"==g&&(a=g.toLowerCase()+a.substr(1));return a}}(); 
});