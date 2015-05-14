import json

from django.shortcuts import render
from django.http import HttpResponse

from cir.models import *

def register_delegator(request):
    response = {}
    user_id = request.REQUEST.get('user_id')
    if user_id == request.user.id:
        # switch back
        if 'actual_user_id' in request.session:
            del request.session['actual_user_id']
    else:
        response['role'] = Role.objects.get(user_id=user_id, forum_id=request.session['forum_id']).role
        request.session['actual_user_id'] = user_id
    return HttpResponse(json.dumps(response), mimetype='application/json')

def enter_dashboard(request, forum_url):
    try:
        forum = Forum.objects.get(url=forum_url)
    except:  # 404
        context = {'load_error': '404'}
        return render(request, 'index_dashboard.html', context)
    request.session['role'] = VISITOR_ROLE
    context = {}
    if request.user.is_authenticated():
        try:
            request.session['role'] = Role.objects.get(user=request.user, forum=forum).role
        except:
            pass
    if request.session['role'] != 'facilitator' and request.session['role'] != 'admin':
        context['load_error'] = '403'
    context['forum_name'] = forum.full_name
    context['forum_url'] = forum.url
    context['description'] = forum.description
    context['access_level'] = forum.access_level
    context['phase'] = forum.phase
    return render(request, 'index_dashboard.html', context)

def switch_phase(request):
    forum = Forum.objects.get(id=request.session['forum_id'])
    newPhase = request.REQUEST.get('newPhase')
    forum.phase = newPhase
    forum.save()
    return HttpResponse()