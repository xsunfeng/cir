import json

from django.template.loader import render_to_string
from django.http import HttpResponse
from django.utils import timezone
from django.db.models import Q

from cir.models import *

VISITOR_ROLE = 'visitor'

def api_postcir(request):
    response = {}
    action = request.REQUEST.get('action')
    now = timezone.now()
    if action == 'new-post':
        content = request.REQUEST.get('content')
        citations = request.REQUEST.getlist('citations')
        for citation in citations:
            claim = Claim.objects.get(id=citation.claim_id)
            start = citation.start
            end = citation.end
            Highlight.objects.create(start_pos=start, end_pos=end, context=claim, is_nugget=False, created_at=now, author=request.user)
        Post.objects.create(forum_id=request.session['forum_id'], author=request.user,
            content=content, created_at=now, updated_at=now, content_type='postcir')
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

