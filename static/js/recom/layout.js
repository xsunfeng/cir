define([
  'd3',
  'sankey',
  'jquery',
  'semantic-ui',
  'utils',
], function(
  d3,
  sankey_module,
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
    var terms = $('#searchTerm').val();
    if (terms.length === 0) {
      $("#docList .item").show();
      docCount = $("#docList .item").length;
    } else {
      termsSplited = terms.toLowerCase().split(' ');
      for(var i=0; i < termsSplited.length; i++) {
        termsSplited[i] = stemmer(termsSplited[i]);
      }
      docCount = 0;
      $("#docList .item").each(function(index) {
        var titleSplited = $(this).find('.header').text().replace(/[^\w\s]/gi, '').toLowerCase().split(' ');
        for(var i=0; i < titleSplited.length; i++) {
          titleSplited[i] = stemmer(titleSplited[i]);
        }
        isSearched = termsSplited.every(function(val) { return titleSplited.indexOf(val) >= 0; })
        if (isSearched) {
          $(this).show();
          docCount++;
        } else {
          $(this).hide();
        }
      });
    }
    $("#numDocFound").text(docCount);
  });

  $('#docList .item .header').on("click", function(){
    var doc_idx = $(this).attr('doc-idx');

    $.ajax({
      url: '/api_recom/get_doc/',
      type: 'post',
      data: {
        'doc_idx': doc_idx
      },
      success: function(xhr) {
        $('#docDetail ._title').text(xhr.title);
        $('#docDetail ._body').text(xhr.body);
        $('#docDetail ._created').text(xhr.created_pretty);
        $('#docDetail ._signature_count').text(xhr.signature_count);
        $('#docDetail ._signature_threshold').text(xhr.signature_threshold);
        $('#docDetail').attr('doc-idx', doc_idx);

        $('#docDetail ._issue_names').empty();
        xhr.issue_names.forEach(function(issue_name) {
          var label = '<a class="ui basic label">' + issue_name + '</a>';
          $('#docDetail ._issue_names').append(label);
        });

        $('#docDetail ._topic_names').empty();
        for (var i = 0; i < xhr.topic_names.length; i++) {
          var topic_name = xhr.topic_names[i];
          var tooltip = xhr.topic_words[i];
          var label = '<a class="ui basic label">' + topic_name + '</a>';
          $('#docDetail ._topic_names').append(label);
        }

        $('#docDetail .progress').progress({
          percent: xhr.sig_percent
        });
      },
      error: function(xhr) {
        if (xhr.status == 403) {
          Utils.notify('error', xhr.responseText);
        }
      }
    });
  });

  $('body').on("click", "#recom_doc_list .recom_doc_title", function(){
    var doc_idx = $(this).attr('doc-idx');

    $.ajax({
      url: '/api_recom/get_doc/',
      type: 'post',
      data: {
        'doc_idx': doc_idx
      },
      success: function(xhr) {
        $('#recomDocDetail ._title').text(xhr.title);
        $('#recomDocDetail ._body').text(xhr.body);
        $('#recomDocDetail ._created').text(xhr.created_pretty);
        $('#recomDocDetail ._signature_count').text(xhr.signature_count);
        $('#recomDocDetail ._signature_threshold').text(xhr.signature_threshold);
        $('#recomDocDetail').attr('doc-idx', doc_idx);

        $('#recomDocDetail ._issue_names').empty();
        xhr.issue_names.forEach(function(issue_name) {
          var label = '<a class="ui basic label">' + issue_name + '</a>';
          $('#recomDocDetail ._issue_names').append(label);
        });

        $('#recomDocDetail ._topic_names').empty();
        for (var i = 0; i < xhr.topic_names.length; i++) {
          var topic_name = xhr.topic_names[i];
          var tooltip = xhr.topic_words[i];
          var label = '<a class="ui basic label">' + topic_name + '</a>';
          $('#recomDocDetail ._topic_names').append(label);
        }

        $('#recomDocDetail .progress').progress({
          percent: xhr.sig_percent
        });
      },
      error: function(xhr) {
        if (xhr.status == 403) {
          Utils.notify('error', xhr.responseText);
        }
      }
    });
  });

  $('#feel-lucky').on("click", function(){
    var doc_text = $('#docDetail ._title').text()
        + " " + $('#docDetail ._body').text();
    $.ajax({
      url: '/api_recom/find_similar/',
      type: 'post',
      data: {
        'doc_text': doc_text
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

  // https://github.com/kristopolous/Porter-Stemmer
  // stemmed word = stemmer(<word to stem>)
  var stemmer=function(){function h(){}function i(){console.log(Array.prototype.slice.call(arguments).join(" "))}var j={ational:"ate",tional:"tion",enci:"ence",anci:"ance",izer:"ize",bli:"ble",alli:"al",entli:"ent",eli:"e",ousli:"ous",ization:"ize",ation:"ate",ator:"ate",alism:"al",iveness:"ive",fulness:"ful",ousness:"ous",aliti:"al",iviti:"ive",biliti:"ble",logi:"log"},k={icate:"ic",ative:"",alize:"al",iciti:"ic",ical:"ic",ful:"",ness:""};return function(a,l){var d,b,g,c,f,e;e=l?i:h;if(3>a.length)return a;
  g=a.substr(0,1);"y"==g&&(a=g.toUpperCase()+a.substr(1));c=/^(.+?)(ss|i)es$/;b=/^(.+?)([^s])s$/;c.test(a)?(a=a.replace(c,"$1$2"),e("1a",c,a)):b.test(a)&&(a=a.replace(b,"$1$2"),e("1a",b,a));c=/^(.+?)eed$/;b=/^(.+?)(ed|ing)$/;c.test(a)?(b=c.exec(a),c=/^([^aeiou][^aeiouy]*)?[aeiouy][aeiou]*[^aeiou][^aeiouy]*/,c.test(b[1])&&(c=/.$/,a=a.replace(c,""),e("1b",c,a))):b.test(a)&&(b=b.exec(a),d=b[1],b=/^([^aeiou][^aeiouy]*)?[aeiouy]/,b.test(d)&&(a=d,e("1b",b,a),b=/(at|bl|iz)$/,f=/([^aeiouylsz])\1$/,d=/^[^aeiou][^aeiouy]*[aeiouy][^aeiouwxy]$/,
  b.test(a)?(a+="e",e("1b",b,a)):f.test(a)?(c=/.$/,a=a.replace(c,""),e("1b",f,a)):d.test(a)&&(a+="e",e("1b",d,a))));c=/^(.*[aeiouy].*)y$/;c.test(a)&&(b=c.exec(a),d=b[1],a=d+"i",e("1c",c,a));c=/^(.+?)(ational|tional|enci|anci|izer|bli|alli|entli|eli|ousli|ization|ation|ator|alism|iveness|fulness|ousness|aliti|iviti|biliti|logi)$/;c.test(a)&&(b=c.exec(a),d=b[1],b=b[2],c=/^([^aeiou][^aeiouy]*)?[aeiouy][aeiou]*[^aeiou][^aeiouy]*/,c.test(d)&&(a=d+j[b],e("2",c,a)));c=/^(.+?)(icate|ative|alize|iciti|ical|ful|ness)$/;
  c.test(a)&&(b=c.exec(a),d=b[1],b=b[2],c=/^([^aeiou][^aeiouy]*)?[aeiouy][aeiou]*[^aeiou][^aeiouy]*/,c.test(d)&&(a=d+k[b],e("3",c,a)));c=/^(.+?)(al|ance|ence|er|ic|able|ible|ant|ement|ment|ent|ou|ism|ate|iti|ous|ive|ize)$/;b=/^(.+?)(s|t)(ion)$/;c.test(a)?(b=c.exec(a),d=b[1],c=/^([^aeiou][^aeiouy]*)?[aeiouy][aeiou]*[^aeiou][^aeiouy]*[aeiouy][aeiou]*[^aeiou][^aeiouy]*/,c.test(d)&&(a=d,e("4",c,a))):b.test(a)&&(b=b.exec(a),d=b[1]+b[2],b=/^([^aeiou][^aeiouy]*)?[aeiouy][aeiou]*[^aeiou][^aeiouy]*[aeiouy][aeiou]*[^aeiou][^aeiouy]*/,
  b.test(d)&&(a=d,e("4",b,a)));c=/^(.+?)e$/;if(c.test(a)&&(b=c.exec(a),d=b[1],c=/^([^aeiou][^aeiouy]*)?[aeiouy][aeiou]*[^aeiou][^aeiouy]*[aeiouy][aeiou]*[^aeiou][^aeiouy]*/,b=/^([^aeiou][^aeiouy]*)?[aeiouy][aeiou]*[^aeiou][^aeiouy]*([aeiouy][aeiou]*)?$/,f=/^[^aeiou][^aeiouy]*[aeiouy][^aeiouwxy]$/,c.test(d)||b.test(d)&&!f.test(d)))a=d,e("5",c,b,f,a);c=/ll$/;b=/^([^aeiou][^aeiouy]*)?[aeiouy][aeiou]*[^aeiou][^aeiouy]*[aeiouy][aeiou]*[^aeiou][^aeiouy]*/;c.test(a)&&b.test(a)&&(c=/.$/,a=a.replace(c,""),e("5",
  c,b,a));"y"==g&&(a=g.toLowerCase()+a.substr(1));return a}}(); 
});