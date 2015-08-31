import json

from django.template.loader import render_to_string
from django.http import HttpResponse
from django.utils import timezone
from django.core.exceptions import ObjectDoesNotExist
from django.core import serializers
from django.db.models import Count, Avg

from cir.models import *
import claim_views

def api_doc(request):
    response = {}
    action = request.REQUEST.get('action')
    forum = Forum.objects.get(id=request.session['forum_id'])
    if action == 'get-categories':
        context = {}
        try:
            context['forum_name'] = forum.full_name
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
        # try:
        doc = Doc.objects.get(id=doc_id)
        ordered_sections = doc.sections.filter(order__isnull=False).order_by('order')
        unordered_sections = doc.sections.filter(order__isnull=True).order_by('updated_at')
        context = {}
        context['forum_phase'] = forum.phase
        context['title'] = doc.title
        context['sections'] = []
        for section in ordered_sections | unordered_sections:
            sectionatt = section.getAttr()
            # get all tags associated with current section
            sectionatt['tagF']=tag_sections([section.id])
            # only get my own section
            hLights = section.highlights.all()
            tagPosition = TagPosition.objects.filter(highlight__in=hLights)
            # calculate number of authors that tag the present section
            allTagPosUser = TagPosUser.objects.filter(tagPos__in=tagPosition)
            help={}
            countAuthors = 0
            for item in allTagPosUser:
                if item.author not in help:
                    countAuthors +=1
                    help[item.author] = 1
            print "########"
            sectionatt['countAuthors'] = len(help)
            tagPosUser = TagPosUser.objects.filter(tagPos__in=tagPosition, author=request.user.id)
            help={}
            for item in tagPosUser:
                key = str(item.tagPos.tag.id)
                if key in help:
                    help[key] += 1
                else:
                    help[key] = 1
            ret = []
            for item2 in help:
                tmp = {}
                tmp['tag'] = item2
                tmp['id__count'] = help[item2]
                ret.append(tmp)
            sectionatt['tagMyF']=ret
            context['sections'].append(sectionatt)
        response['html'] = render_to_string("doc-content.html", context)
        return HttpResponse(json.dumps(response), mimetype='application/json')
        # except:
        #     return HttpResponse('The document does not exist.', status=403)

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
                Post.objects.create(forum_id=request.session['forum_id'], author=actual_author, delegator=request.user,
                    content=content, created_at=now, updated_at=now, highlight=highlight, content_type='comment')
            else:
                Post.objects.create(forum_id=request.session['forum_id'], author=request.user, content=content,
                    created_at=now, updated_at=now, highlight=highlight, content_type='comment')
        elif content_type == 'question':
            if actual_author:
                Post.objects.create(forum_id=request.session['forum_id'], author=actual_author, delegator=request.user,
                    content=content, created_at=now, updated_at=now, highlight=highlight, content_type='question')
            else:
                Post.objects.create(forum_id=request.session['forum_id'], author=request.user, content=content,
                    created_at=now, updated_at=now, highlight=highlight, content_type='question')
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
    if action == 'load-doc-by-individual':
        doc_id = request.REQUEST.get('doc_id')
        doc = Doc.objects.get(id=doc_id)
        response['highlights'] = []
        for section in doc.sections.all():
            claims = Claim.objects.filter(author=request.user)
            for claim in claims:
                print str(claim.source_highlight)
                if(claim.source_highlight!=None):
                    response['highlights'].append(claim.source_highlight.getAttr())
        return HttpResponse(json.dumps(response), mimetype='application/json')
    if action == 'delete':
        response = {}
        response['tags'] = []
        highlight_id = request.REQUEST.get('highlight_id')
        response['highlight_id'] = highlight_id
        print highlight_id
        try:
            tagPositions = TagPosition.objects.filter(highlight=highlight_id)
            for tagPosition in tagPositions:
                print tagPosition.tag.id
                response['tags'].append(tagPosition.tag.id)
            highlight = Highlight.objects.get(id=highlight_id)
            highlight.delete()
            print "deleted"
        except ObjectDoesNotExist:
            print "does not exist"
        return HttpResponse(json.dumps(response), mimetype='application/json')
    if action == 'show-tag':
        response = {}
        response['tags'] = []
        highlight_id = request.REQUEST.get('highlight_id')
        response['highlight_id'] = highlight_id
        print highlight_id
        try:
            tagPositions = TagPosition.objects.filter(highlight=highlight_id)
            for tagPosition in tagPositions:
                print tagPosition.tag.id
                response['tags'].append(tagPosition.tag.id)
        except ObjectDoesNotExist:
            print ""
        return HttpResponse(json.dumps(response), mimetype='application/json')


