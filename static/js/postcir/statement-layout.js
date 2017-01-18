define([
    'jquery',
    'utils',
    'semantic-ui'
], function ($,
             Utils
) {
    var urlPrefix = '/postcir';
    var module = {};

    rearrangeQuizBoxes();

    $(window).resize(rearrangeQuizBoxes);

    $('#stmt-quiz-submit-btn').click(function() {
        var answers = {};
        var all_filled_in = true;
        var $question_inputs = $('.stmt-quiz-answer[data-id]');
        $question_inputs.each(function() {
            var val = $(this).find('textarea').val();
            if (val.trim().length === 0) {
                $('html, body').scrollTop($(this).offset().top - 50);
                Utils.notify('warning', 'Please fill in all answers');
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

    initVoter();

    $('#quiz-area').on('click', '#my-vote.collapsed', function() {
        $(this).removeClass('collapsed').addClass('expanded');
    });
    $('#quiz-area').on('click', '#stmt-cancel-btn', function() {
        $('#my-vote').addClass('collapsed').removeClass('expanded');
    });
    $('#quiz-area').on('click', '#stmt-vote-btn', function() {
        var content = $('#stmt-vote-textarea').val();
        if (content.trim().length == 0) {
            Utils.notify('warning', 'Please fill in the reason.');
            return;
        }
        $(this).addClass('loading');
        makePost(content);
    });

    function initVoter() {
        $('.stmt-voter input[type="range"]').on('change', function () {
            module.vote = this.value;
        });
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

    function makePost(rawcontent) {
        $('#my-vote').addClass('loading');
        $.ajax({
            url: urlPrefix + '/api_stmt_vote/',
            type: 'post',
            data: {
                'content': rawcontent,
                'vote': module.vote
            },
            success: function (xhr) {
                var $vote_wrapper = $(xhr.html).find('#my-vote');
                $('#my-vote').replaceWith($vote_wrapper);
                initVoter();
            },
            error: function (xhr) {
                if (xhr.status == 403) {
                    Utils.notify('error', xhr.responseText);
                }
            }
        });
    }
});