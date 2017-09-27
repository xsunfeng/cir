define([
  'utils',
  'realtime/socket',
  'semantic-ui',
  'jquery.ui',
], function(
  Utils,
  Socket,
) {
  sessionStorage.setItem('category', 'finding');
  
  var module = {};
  var viz;
  var workbook;
  var activeSheet;

  module.initLayout = function() {
    $(initializeViz);
    showForumCommentList();
    init_comment_events();
  }

  function initializeViz() {
    var placeholderDiv = document.getElementById("tableauViz");
    var url = "https://us-east-1.online.tableau.com/t/spatiallab/views/map_test/Trajectory?:embed=y&:showAppBanner=false&:showShareOptions=true&:display_count=no&:showVizHome=no";
    var options = {
      width: placeholderDiv.offsetWidth,
      height: placeholderDiv.offsetHeight,
      hideTabs: true,
      hideToolbar: true,
      onFirstInteractive: function () {
        workbook = viz.getWorkbook();
        activeSheet = workbook.getActiveSheet();
      }
    };
    viz = new tableau.Viz(placeholderDiv, url, options);
    listenToMarksSelection();
  }

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
    $("body").on("click", ".visref_id", function(){
      // click button to retrive/restore the state
      var customViewName = $(this).attr("value");
      workbook.showCustomViewAsync(customViewName).then(
        function() { console.log('Showed custom view ' + customViewName);  excel_download(); },
        function() { console.warn('Failed to show custom view ' + customViewName); }
      );
      $.ajax({
        url: '/api_va/get_visref/',
        type: 'post',
        data: {
          'visref_id': customViewName,
        },
        success: function(xhr) {
          var config = JSON.parse(xhr.config);
          var sheet_name = config["sheet_name"];
          $('#va-tabs .item:contains("' + sheet_name + '")').click();
        },
        error: function(xhr) {
          if (xhr.status == 403) {
            Utils.notify('error', xhr.responseText);
          }
        }
      }); 
    }).on("click", ".ref-vis", function(){
      // click button to save cuurent state
      var $textarea = $(this).closest(".form").find("textarea");
      var visref_parent = sessionStorage.getItem("visref_parent");
      if (!visref_parent) visref_parent = "null";
      var config = {
        "sheet_name": $("#va-tabs .item.active").text()
      };
      config = JSON.stringify(config);
      $.ajax({
        url: '/api_va/put_visref/',
        type: 'post',
        data: {
          'visref_parent': visref_parent,
          'config': config
        },
        success: function(xhr) {
          console.log(xhr);
          var content = $textarea.val();
          content = content + "{" + xhr.visref_id + "}";
          $textarea.val(content);
          var customViewName = xhr.visref_id.toString();
          workbook.rememberCustomViewAsync(customViewName).then(
            function() { console.log('Remembered custom view ' + customViewName);  excel_download(); },
            function() { console.warn('Failed to remember custom view ' + customViewName); }
          );
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

    $("#va-tabs").on("click", ".item", function(){
      $(this).siblings().removeClass("active");
      $(this).addClass("active");
      var sheet_name = $(this).text();
      workbook.activateSheetAsync(sheet_name);
    });
  }

  module.initLayout();
});




