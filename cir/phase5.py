import json

from django.template.loader import render_to_string
from django.http import HttpResponse
from django.utils import timezone
from django.shortcuts import render_to_response

from cir.models import *
import claim_views

from cir.phase_control import PHASE_CONTROL
import utils

def get_statement_comment_list(request):
    response = {}
    context = {}
    forum = Forum.objects.get(id = request.session['forum_id'])
    thread_comments = ForumComment.objects.filter(forum = forum)
    print thread_comments
    context['comments'] = thread_comments
    response['forum_comment'] = render_to_string("phase5/forum-comment.html", context)
    return HttpResponse(json.dumps(response), mimetype='application/json')

def put_statement_comment(request):
    response = {}
    context = {}
    author = request.user
    parent_id = request.REQUEST.get('parent_id')
    text = request.REQUEST.get('text')
    created_at = timezone.now()
    forum = Forum.objects.get(id = request.session['forum_id'])
    if parent_id == "": #root node
        newForumComment = ForumComment(author = author, text = text, forum = forum, created_at = created_at)
    else:
        parent = ForumComment.objects.get(id = parent_id)
        newForumComment = ForumComment(author = author, text = text, forum = forum, parent = parent, created_at = created_at)
    newForumComment.save()
    return HttpResponse(json.dumps(response), mimetype='application/json')

def vote_issue(request):
    reason = request.REQUEST.get('reason')
    author = request.user
    forum = Forum.objects.get(id = request.session['forum_id'])
    support = True 
    if (request.REQUEST.get('support') == "false"): support = False
    vote, created = ForumVote.objects.get_or_create(forum = forum, author = author)
    vote.reason = reason
    vote.support = support
    vote.save()
    response = {}
    return HttpResponse(json.dumps(response), mimetype='application/json')

def render_support_bar(request):
    author = request.user
    forum = Forum.objects.get(id = request.session['forum_id'])
    response = {}
    response["num_support"] = ForumVote.objects.filter(forum = forum, support = True).count()
    response["num_oppose"] = ForumVote.objects.filter(forum = forum, support = False).count()
    if request.user.is_authenticated():
        response["my_num_support"] = ForumVote.objects.filter(forum = forum, support = True, author = author).count()
        response["my_num_oppose"] = ForumVote.objects.filter(forum = forum, support = False, author = author).count()
    return HttpResponse(json.dumps(response), mimetype='application/json')

def view_vote_result(request):
    author = request.user
    forum = Forum.objects.get(id = request.session['forum_id'])
    response = {}
    context = {}
    context["entries"] = ForumVote.objects.filter(forum = forum)
    response["vote_result_table"] = render_to_string('phase5/vote-result-table.html', context)
    return HttpResponse(json.dumps(response), mimetype='application/json')



from collections import defaultdict
from xml.etree import cElementTree as ET

def etree_to_dict(t):
    d = {t.tag: {} if t.attrib else None}
    children = list(t)
    if children:
        dd = defaultdict(list)
        for dc in map(etree_to_dict, children):
            for k, v in dc.items():
                dd[k].append(v)
        d = {t.tag: {k:v[0] if len(v) == 1 else v for k, v in dd.items()}}
    if t.attrib:
        d[t.tag].update(('@' + k, v) for k, v in t.attrib.items())
    if t.text:
        text = t.text.strip()
        if children or t.attrib:
            if text:
              d[t.tag]['#text'] = text
        else:
            d[t.tag] = text
    return d

def get_glossary(request):
    glossary = []
    forum = Forum.objects.get(id = request.session['forum_id'])
    if (Glossary.objects.filter(forum = forum).exists()):
        xml = Glossary.objects.get(forum = forum).xml
        e = ET.XML(xml)
        glossary = etree_to_dict(e)['additionalinformation']['nugget']
    key = request.REQUEST.get('key')
    desc = "No description."
    for item in glossary:
        if (''.join(ch for ch in item["title"] if ch.isalnum())).lower() == (''.join(ch for ch in key if ch.isalnum())).lower():
            desc = item["description"]
    response = {}
    response["desc"] = desc
    return HttpResponse(json.dumps(response), mimetype='application/json')