def api_tag_input(request):
    print "api_tag_input"
    response = {}
    action = request.REQUEST.get('action')
    print request.REQUEST
    print action
    if action == 'create':
        if not request.user.is_authenticated():
            return HttpResponse("Please log in first.", status=403)
        
        content_tags = request.REQUEST.get('tagcontent')
        content_tags = json.loads(content_tags)
        response['tags'] = []
        for item in content_tags:
            tag = item["name"]
            tag.encode('utf8')
            response['tags'].append(tag)
        print "content tags are", content_tags, len(content_tags)
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
        # if 'actual_user_id' in request.session:
        #     actual_author = User.objects.get(id=request.session['actual_user_id'])
        # else:
        #     actual_author = None
            
        for ctag in content_tags:
            # if actual_author:
            print "enter, ctag is ", ctag, 'id is ',ctag['name']
            try:
                tobj = Tag.objects.get(id=ctag['name'])##seems not very efficient
                tPos = TagPosition(tag=tobj, highlight=highlight)
                tPos.save()
                TPU = TagPosUser(tagPos=tPos, author=request.user, created_at=now)
                TPU.save()
            except ObjectDoesNotExist:
                print "new tag entering"
                tagTheme, created = TagTheme.objects.get_or_create(forum_id=request.session['forum_id'], name="unassigned", description="tags not assigned")
                print "tag name"
                print tagTheme.name
                tobj = Tag(id=ctag['name'], tagTheme=tagTheme)
                tobj.save()
                tPos = TagPosition(tag=tobj,  highlight=highlight)
                tPos.save()
                TPU = TagPosUser(tagPos=tPos, author=request.user, created_at=now)
                TPU.save()
        return HttpResponse(json.dumps(response), mimetype='application/json')
    # as candidate when constructing new tags
    if action == 'load-individual-tag':
        response['result'] = []
        tagPosUser = TagPosUser.objects.filter(author=request.user)
        for item in tagPosUser:
            print str(item.tagPos.tag.id)
            response['result'].append(item.tagPos.tag.id);
        return HttpResponse(json.dumps(response), mimetype='application/json')
    if action == 'load-others-tag':
        response['result'] = []
        tagPosUser = TagPosUser.objects.exclude(author=request.user)
        for item in tagPosUser:
            print str(item.tagPos.tag.id)
            response['result'].append(item.tagPos.tag.id);
        return HttpResponse(json.dumps(response), mimetype='application/json')
    # if action == 'load-my-tag':
    #     forum = Forum.objects.get(id=request.session['forum_id'])
    #     print "load-my-tag"
    #     doc_id = request.REQUEST.get('doc_id')
    #     doc = Doc.objects.get(id=doc_id)
    #     context = {}
    #     context['forum_phase'] = forum.phase
    #     context['title'] = doc.title
    #     context['sections'] = []
    #     ordered_sections = doc.sections.filter(order__isnull=False).order_by('order')
    #     unordered_sections = doc.sections.filter(order__isnull=True).order_by('updated_at')
    #     for section in ordered_sections | unordered_sections:
    #         print "section:", section.id
    #         sectionatt = section.getAttr()
    #         hLights = section.highlights.all()
    #         tagPosition = TagPosition.objects.filter(highlight__in=hLights)
    #         tagPosUser = TagPosUser.objects.filter(tagPos__in=tagPosition, author=request.user)
    #         help={}
    #         for item in tagPosUser:
    #             key = str(item.tagPos.tag.id)
    #             if key in help:
    #                 help[key] += 1
    #             else:
    #                 help[key] = 1
    #         ret = []
    #         for item2 in help:
    #             tmp = {}
    #             tmp['tag'] = item2
    #             tmp['id__count'] = help[item2]
    #             ret.append(tmp)
    #         sectionatt['tagF']=ret
    #         context['sections'].append(sectionatt)
    #     response['html'] = render_to_string("doc-content.html", context)
    #     return HttpResponse(json.dumps(response), mimetype='application/json') 

