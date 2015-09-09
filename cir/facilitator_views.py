import json

from django.shortcuts import render
from django.http import HttpResponse

from cir.models import *

from sets import Set

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
    context['tag_theme'] = {}
    for theme in ClaimTheme.objects.filter(forum_id=request.session['forum_id']):
        print theme.name
        context['tag_theme'][theme.name] = []
        tagSet = Set()
        for tag in theme.tags.all():
            tagSet.add(tag.content)
        for tag in tagSet:
            print tag
            context['tag_theme'][str(theme.name)].append(str(tag))
    return render(request, 'index_dashboard.html', context)

def tag_theme(request):
    print "tag_theme"
    forum = Forum.objects.get(id=request.session['forum_id'])
    action = request.REQUEST.get('action')
    print "action", action
    if (action=="save_tag_theme_change"):
        print "save_tag_theme_change"
        tagThemeDic = request.REQUEST.get('tagthemedic')
        try:
            dic = json.loads(tagThemeDic)
            for theme in dic:
                print "theme=", theme
                claimTheme, created = ClaimTheme.objects.get_or_create(forum_id=request.session['forum_id'], name=theme)
                for item in dic[theme]:
                    tags = Tag.objects.filter(content=item)
                    for tag in tags:
                        tag.claimTheme = claimTheme
                        tag.save()
        except:
            print "except"
    return HttpResponse()