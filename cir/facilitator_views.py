import json

from django.template.loader import render_to_string
from django.shortcuts import render
from django.http import HttpResponse
from django.utils import timezone

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
    context['access_level'] = forum.access_level
    context['phase'] = forum.phase
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