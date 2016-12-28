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
    request.session['forum_id'] = forum.id
    request.session['role'] = VISITOR_ROLE
    context = {
        'forum_name': forum.full_name,
        'forum_url': forum.url,
        'stmt_preamble': forum.stmt_preamble,
        'statement_categories': []
    }
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
    if action == 'load-posts':
        forum = Forum.objects.get(id=request.session['forum_id'])
        context = {}
        context['entries'] = []
        posts = Post.objects.filter(forum=forum, content_type='postcir')
        for post in posts:
            context['entries'].append(post.getAttr(forum))
        context['entries'] = sorted(context['entries'], key=lambda en: en['created_at_full'])
        response['html'] = render_to_string("feed/activity-feed-postcir.html", context)
    return HttpResponse(json.dumps(response), mimetype='application/json')

