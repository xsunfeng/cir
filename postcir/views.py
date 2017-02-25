# Create your views here.
import json
import datetime

from django.shortcuts import render
from django.template.loader import render_to_string
from django.http import HttpResponse
from postcir.models import *
from cir.utils import segment_text, pretty_date

VISITOR_ROLE = 'visitor'

def home(request, forum_url):
    # no delegation on this forum
    if 'actual_user_id' in request.session:
        del request.session['actual_user_id']
    try:
        forum = Forum.objects.get(url=forum_url)
    except:  # 404
        context = {
            'load_error': '404'
        }
        return render(request, 'index_statement.html', context)

    # get specified forum data
    request.session['forum_id'] = forum.id
    context = {
        'forum_name': forum.full_name,
        'forum_url': forum.url,
        'stmt_preamble': forum.stmt_preamble,
        'statement_categories': []
    }

    # get the active phase for user
    context['active_phase'] = _get_active_phase(request.user, request.GET.get('show_forum'))

    # get user data
    if request.user.is_authenticated():
        context['user_id'] = request.user.id
        context['user_name'] = request.user.get_full_name()
        UserEvent.objects.create(
            user=request.user,
            event='phase.enter',
            extra_data=json.dumps({
                'phase': context['active_phase'],
                'ua': request.META.get('HTTP_USER_AGENT')
            })
        )
    else:
        remote_ip = request.META.get('REMOTE_ADDR', '')
        if not remote_ip:
            remote_ip = request.META.get('HTTP_X_FORWARDED_FOR', 'UNKNOWN')
        UserEvent.objects.create(
            event='phase.enter.visitor',
            extra_data=json.dumps({
                'phase': context['active_phase'],
                'ip': remote_ip,
                'ua': request.META.get('HTTP_USER_AGENT')
            })
        )
        context['user_id'] = '-1'

    if context['active_phase'] == 'deliberation' or context['active_phase'] == 'statement':
        # load most recent vote
        if request.user.is_authenticated():
            user_votes = Post.objects.filter(
                forum=forum,
                author=request.user,
                vote__isnull=False,
            ).order_by('-created_at')
            if user_votes.count() > 0:
                context['most_recent_vote'] = {
                    'vote': user_votes[0].vote,
                    'voted_at': pretty_date(user_votes[0].created_at),
                    'vote_percentage': (user_votes[0].vote + 100.0) / 2.0
                }
        # load citizens statement
        for stmt_category in StatementCategory.objects.filter(forum=forum):
            stmt_category_entry = {
                'name': stmt_category.name,
                'description': stmt_category.description,
                'groups': []
            }
            context['statement_categories'].append(stmt_category_entry)
            for stmt_group in StatementGroup.objects.filter(category=stmt_category):
                stmt_group_entry = {
                    'id': stmt_group.id,
                    'description': stmt_group.description,
                    'extra_description': stmt_group.extra_description,
                    'items': [],
                    'num_of_comments': stmt_group.comments.count()
                }
                stmt_category_entry['groups'].append(stmt_group_entry)
                for stmt_item in StatementItem.objects.filter(group=stmt_group):
                    stmt_group_entry['items'].append({
                        'id': stmt_item.id,
                        'content': stmt_item.content,
                        'content_segmented': segment_text(stmt_item.content)
                    })

    return render(request, 'index_statement.html', context)

def api_postcir(request):
    response = {}
    action = request.REQUEST.get('action')
    if action == 'complete-issue':
        if not request.user.is_authenticated():
            return HttpResponse("Please log in first.", status=403)
        content = request.REQUEST.get('content')
        vote = int(request.REQUEST.get('vote', '0'))
        Post.objects.create(
            forum_id=request.session['forum_id'],
            author=request.user,
            content=content,
            content_type='comment',
            vote=vote,
            context='issue',
            title=json.dumps({
                'ua': request.META.get('HTTP_USER_AGENT')
            })
        )
        UserEvent.objects.create(
            user=request.user,
            event='phase.complete',
            extra_data=json.dumps({'phase': 'issue', 'ua': request.META.get('HTTP_USER_AGENT')})
        )
    if action == 'new-post':
        if not request.user.is_authenticated():
            return HttpResponse("Please log in first.", status=403)
        content = request.REQUEST.get('content')
        parent_id = request.REQUEST.get('parent_id')
        if parent_id:
            Post.objects.create(
                forum_id=request.session['forum_id'],
                author=request.user,
                content=content,
                content_type='comment',  # TODO pass from front end
                parent_id=parent_id,
                context='deliberation',
                title=json.dumps({
                    'ua': request.META.get('HTTP_USER_AGENT')
                })
            )
        else:
            # only non-reply posts can have citations and vote
            citations = json.loads(request.REQUEST.get('citations'))
            highlight_object = None
            for citation in citations:
                stmt_item = StatementItem.objects.get(id=citation['stmt_item_id'])
                start = citation['start']
                end = citation['end']
                # TODO check if exist
                highlight_object = Highlight(start_pos=start, end_pos=end, context=stmt_item)
                highlight_object.save()

            # vote is nullable
            vote = int(request.REQUEST.get('vote', '0'))
            post = Post(
                forum_id=request.session['forum_id'],
                author=request.user,
                content=content,
                highlight=highlight_object, # TODO very problematic -- only the last highlight counts.
                content_type='comment', # TODO pass from front end
                vote=vote,
                context='deliberation',
                title=json.dumps({
                    'ua': request.META.get('HTTP_USER_AGENT')
                })
            )
            post.save()
            response['voter_html'] = render_to_string("postcir/deliberation.html", {
                'most_recent_vote': {
                    'vote': post.vote,
                    'voted_at': pretty_date(post.created_at),
                    'vote_percentage': (post.vote + 100.0) / 2.0
                }
            })
    if action == 'load-posts' or action == 'new-post':
        forum = Forum.objects.get(id=request.session['forum_id'])
        response['html'] = render_to_string("feed/activity-feed-postcir.html", {
            'posts': Post.objects.filter(forum=forum, context='deliberation')
        })

    return HttpResponse(json.dumps(response), mimetype='application/json')

