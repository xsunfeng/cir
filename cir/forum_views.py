import json

from django.shortcuts import render, render_to_response
from django.http import HttpResponse
from django.template import RequestContext
from django.db.models import Q

from cir.models import *

VISITOR_ROLE = 'visitor'

def home(request):  # access /
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
    if request.user.is_authenticated():  # add forums in which I have a role
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

def _get_forum_settings(forum):
    settings = {}
    settings['phase'] = forum.phase
    settings['phase_full'] = forum.get_phase_display()
    if forum.phase == 'not_started' or forum.phase == 'extract':
        settings['document_active'] = 'active'
        settings['claim_active'] = ''
    else:
        settings['document_active'] = ''
        settings['claim_active'] = 'active'
    # TODO add settings for "citizens statement" tab
    return settings

def enter_forum(request, forum_url):  # access /forum_name
    if 'actual_user_id' in request.session:
        del request.session['actual_user_id']
    try:
        forum = Forum.objects.get(url=forum_url)
    except:  # 404
        context = {
            'load_error': '404'
        }
        return render(request, 'index.html', context)
    request.session['forum_id'] = forum.id
    request.session['role'] = VISITOR_ROLE
    context = {}
    context['forum_name'] = forum.full_name
    context['forum_url'] = forum.url
    context['settings'] = _get_forum_settings(forum)

    if request.user.is_authenticated():
        context['panelists'] = []
        context['staff'] = []
        for panelist in forum.members.filter(role='panelist'):
            context['panelists'].append({
                'id': panelist.user.id,
                'name': panelist.user.get_full_name()
            })
        for staff in forum.members.filter(Q(role='facilitator') | Q(role='admin')).exclude(user=request.user):
            context['staff'].append({
                'id': staff.user.id,
                'name': staff.user.get_full_name()
            })
        try:
            request.user.info.last_visited_forum = forum
            request.user.info.save()
        except:  # no userinfo found
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
    if forum.access_level == 'private' and (
        not request.user.is_authenticated() or not Role.objects.filter(user=request.user, forum=forum).exists()):
        context['load_error'] = '403'
    return render(request, 'index.html', context)

def enter_statement(request, forum_url):
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
    if request.user.is_authenticated():
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
    if forum.access_level == 'private' and (
        not request.user.is_authenticated() or not Role.objects.filter(user=request.user, forum=forum).exists()):
        context['load_error'] = '403'
    return render(request, 'index_statement.html', context)

def handler500(request):
    response = render_to_response('500.html', {}, context_instance=RequestContext(request))
    response.status_code = 500
    return response