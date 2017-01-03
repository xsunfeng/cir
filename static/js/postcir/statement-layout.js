define([
    'jquery',
    'utils',
    'semantic-ui'
], function ($,
             Utils
) {
    var urlPrefix = '/postcir';
    var module = {};

    $('.ui.accordion').accordion();

    injectQuizBoxes();

    $(window).resize(rearrangeQuizBoxes);

    function injectQuizBoxes() {
        var $stmt_questions = $('.stmt-group-question[data-id]');
        for (var i = 0; i < $stmt_questions.length; i++) {
            var question = $stmt_questions.get(i);
            var $textarea = '<div class="stmt-quiz-answer" data-id="' + question.getAttribute('data-id') + '">' +
                'Your answer:' +
                '<textarea rows="2"></textarea></div>';
            $('#quiz-area .form').append($textarea);
        }
        rearrangeQuizBoxes();
    }

    function rearrangeQuizBoxes() {
        var $stmt_questions = $('.stmt-group-question[data-id]');
        for (var i = 0; i < $stmt_questions.length; i++) {
            var question = $stmt_questions.get(i);
            var $textarea = $('.stmt-quiz-answer[data-id="' + question.getAttribute('data-id') + '"]');
            // setTimeout(function() {
                $textarea.offset({
                    top: $('.stmt-group-question[data-id="' + question.getAttribute('data-id') + '"]').offset().top
                });
            // }, 0);
        }
    }

    function makePost(rawcontent, $citations) {
        var citations = [];
        for (var i = 0; i < $citations.length; i++) {
            citations.push({
                'stmt_item_id': $citations.get(i).getAttribute('data-stmt-item-id'),
                'start': $citations.get(i).getAttribute('data-start'),
                'end': $citations.get(i).getAttribute('data-end'),
            });
        }
        var data = {
            'content': rawcontent,
            'action': 'new-post',
            'citations': JSON.stringify(citations),
            'vote': module.vote
        };
        $.ajax({
            url: urlPrefix + '/api_postcir/',
            type: 'post',
            data: data,
            success: function (xhr) {
                $('#posts-area').html(xhr.html);
                tinymce.activeEditor.setContent('');
            },
            error: function (xhr) {
                if (xhr.status == 403) {
                    Utils.notify('error', xhr.responseText);
                }
            }
        });
    }
});