def api_annotation(request):
    response = {}
    action = request.REQUEST.get('action')
    if action == 'load-thread':
        forum = Forum.objects.get(id=request.session['forum_id'])
        highlight_id = request.REQUEST.get('highlight_id')
        highlight = Highlight.objects.get(id=highlight_id)
        context = {}
        context['forum_phase'] = forum.phase
        context['entries'] = []
        posts = highlight.posts_of_highlight.all()
        for post in posts:
            for comment in post.getTree():
                context['entries'].append(comment.getAttr(forum))
        claims = highlight.claims_of_highlight.all()
        for claim in claims:
            context['entries'].append(claim.getAttr(forum))
        context['entries'] = sorted(context['entries'], key=lambda entry: entry['created_at_full'], reverse=True)
        response['html'] = render_to_string("activity-feed-doc.html", context)
        return HttpResponse(json.dumps(response), mimetype='application/json')
    if action == 'create':
        if not request.user.is_authenticated():
            return HttpResponse("Please log in first.", status=403)
        now = timezone.now()
        newPost = Post(forum_id=request.session['forum_id'], content_type='comment', created_at=now, updated_at=now)
        if 'actual_user_id' in request.session:
            newPost.author = User.objects.get(id=request.session['actual_user_id'])
            newPost.delegator = request.user
        else:
            newPost.author = request.user
        newPost.content = request.REQUEST.get('content')
        reply_type = request.REQUEST.get('reply_type')
        if reply_type:  # replying another post, or event
            reply_id = request.REQUEST.get('reply_id')
            if reply_type == 'event':
                event = Event.objects.get(id=reply_id)
                newPost.target_event = event
            elif reply_type == 'entry':
                entry = Entry.objects.get(id=reply_id)
                newPost.target_entry = entry
        else:  # targeting at a highlight or a claim
            source = request.REQUEST.get('type')
            if source == 'highlight':
                highlight = Highlight.objects.get(id=request.REQUEST.get('highlight_id'))
                newPost.highlight = highlight
            elif source == 'claim':
                claim = Claim.objects.get(id=request.REQUEST.get('claim_id'))
                newPost.target_entry = claim
        collective = request.REQUEST.get('collective')
        if collective == 'true':
            newPost.collective = True
        else:
            newPost.collective = False
        newPost.save()
        return HttpResponse(json.dumps(response), mimetype='application/json')
    if action == 'delete':
        entry_id = request.REQUEST.get('entry_id')
        now = timezone.now()
        post = Post.objects.get(id=entry_id)
        post.is_deleted = True
        post.updated_at = now
        post.save()
        return HttpResponse(json.dumps(response), mimetype='application/json')

def api_tagFrequency(request):
    response={}
    sections = request.REQUEST.get('sections')
    print sections, type(sections)
    tmp=json.loads(sections)
    print tmp, type(tmp),len(tmp)
    response['data'] = tag_sections(tmp)
    return HttpResponse(json.dumps(response), mimetype='application/json')

def api_tagbling(request):
    response = {}
    response['highlights']=[]
    tag = request.REQUEST.get('tag')
    individual_tag = request.REQUEST.get('individual_tag')
    if individual_tag == "true":       
        # print "individual_tag"
        tobj = Tag.objects.get(id=tag)##seems not very efficient
        tPos = TagPosition.objects.filter(tag=tobj)
        for item in tPos:
            # print "item=",item
            for author in item.authors.all():
                # print "author=",author
                if author==request.user:
                    # print "highlight=",item.highlight
                    response['highlights'].append(item.highlight.getAttr())
        return HttpResponse(json.dumps(response), mimetype='application/json')
    else:
        # print "Not individual_tag"
        tobj = Tag.objects.get(id=tag)
        ths = tobj.highlight.all()
        # print ths
        for th in ths:
            # print "inloop:",th
            response['highlights'].append(th.getAttr())
        return HttpResponse(json.dumps(response), mimetype='application/json')

def tag_nav(request):
    print "tag_nav"
    forum = Forum.objects.get(id=request.session['forum_id'])
    action = request.REQUEST.get('action')
    # print "action", action
    response = {}
    if (action=="show_tag"):
        # print "show_tag_nav"
        context = {}
        context['tag_theme'] = {}
        try:
            for theme in TagTheme.objects.filter(forum_id=request.session['forum_id']):
                # print "theme=", theme.name
                context['tag_theme'][str(theme.name)] = []
                for tag in theme.tags.all():
                    # print "tag=", tag.id
                    context['tag_theme'][str(theme.name)].append(str(tag.id))
        except:
            print "except"
        response['html'] = render_to_string("tag-nav.html", context)
    if (action=="show_highlight"):
        print "show_highlight"
        tag = request.REQUEST.get('tag')
        response['highlights'] = []
        print tag
        for item in TagPosition.objects.filter(tag=tag):
            highlight={}
            highlight["start_pos"] = item.highlight.start_pos
            highlight["end_pos"] = item.highlight.end_pos
            highlight["context"] = utils.segment_text(item.highlight.context.content)
            highlight["context_id"] = item.highlight.context_id
            response['highlights'].append(highlight);
    return HttpResponse(json.dumps(response), mimetype='application/json')

def ValuesQuerySetToDict(vqs):
    return [item for item in vqs]

# retrive {tagCotent, count} given sections
def tag_sections(sections):
    hLights = Highlight.objects.filter(context__in=sections)
    tagPos = TagPosition.objects.filter(highlight__in=hLights)
    ret = tagPos.values("tag").annotate(Count("id")).order_by("-id__count")
    print "section",sections, "the tags include:", ret
    return ValuesQuerySetToDict(ret)