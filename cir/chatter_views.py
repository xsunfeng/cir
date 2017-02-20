import json
import utils

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
        integrated_messages = []
        for message in messages:
            integrated_messages.append(message.getAttr())
        for claim in Claim.objects.filter(forum = forum):
            for claim_version in claim.versions.all():
                for comment in StatementComment.objects.filter(claim_version = claim_version):
                    item = {}
                    user = comment.author
                    item["user_id"] = user.id
                    item["created_at"] = utils.pretty_date(comment.created_at)
                    item["content"] = comment.text
                    item["role"] = ""
                    if user.role.filter(forum = forum).exists():
                        item["role"] = user.role.filter(forum = forum)[0].role
                    item["user_name"] = user.last_name + " " + user.first_name
                    item["id"] = comment.id
                    item["timestamp"] = comment.created_at.strftime("%s")
                    item["slot_id"] = claim_version.claim.id
                    item["statement_id"] = claim_version.id
                    integrated_messages.append(item)
        integrated_messages = sorted(integrated_messages, key=lambda item: item['timestamp'], reverse=False)
        response['messages'] = integrated_messages
        # if len(messages) > 25:
        #     for i in range(24, -1, -1):
        #         response['messages'].append(messages[i].getAttr())
        # else:
        #     for message in messages:
        #         response['messages'].append(message.getAttr())
    return HttpResponse(json.dumps(response), mimetype='application/json')
