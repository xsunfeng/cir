import json
from sets import Set

from django.template.loader import render_to_string
from django.shortcuts import render
from django.http import HttpResponse
from django.utils import timezone
from django.db.models import Q

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
        return render(request, 'facilitation/index_dashboard.html', context)
    request.session['forum_id'] = forum.id
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
    context['stmt_preamble'] = forum.stmt_preamble
    context['access_level'] = forum.access_level
    context['phase'] = forum.phase
    # tag theme
    context['tag_theme'] = {}
    
    context['tag_theme']['undecided'] = []
    sections = DocSection.objects.filter(forum=forum.id)
    undecidedTagSet = Set()
    for section in sections:
        tags = Tag.objects.filter(context=section, claimTheme__isnull=True)
        for tag in tags:
            undecidedTagSet.add(tag.content)
    for tag in undecidedTagSet:
        print tag
        context['tag_theme']['undecided'].append(tag)
    for theme in ClaimTheme.objects.filter(forum_id=request.session['forum_id']):
        print theme.name
        context['tag_theme'][theme.name] = []
        tagSet = Set()
        for tag in theme.tags.all():
            tagSet.add(tag.content)
        for tag in tagSet:
            print tag
            context['tag_theme'][theme.name].append(tag)
    return render(request, 'facilitation/index_dashboard.html', context)

def admin_phase(request):
    response = {}
    action = request.REQUEST.get('action')
    forum = Forum.objects.get(id=request.session['forum_id'])
    if action == 'change-phase':
        phase = request.REQUEST.get('phase')
        forum.phase = phase
        forum.save()
        return HttpResponse(json.dumps(response), mimetype='application/json')

def admin_forum(request):
    response = {}
    action = request.REQUEST.get('action')
    forum = Forum.objects.get(id=request.session['forum_id'])
    if action == 'update-forum-info':
        forum.stmt_preamble = request.REQUEST.get('stmt_preamble')
        forum.full_name = request.REQUEST.get('forum_name')
        forum.url = request.REQUEST.get('forum_url')
        forum.description = request.REQUEST.get('description')
        forum.access_level = request.REQUEST.get('access_level')
        forum.save()
        return HttpResponse(json.dumps(response), mimetype='application/json')



def admin_document(request):
    response = {}
    action = request.REQUEST.get('action')
    forum = Forum.objects.get(id=request.session['forum_id'])
    if action == 'get-categories':
        context = {}
        try:
            # retrieve docs in a folder
            folders = EntryCategory.objects.filter(forum=forum, category_type='doc')
            context['folders'] = []
            for folder in folders:
                folder_info = folder.getAttr()
                folder_info['docs'] = []
                docs = Doc.objects.filter(folder=folder)
                for doc in docs:
                    folder_info['docs'].append(doc.getAttr())
                context['folders'].append(folder_info)
            # retrieve docs not in any folder
            context['root_docs'] = []
            root_docs = Doc.objects.filter(forum_id=request.session['forum_id'], folder__isnull=True)
            for doc in root_docs:
                context['root_docs'].append(doc.getAttr())
            response['html'] = render_to_string("facilitation/doc-manager.html", context)
            return HttpResponse(json.dumps(response), mimetype='application/json')
        except:
            return HttpResponse('Unknown error.', status=403)
    elif action == 'new-folder':
        name = request.REQUEST.get('name')
        description = request.REQUEST.get('description')
        EntryCategory.objects.create(forum=forum, name=name, instructions=description, category_type='doc')
        return HttpResponse(json.dumps(response), mimetype='application/json')
    elif action == 'edit-folder':
        folder = EntryCategory.objects.get(id=request.REQUEST.get('folder_id'))
        name = request.REQUEST.get('name')
        description = request.REQUEST.get('description')
        folder.name = name
        folder.instructions = description
        folder.save()
        return HttpResponse(json.dumps(response), mimetype='application/json')
    elif action == 'new-doc':
        title = request.REQUEST.get('title')
        folder_id = request.REQUEST.get('folder_id')
        description = request.REQUEST.get('description')
        if folder_id == '-1': # add to root folder
            Doc.objects.create(forum=forum, title=title, description=description)
        else:
            folder = EntryCategory.objects.get(id=folder_id)
            Doc.objects.create(forum=forum, title=title, description=description, folder=folder)
        return HttpResponse(json.dumps(response), mimetype='application/json')
    elif action == 'get-doc':
        doc_id = request.REQUEST.get('doc_id')
        doc = Doc.objects.get(id=doc_id)
        context = {}
        context['doc_id'] = doc.id
        context['title'] = doc.title
        context['sections'] = []
        ordered_sections = doc.sections.filter(order__isnull=False).order_by('order')
        for section in ordered_sections:
            context['sections'].append(section.getAttrAdmin())
        unordered_sections = doc.sections.filter(order__isnull=True).order_by('updated_at')
        for section in unordered_sections:
            context['sections'].append(section.getAttrAdmin())
        response['html'] = render_to_string("facilitation/doc-content.html", context)
        return HttpResponse(json.dumps(response), mimetype='application/json')
    elif action == 'edit-doc':
        doc = Doc.objects.get(id=request.REQUEST.get('doc_id'))
        title = request.REQUEST.get('title')
        description = request.REQUEST.get('description')
        doc.title = title
        doc.description = description
        doc.save()
        return HttpResponse(json.dumps(response), mimetype='application/json')

    elif action == 'new-docsection':
        now = timezone.now()
        title = request.REQUEST.get('title')
        content = request.REQUEST.get('content')
        doc_id = request.REQUEST.get('doc_id')
        doc = Doc.objects.get(id=doc_id)
        DocSection.objects.create(
            forum=forum,
            author=request.user,
            content=content,
            created_at=now,
            updated_at=now,
            title=title,
            doc=doc
            # leave order blank
        )
        return HttpResponse(json.dumps(response), mimetype='application/json')
    elif action == 'reorder':
        orders = json.loads(request.REQUEST.get('order'))
        for section_id in orders:
            section = DocSection.objects.get(id=section_id)
            section.order = orders[section_id]
            section.save()
        return HttpResponse(json.dumps(response), mimetype='application/json')
    elif action == 'delete-item':
        item_type = request.REQUEST.get('item_type')
        item_id = request.REQUEST.get('item_id')
        if item_type == 'folder':
            EntryCategory.objects.get(id=item_id).delete()
        elif item_type == 'doc':
            Doc.objects.get(id=item_id).delete()
        elif item_type == 'docsection':
            DocSection.objects.get(id=item_id).delete()
        return HttpResponse(json.dumps(response), mimetype='application/json')

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
                if (theme!="undecided"):
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

def user_mgmt(request):
    response = {}
    forum = Forum.objects.get(id=request.session['forum_id'])
    action = request.REQUEST.get('action')
    if action == 'get_user_list':
        context = {}
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
        context['user_id'] = request.user.id
        context['user_name'] = request.user.get_full_name()
        response['html'] = render_to_string('header/user_switch_menu.html', context)
    return HttpResponse(json.dumps(response), mimetype='application/json')
