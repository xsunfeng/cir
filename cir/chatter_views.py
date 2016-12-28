import json

from django.http import HttpResponse
from django.utils import timezone

from cir.models import *

def api_chatter(request):
    response = {}
    action = request.REQUEST.get('action')
    forum = Forum.objects.get(id=request.session['forum_id'])
    if action == "get-all-user":
        response["users"] = []
        print forum.id
        for role in Role.objects.filter(forum = forum):
            user = {}
            user["user_id"] = role.user.id
            user["user_name"] = role.user.first_name + " " + role.user.last_name
            user["role"] = role.role
            user["forum_id"] = forum.id
            response["users"].append(user) 
    if action == 'send-msg':
        now = timezone.now()
        content = request.REQUEST.get('content')
        ChatMessage.objects.create(source=request.user, content=content, created_at=now, forum=forum)
    if action == 'recent-history':
        forum = Forum.objects.get(id=request.session['forum_id'])
        messages = ChatMessage.objects.filter(forum=forum).order_by('-created_at')
        response['messages'] = []
        if len(messages) > 25:
            for i in range(24, -1, -1):
                response['messages'].append(messages[i].getAttr())
        else:
            for message in messages:
                response['messages'].append(message.getAttr())
    return HttpResponse(json.dumps(response), mimetype='application/json')
