import json

from django.http import HttpResponse

from cir.models import *

def api_tag(request):
    response = {}
    action = request.REQUEST.get('action')
    if action == 'add-tags':
        response['new_tags'] = []
        tags = json.loads(request.REQUEST.get('tags'))
        context_id = request.REQUEST.get('contextId')
        for tag in tags:
            newTag = Tag(
                start_pos=request.REQUEST.get('start'),
                end_pos=request.REQUEST.get('end'),
                context_id=context_id,
                author=request.user,
                content=tag.strip().lower()
            )
            newTag.save()
            response['new_tags'].append({
                'id': newTag.id,
                'content': newTag.content
            })
        return HttpResponse(json.dumps(response), mimetype='application/json')
