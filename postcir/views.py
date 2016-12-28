# Create your views here.
import json

from django.shortcuts import render, render_to_response, redirect
from django.template.loader import render_to_string
from django.http import HttpResponse
from django.utils import timezone
from cir.models import *

index_building = False

VISITOR_ROLE = 'visitor'

def home(request, forum_url):
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
    context = {}
    context['forum_name'] = forum.full_name
    context['forum_url'] = forum.url
    context['stmt_preamble'] = forum.stmt_preamble
    context['claims'] = {
        'findings': [],
        'pros': [],
        'cons': []
    }
    findings = Claim.objects.filter(forum=forum, stmt_order__isnull=False, claim_category='finding').order_by('stmt_order')
    for claim in findings:
        context['claims']['findings'].append(claim.getAttrStmt())
    pros = Claim.objects.filter(forum=forum, stmt_order__isnull=False, claim_category='pro').order_by('stmt_order')
    for claim in pros:
        context['claims']['pros'].append(claim.getAttrStmt())
    cons = Claim.objects.filter(forum=forum, stmt_order__isnull=False, claim_category='con').order_by('stmt_order')
    for claim in cons:
        context['claims']['cons'].append(claim.getAttrStmt())
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

