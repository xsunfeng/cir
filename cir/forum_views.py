from django.shortcuts import render, render_to_response
from django.template import RequestContext
from django.db.models import Q
from django.utils import timezone

from cir.models import *
from cir.phase_control import PHASE_CONTROL
from cir.settings import DISPATCHER_URL
from user_views import update_user_login

VISITOR_ROLE = 'visitor'

def home(request):  # access /
    if 'actual_user_id' in request.session:
        del request.session['actual_user_id']
    request.session['forum_id'] = -1

    forum_infos = []

    # don't include private forums
    forums = Forum.objects.exclude(access_level='private')

    if request.user.is_authenticated():
        # add private forums in which I have a role
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

    if request.user.is_authenticated():
        context = {
            'user_id': request.user.id,
            'user_name': request.user.get_full_name(),
            'forums': forum_infos
        }
    else:
        context = {
            'user_id': '-1',
            'forums': forum_infos
        }
    return render(request, 'index_forums.html', context)


def enter_forum(request, forum_url, phase_name):  # access /forum_name
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
    context['forum_id'] = forum.id
    context['phase'] = PHASE_CONTROL[forum.phase]

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
                not request.user.is_authenticated() or not Role.objects.filter(user=request.user,
                    forum=forum).exists()):
        context['load_error'] = '403'
    elif request.user.is_authenticated(): # everything allright
        # add user login entry
        update_user_login(None, request.user)
    themes = ClaimTheme.objects.filter(forum=forum)
    context['themes'] = [theme.getAttr() for theme in themes]
    context['dispatcher_url'] = DISPATCHER_URL
    context['sankey'] = render(request, 'sankey.html', context)
    index_html = "index.html"
    # phase_name = forum.phase
    if phase_name == "nugget":
        index_html = "phase1/index.html"
    elif phase_name == "extract":
        index_html = "phase2/index.html"
    elif phase_name == "categorize":
        index_html = "phase3/index.html"
    elif phase_name == "improve":
        index_html = "phase4/index.html"
    elif phase_name == "finished":
        index_html = "phase5/index.html"
    return render(request, index_html, context)


def enter_workbench(request, forum_url):  # access /forum_name
    if 'actual_user_id' in request.session:
        del request.session['actual_user_id']
    try:
        forum = Forum.objects.get(url=forum_url)
    except:  # 404
        context = {
            'load_error': '404'
        }
        return render(request, 'workbench.html', context)
    request.session['forum_id'] = forum.id
    request.session['role'] = VISITOR_ROLE
    context = {}
    context['forum_name'] = forum.full_name
    context['forum_url'] = forum.url
    context['phase'] = PHASE_CONTROL[forum.phase]

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
                not request.user.is_authenticated() or not Role.objects.filter(user=request.user,
                    forum=forum).exists()):
        context['load_error'] = '403'
    themes = ClaimTheme.objects.filter(forum=forum)
    context['themes'] = [theme.getAttr() for theme in themes]
    return render(request, 'workbench.html', context)

def enter_sankey(request, forum_url):  # access /forum_name
    context = {}
    if 'actual_user_id' in request.session:
        del request.session['actual_user_id']
    try:
        forum = Forum.objects.get(url=forum_url)
    except:  # 404
        context = {
            'load_error': '404'
        }
    context['forum_id'] = forum.id
    return render(request, 'sankey.html', context)

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

def handler500(request):
    response = render_to_response('500.html', {}, context_instance=RequestContext(request))
    response.status_code = 500
    return response