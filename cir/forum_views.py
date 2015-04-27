import json

from django.shortcuts import render, render_to_response
from django.http import HttpResponse
from django.template import RequestContext
from django.db.models import Q

from cir.models import *

VISITOR_ROLE = 'visitor'

def home(request): # access /
    if 'actual_user_id' in request.session:
        del request.session['actual_user_id']
    request.session['forum_id'] = -1
    if request.user.is_authenticated():
        # request.session['user_id'] = request.user.id
        context = {
            'user_id': request.user.id,
            'user_name': request.user.get_full_name(),
            'forums': _forums(request)
        }
        return render(request, 'index_forums.html', context)
    else:
        return render(request, 'index_forums.html', {'user_id': '-1', 'forums': _forums(request)})

def _forums(request):
    forum_infos = []
    forums = Forum.objects.exclude(access_level='private')
    if request.user.is_authenticated(): # add forums in which I have a role
        # get all forums in which I have a role
        forums_q = request.user.role.all().values('forum').query
        forums |= Forum.objects.filter(id__in=forums_q)
    for forum in forums.order_by('-id'):
        try:
            role = Role.objects.get(user=request.user, forum=forum).role
        except:
            role = VISITOR_ROLE
        forum_info = forum.getAttr()
        forum_info['role'] = role
        forum_infos.append(forum_info)
    return forum_infos

def enter_forum(request, forum_url): # access /forum_name
    if 'actual_user_id' in request.session:
        del request.session['actual_user_id']
    try:
        forum = Forum.objects.get(url=forum_url)
    except: # 404
        context = {
            'load_error': '404'
        }
        return render(request, 'index.html', context)
    request.session['forum_id'] = forum.id
    request.session['role'] = VISITOR_ROLE
    context = {}
    context['forum_name'] = forum.full_name
    context['dashboard_url'] = forum.url + '/dashboard'
    context['panelists'] = []
    for panelist in forum.members.filter(Q(role='panelist') | Q(role='facilitator')):
        context['panelists'].append({
            'id': panelist.user.id,
            'name': panelist.user.get_full_name()
        })
    if request.user.is_authenticated():
        try:
            request.user.info.last_visited_forum = forum
            request.user.info.save()
        except: # no userinfo found
            UserInfo.objects.create(user=request.user, last_visited_forum=forum)
        try:
            request.session['role'] = Role.objects.get(user=request.user, forum=forum).role
        except:
            pass
        context['user_id'] = request.user.id
        context['user_name'] = request.user.get_full_name()
        context['role'] = request.session['role']
    else:
        context['user_id'] = -1
        context['user_name'] = ''
        context['role'] = request.session['role']
    if forum.access_level == 'private' and (not request.user.is_authenticated() or not Role.objects.filter(user=request.user, forum=forum).exists()):
        context['load_error'] = '403'
    return render(request, 'index.html', context)

def enter_statement(request):
    return render(request, 'index.html')

def handler500(request):
    response = render_to_response('500.html', {}, context_instance=RequestContext(request))
    response.status_code = 500
    return response