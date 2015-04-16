import json
from htmlentitydefs import name2codepoint

from django.template.loader import render_to_string
from django.http import HttpResponse
from django.utils import timezone

from cir.models import *
import claim_views

def api_doc(request):
    response = {}
    action = request.REQUEST.get('action')
    if action == 'get-categories':
        context = {}
        try:
            context['forum_name'] = Forum.objects.get(id=request.session['forum_id']).full_name
            # retrieve docs in a folder
            folders = EntryCategory.objects.filter(forum_id=request.session['forum_id'], category_type='doc')
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
            response['html'] = render_to_string("doc-category.html", context)
            return HttpResponse(json.dumps(response), mimetype='application/json')
        except:
            return HttpResponse('Unknown error.', status=403)
    if action == 'get-document':
        doc_id = request.REQUEST.get('doc_id')
        try:
            doc = Doc.objects.get(id=doc_id)
            ordered_sections = doc.sections.filter(order__isnull=False).order_by('order')
            unordered_sections = doc.sections.filter(order__isnull=True).order_by('updated_at')
            context = {}
            context['title'] = doc.title
            context['sections'] = []
            for section in ordered_sections | unordered_sections:
                context['sections'].append(section.getAttr())
            response['html'] = render_to_string("doc-content.html", context)
            return HttpResponse(json.dumps(response), mimetype='application/json')
        except:
            return HttpResponse('The document does not exist.', status=403)

def api_highlight(request):
    response = {}
    action = request.REQUEST.get('action')
    if action == 'create':
        if not request.user.is_authenticated():
            return HttpResponse("Please log in first.", status=403)
        content = request.REQUEST.get('content')
        content_type = request.REQUEST.get('type')
        start = request.REQUEST.get('start')
        end = request.REQUEST.get('end')
        context_id = request.REQUEST.get('contextId')
        # create highlight object
        context = Entry.objects.get(id=context_id)
        highlight = Highlight(start_pos=start, end_pos=end, context=context)
        highlight.save()
        response['highlight_id'] = highlight.id
        # then create the content
        now = timezone.now()
        if 'actual_user_id' in request.session:
            actual_author = User.objects.get(id=request.session['actual_user_id'])
        else:
            actual_author = None
        if content_type == 'comment':
            if actual_author:
                Post.objects.create(forum_id=request.session['forum_id'], author=actual_author, delegator=request.user, content=content, created_at=now, updated_at=now, highlight=highlight, content_type='comment')
            else:
                Post.objects.create(forum_id=request.session['forum_id'], author=request.user, content=content, created_at=now, updated_at=now, highlight=highlight, content_type='comment')
        elif content_type == 'question':
            if actual_author:
                Post.objects.create(forum_id=request.session['forum_id'], author=actual_author, delegator=request.user, content=content, created_at=now, updated_at=now, highlight=highlight, content_type='question')
            else:
                Post.objects.create(forum_id=request.session['forum_id'], author=request.user, content=content, created_at=now, updated_at=now, highlight=highlight, content_type='question')
        elif content_type == 'claim':
            claim_views._add_claim(request, highlight)
        return HttpResponse(json.dumps(response), mimetype='application/json')
    if action == 'load-doc':
        doc_id = request.REQUEST.get('doc_id')
        doc = Doc.objects.get(id=doc_id)
        response['highlights'] = []
        for section in doc.sections.all():
            highlights = section.highlights.all()
            for highlight in highlights:
                response['highlights'].append(highlight.getAttr())
        return HttpResponse(json.dumps(response), mimetype='application/json')

def api_annotation(request):
    response = {}
    action = request.REQUEST.get('action')
    if action == 'load-thread':
        forum = Forum.objects.get(id=request.session['forum_id'])
        highlight_id = request.REQUEST.get('highlight_id')
        highlight = Highlight.objects.get(id=highlight_id)
        context = {}
        context['entries'] = []
        posts = highlight.posts_of_highlight.all()
        for post in posts:
            context['entries'].append(post.getAttr(forum))
        claims = highlight.claims_of_highlight.all()
        for claim in claims:
            context['entries'].append(claim.getAttr(forum))
        context['entries'] = sorted(context['entries'], key=lambda entry: entry['created_at_full'], reverse=True)
        response['html'] = render_to_string("activity-feed-doc.html", context)
        return HttpResponse(json.dumps(response), mimetype='application/json')
    if action == 'create':
        if not request.user.is_authenticated():
            return HttpResponse("Please log in first.", status=403)
        if 'actual_user_id' in request.session:
            actual_author = User.objects.get(id=request.session['actual_user_id'])
        else:
            actual_author = None
        content = request.REQUEST.get('content')
        # need to know either highlight_id, or claim_id
        highlight_id = request.REQUEST.get('highlight_id')
        collective = request.REQUEST.get('collective')
        if collective == 'true':
            collective = True
        else:
            collective = False
        target = None
        if not highlight_id:
            claim = Claim.objects.get(id=request.REQUEST.get('claim_id'))
            if claim.source_highlight: # merged claim doesn't have one
                highlight_id = Claim.objects.get(id=request.REQUEST.get('claim_id')).source_highlight.id
            else:
                target = claim
        reply_id = request.REQUEST.get('reply_id', '')
        now = timezone.now()
        if len(reply_id) == 0:
            if actual_author:
                Post.objects.create(forum_id=request.session['forum_id'], author=actual_author, delegator=request.user, content=content, created_at=now, updated_at=now, target=target, highlight_id=highlight_id, collective=collective, content_type='comment')
            else:
                Post.objects.create(forum_id=request.session['forum_id'], author=request.user, content=content, created_at=now, updated_at=now, target=target, highlight_id=highlight_id, collective=collective, content_type='comment')
        else:
            # TODO allow replying other types of entities
            if actual_author:
                Post.objects.create(forum_id=request.session['forum_id'], author=actual_author, delegator=request.user, content=content, created_at=now, updated_at=now, target=target, highlight_id=highlight_id, parent_id=reply_id, collective=collective, content_type='comment')
            else:
                Post.objects.create(forum_id=request.session['forum_id'], author=request.user, content=content, created_at=now, updated_at=now, target=target, highlight_id=highlight_id, parent_id=reply_id, collective=collective, content_type='comment')
        return HttpResponse(json.dumps(response), mimetype='application/json')
    if action == 'delete':
        entry_id = request.REQUEST.get('entry_id')
        post = Post.objects.get(id=entry_id)
        post.is_deleted = True
        post.save()
        return HttpResponse(json.dumps(response), mimetype='application/json')

