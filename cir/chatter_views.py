import json

from django.http import HttpResponse
from django.utils import timezone

from cir.models import *

def api_chatter(request):
    response = {}
    action = request.REQUEST.get('action')
    if action == 'send-msg':
        now = timezone.now()
        content = request.REQUEST.get('content')
        ChatMessage.objects.create(source=request.user, content=content, created_at=now)
    if action == 'recent-history':
        forum = Forum.objects.get(id=request.session['forum_id'])
        messages = ChatMessage.objects.order_by('-created_at')[:25]
        response['messages'] = [msg.getAttr(forum) for msg in messages]
    return HttpResponse(json.dumps(response), mimetype='application/json')
