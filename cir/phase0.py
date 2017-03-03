import json

from django.template.loader import render_to_string
from django.http import HttpResponse
from django.utils import timezone
from django.shortcuts import render_to_response

from cir.models import *
import claim_views

from cir.phase_control import PHASE_CONTROL
import utils

def update_statement_questions(request):
    response = {}    
    forum = Forum.objects.get(id = request.session['forum_id'])
    context = {}
    # for all actions, return updated lists
    if request.REQUEST.get('category'):
        category_list = [request.REQUEST['category']]
    else:
        category_list = ['finding', 'pro', 'con']
    context['categories'] = {}
    response['slots_cnt'] = {'finding': 0, 'pro': 0, 'con': 0}
    slots = Claim.objects.filter(forum=forum, is_deleted=False, stmt_order__isnull=False)
    for category in category_list:
        context['categories'][category] = [slot.getAttrSlot(forum) for slot in slots.filter(claim_category=category).order_by('stmt_order')]
        response['slots_cnt'][category] += len(context['categories'][category])
    response['html'] = render_to_string('phase0/statement-questions.html', context)
    return HttpResponse(json.dumps(response), mimetype='application/json')

def get_statement_comment_list(request):
    response = {}
    context = {}
    slot_id = request.REQUEST.get("slot_id")
    this_slot = Claim.objects.get(id = slot_id)
    forum = Forum.objects.get(id = request.session['forum_id'])
    context["slot_info"] = this_slot.getAttrSlot(forum)
    thread_comments = StatementQuestionComment.objects.filter(statement_question = this_slot)
    context['comments'] = thread_comments
    context['slot'] = this_slot
    response['unread_comments'] = []
    for r in IsReadStatementQuestionComment.objects.filter(question_id = slot_id, reader = request.user, is_read = False):
        response['unread_comments'].append(r.comment.id)
        r.is_read = True
        r.save()
    statement_comments = []
    for claim_version in this_slot.versions.all():
        for comment in StatementComment.objects.filter(claim_version = claim_version):
            item = {}
            user = comment.author
            item["user_id"] = user.id
            item["created_at"] = utils.pretty_date(comment.created_at)
            item["content"] = comment.text
            item["role"] = ""
            if user.role.filter(forum = forum).exists():
                item["role"] = user.role.filter(forum = forum)[0].role
            item["user_name"] = user.first_name + " " + user.last_name
            item["id"] = comment.id
            item["timestamp"] = comment.created_at.strftime("%s")
            item["slot_id"] = claim_version.claim.id
            item["statement_id"] = claim_version.id
            statement_comments.append(item)
    context["statement_comments"] = sorted(statement_comments, key=lambda item: item['timestamp'], reverse=True)
    response['statement_comment_list'] = render_to_string("phase0/statement-comment-list.html", context)
    return HttpResponse(json.dumps(response), mimetype='application/json')

def put_statement_comment(request):
    response = {}
    context = {}
    author = request.user
    parent_id = request.REQUEST.get('parent_id')
    slot_id = request.REQUEST.get('slot_id')
    text = request.REQUEST.get('text')
    created_at = timezone.now()
    slot = Claim.objects.get(id = slot_id)
    if parent_id == "": #root node
        newStatementQuestionComment = StatementQuestionComment(author = author, text = text, statement_question = slot, created_at = created_at)
    else:
        parent = StatementQuestionComment.objects.get(id = parent_id)
        newStatementQuestionComment = StatementQuestionComment(author = author, text = text, statement_question = slot, parent = parent, created_at = created_at)
    newStatementQuestionComment.save()
    forum = Forum.objects.get(id = request.session['forum_id'])
    for role in Role.objects.filter(forum = forum):
        user = role.user
        if (user != author):
            IsReadStatementQuestionComment.objects.create(
                comment = newStatementQuestionComment, 
                reader = user,
                question = slot,
                is_read = False)
    return HttpResponse(json.dumps(response), mimetype='application/json')