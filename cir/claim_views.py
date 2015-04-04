import json

from django.template.loader import render_to_string
from django.http import HttpResponse
from django.utils import timezone

from cir.models import *

def api_get_claim(request):
    response = {}
    action = request.REQUEST.get('action')
    forum = Forum.objects.get(id=request.session['forum_id'])
    context = {}
    claims = Claim.objects.filter(forum=forum, published=True)
    if request.user.is_authenticated():
        claims = claims | Claim.objects.filter(author=request.user, forum=forum, published=False)
    category = request.REQUEST.get('category')
    if category:
        context['category'] = category
        if category == 'undecided':
            claims = claims.filter(claim_category__isnull=True)
        else:
            claims = claims.filter(claim_category=category)
    theme = request.REQUEST.get('theme')
    if theme:
        context['theme'] = ClaimTheme.objects.get(id=theme).name
        if theme == 'undecided':
            claims = claims.filter(theme__isnull=True)
        else:
            claims = claims.filter(theme_id=theme)
    context['claims'] = []
    context['claims_cnt'] = len(claims)
    if action == 'get-claim':
        display_type = request.REQUEST.get('display_type')
        if display_type == 'overview':
            context['themes'] = [theme.getAttr() for theme in ClaimTheme.objects.filter(forum=forum)]
            for claim in claims:
                context['claims'].append(claim.getAttr(forum))
            context['claims'] = sorted(context['claims'], key=lambda claim: claim['updated_at_full'], reverse=True)
            response['html'] = render_to_string("claim-overview.html", context)
        elif display_type == 'fullscreen':
            claim_id = request.REQUEST.get('claim_id')
            if claim_id: # claim_id is known
                context['claim'] = Claim.objects.get(id=claim_id).getAttr(forum)
            else: # just clicked "full-screen review"
                if len(claims):
                    context['claim'] = claims[0].getAttr(forum)
                    response['claim_id'] = context['claim']['id']
            response['html'] = render_to_string("claim-fullscreen.html", context)
    if action == 'navigator':
        for claim in claims:
            context['claims'].append(claim.getExcerpt(forum))
        context['claims'] = sorted(context['claims'], key=lambda claim: claim['updated_at_full'], reverse=True)
        response['html'] = render_to_string("claim-navigator.html", context)
    return HttpResponse(json.dumps(response), mimetype='application/json')

def api_claim(request):
    response = {}
    action = request.REQUEST.get('action')
    if action == 'create':
        if not request.user.is_authenticated():
            return HttpResponse("Please log in first.", status=403)
        highlight = Highlight.objects.get(id=request.REQUEST.get('highlight_id'))
        _add_claim(request, highlight)
    return HttpResponse(json.dumps(response), mimetype='application/json')

def api_claim_activities(request):
    response = {}
    action = request.REQUEST.get('action')
    if action == 'load-thread':
        claim = Claim.objects.get(id=request.REQUEST.get('claim_id'))
        forum = Forum.objects.get(id=request.session['forum_id'])
        highlight = claim.source_highlight
        context = {}
        context['entries'] = []

        # get discussions on the highlight (ignore other claims extracted from the highlight)
        posts = highlight.posts_of_highlight.all()
        for post in posts:
            context['entries'].append(post.getAttr(forum))
        
        # TODO add "suggest revision" "suggest merging" "suggest theme"

        context['entries'] = sorted(context['entries'], key=lambda entry: entry['created_at_full'])
        response['html'] = render_to_string("activity-feed.html", context)
        return HttpResponse(json.dumps(response), mimetype='application/json')


def _add_claim(request, highlight): # by this point user authentication must has been checked
    private = request.REQUEST.get('nopublish')
    content = request.REQUEST.get('content')
    now = timezone.now()
    if private == 'true':
        newClaim = Claim(forum_id=request.session['forum_id'], author=request.user, content=content, created_at=now, updated_at=now, source_highlight=highlight, published=False)
    else:
        newClaim = Claim(forum_id=request.session['forum_id'], author=request.user, content=content, created_at=now, updated_at=now, source_highlight=highlight, published=True)
    newClaim.save()
    return newClaim.id

def _get_claim_votes(user, claim):
    ret = {}
    if not user.is_authenticated():
        for vote_type in ['pro', 'con', 'finding', 'discarded', 'prioritize']:
            votes = claim.voters.filter(vote_type=vote_type).order_by('-created_at')
            ret[vote_type] = [vote.user.get_full_name() for vote in votes]
    else:
        ret['my_votes'] = '|'.join(Vote.objects.filter(entry=claim, user=user).values_list('vote_type', flat=True))
        for vote_type in ['pro', 'con', 'finding', 'discarded', 'prioritize']:
            votes = claim.voters.filter(vote_type=vote_type).order_by('-created_at')
            ret[vote_type] = [vote.user.get_full_name() for vote in votes if vote.user != user]
    return ret

def api_claim_vote(request):
    response = {}
    action = request.REQUEST.get('action')
    if action == 'vote':
        if not request.user.is_authenticated():
            return HttpResponse("Please log in first.", status=403)
        claim = Claim.objects.get(id=request.REQUEST.get('claim_id'))
        unvote = request.REQUEST.get('unvote')
        vote_type = request.REQUEST.get('type')
        if unvote == 'true':
            Vote.objects.filter(user=request.user, entry=claim, vote_type=vote_type).delete()
        else:
            if vote_type == 'pro' or vote_type == 'con' or vote_type == 'finding' or vote_type == 'discarded': # mutual exclusive
                Vote.objects.filter(user=request.user, entry=claim).exclude(vote_type='prioritize').delete()
            Vote.objects.create(user=request.user, entry=claim, vote_type=vote_type, created_at=timezone.now())
        # after voting, return latest votes on the claim
        response['voters'] = _get_claim_votes(request.user, claim)
        return HttpResponse(json.dumps(response), mimetype='application/json')
    if action == 'load_single':
        claim = Claim.objects.get(id=request.REQUEST.get('claim_id'))
        response['voters'] = _get_claim_votes(request.user, claim)
        return HttpResponse(json.dumps(response), mimetype='application/json')
    if action == 'load_all':
        claims = Claim.objects.all()
        for claim in claims:
            response[claim.id] = _get_claim_votes(request.user, claim)
        return HttpResponse(json.dumps(response), mimetype='application/json')