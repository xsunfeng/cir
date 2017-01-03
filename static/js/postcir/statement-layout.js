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

    $('#stmt-quiz-submit-btn').click(function() {
        var answers = {};
        var all_filled_in = true;
        var $question_inputs = $('.stmt-quiz-answer[data-id]');
        $question_inputs.each(function() {
            var val = $(this).find('textarea').val();
            if (val.trim().length === 0) {
                $('html, body').scrollTop($(this).offset().top - 50);
                Utils.notify('warning', 'Please fill in all questions');
                all_filled_in = false;
                return false;
            }
            answers[$(this).attr('data-id')] = $(this).find('textarea').val();
        });
        if (all_filled_in) {
            $(this).addClass('loading');
            $.ajax({
                url: urlPrefix + '/api_stmt_quiz/',
                type: 'post',
                data: {'answers': answers},
                success: function (xhr) {
                    window.location.reload();
                },
                error: function (xhr) {
                    if (xhr.status == 403) {
                        Utils.notify('error', xhr.responseText);
                    }
                }
            });
        }
    });

    $('.stmt-voter .ui.checkbox').checkbox({
        onChange: function () {
            var vote = this.getAttribute('data-vote');
            if (vote === 'yes' || vote === 'no') {
                module.vote = vote;
            }
        }
    });

    $('#quiz-area').on('click', '#my-vote.collapsed', function() {
        $(this).removeClass('collapsed').addClass('expanded');
    });

    // $('#quiz-area').on('click', '#my-vote.expanded', function () {
    //     $(this).removeClass('expanded').addClass('collapse');
    // });

    function injectQuizBoxes() {
        var $stmt_questions = $('.stmt-group-question[data-id]');
        for (var i = 0; i < $stmt_questions.length; i++) {
            var question = $stmt_questions.get(i);
            var $textarea = '<div class="stmt-quiz-answer" data-id="' + question.getAttribute('data-id') + '">' +
                'Your answer:' +
                '<textarea rows="2"></textarea></div>';
            $('#quiz-answers-wrapper').append($textarea);
        }
        rearrangeQuizBoxes();
    }

    function rearrangeQuizBoxes() {
        var $stmt_questions = $('.stmt-group-question[data-id]');
        for (var i = 0; i < $stmt_questions.length; i++) {
            var question = $stmt_questions.get(i);
            var $textarea = $('.stmt-quiz-answer[data-id="' + question.getAttribute('data-id') + '"]');
            $textarea.offset({
                top: $('.stmt-group-question[data-id="' + question.getAttribute('data-id') + '"]').offset().top
            });
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