def api_stmt_quiz(request):
    response = {}
    if not request.user.is_authenticated():
        return HttpResponse("Please log in first.", status=403)

    for stmt_group in StatementGroup.objects.filter(forum_id=request.session['forum_id']):
        answer = request.REQUEST.get('answers[' + str(stmt_group.id) + ']')
        if answer:
            Post.objects.create(
                forum_id=request.session['forum_id'],
                author=request.user,
                content=answer,
                content_type='comment',
                context='stmt_group',
                stmt_group=stmt_group,
                title=json.dumps({'ua': request.META.get('HTTP_USER_AGENT')})
            )
    UserEvent.objects.create(
        user=request.user,
        event='phase.complete',
        extra_data=json.dumps({'phase': 'statement', 'ua': request.META.get('HTTP_USER_AGENT')})
    )
    return HttpResponse(json.dumps(response), mimetype='application/json')

def api_stmt_vote(request):
    if not request.user.is_authenticated():
        return HttpResponse("Please log in first.", status=403)
    content = request.REQUEST.get('content')
    vote = int(request.REQUEST.get('vote', '0'))
    post = Post(
        forum_id=request.session['forum_id'],
        author=request.user,
        content=content,
        content_type='comment',
        vote=vote,
        context='statement',
        title=json.dumps({'us': request.META.get('HTTP_USER_AGENT')})
    )
    post.save()

    context = {
        'most_recent_vote': {
            'vote': post.vote,
            'voted_at': pretty_date(post.created_at),
            'vote_percentage': (post.vote + 100.0) / 2.0
        }
    }
    response = {
        'html': render_to_string("postcir/stmt-quiz.html", context)
    }
    return HttpResponse(json.dumps(response), mimetype='application/json')

def api_stmt_question(request):
    forum = Forum.objects.get(id=request.session['forum_id'])
    stmt_group = StatementGroup.objects.get(id=request.REQUEST.get('stmt_group_id'))
    action = request.REQUEST.get('action')
    response = {}

    if action == 'new-post':
        content = request.REQUEST.get('content')
        parent_id = request.REQUEST.get('parent_id')
        Post.objects.create(
            forum_id=request.session['forum_id'],
            author=request.user,
            content=content,
            content_type='comment',
            context='stmt_group',
            stmt_group=stmt_group,
            parent_id=parent_id,
            title=json.dumps({'ua': request.META.get('HTTP_USER_AGENT')})
        )
    if action == 'load-posts' or action == 'new-post':
        response['html'] = render_to_string("feed/activity-feed-stmt-group.html", {
            'posts': Post.objects.filter(
                forum=forum,
                context='stmt_group',
                stmt_group=stmt_group
            ),
            'question': stmt_group.description,
            'prompt': stmt_group.extra_description
        })
    return HttpResponse(json.dumps(response), mimetype='application/json')


def _get_active_phase(user, show_forum):
    """Load the user's current phase upon refresh"""

    # before 3/25/2017, show sign up view (qualtrics)
    now = datetime.datetime.now()
    experiment_begin = datetime.datetime(2017, 3, 25, 2, 0)

    if now < experiment_begin:
        if user.is_authenticated() and show_forum:
            pass
        else:
            return 'pre_sign_up'

    # hit this point if either it's experiment time, or the user logged in and set `show_forum=1`
    if not user.is_authenticated():
        return 'issue'
    events = UserEvent.objects.filter(user=user, event='phase.complete')
    if events.count() == 0:
        return 'issue'
    recent = events.order_by('-created_at')[0]
    recent_data = json.loads(recent.extra_data)
    if recent_data['phase'] == 'issue':
        return 'statement'
    return 'deliberation'

def api_questionnaire(request):
    print request.REQUEST
    return HttpResponse('working!', mimetype='application/json')