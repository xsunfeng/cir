# Create your views here.
import json

from django.shortcuts import render, render_to_response, redirect
from django.template.loader import render_to_string
from django.http import HttpResponse
from django.utils import timezone
from postcir.models import *
from cir.utils import segment_text

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

    # get user data
    if request.user.is_authenticated():
        context['user_id'] = request.user.id
        context['user_name'] = request.user.get_full_name()
    else:
        context['user_id'] = '-1'

    for stmt_category in StatementCategory.objects.filter(forum=forum):
        stmt_category_entry = {
            'name': stmt_category.name,
            'description': stmt_category.description,
            'groups': []
        }
        context['statement_categories'].append(stmt_category_entry)
        for stmt_group in StatementGroup.objects.filter(category=stmt_category):
            stmt_group_entry = {
                'description': stmt_group.description,
                'items': []
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
    now = timezone.now()
    if action == 'new-post':
        if not request.user.is_authenticated():
            return HttpResponse("Please log in first.", status=403)
        content = request.REQUEST.get('content')
        citations = json.loads(request.REQUEST.get('citations'))
        highlight_object = None
        for citation in citations:
            stmt_item = StatementItem.objects.get(id=citation['stmt_item_id'])
            start = citation['start']
            end = citation['end']
            # TODO check if exist
            highlight_object = Highlight(start_pos=start, end_pos=end, context=stmt_item)
            highlight_object.save()
        Post.objects.create(
            forum_id=request.session['forum_id'],
            author=request.user,
            content=content,
            highlight=highlight_object,
            content_type='comment', # TODO pass from front end
        )
    if action == 'load-posts' or action == 'new-post':
        forum = Forum.objects.get(id=request.session['forum_id'])
        context = {}
        context['entries'] = []
        posts = Post.objects.filter(forum=forum)
        for post in posts:
            context['entries'].append(post.getAttr(forum))
        context['entries'] = sorted(context['entries'], key=lambda en: en['created_at_full'])
        response['html'] = render_to_string("feed/activity-feed-postcir.html", context)
    return HttpResponse(json.dumps(response), mimetype='application/json')

