import json

from django.template.loader import render_to_string
from django.http import HttpResponse
from django.utils import timezone
from django.db.models import Q

from cir.models import *

def api_get_claim(request):
    response = {}
    action = request.REQUEST.get('action')
    forum = Forum.objects.get(id=request.session['forum_id'])
    context = {}
    claims = Claim.objects.filter(forum=forum, is_deleted=False, published=True)
    if request.user.is_authenticated():
        claims = claims | Claim.objects.filter(author=request.user, forum=forum, is_deleted=False, published=False)
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
        context['themes'] = [theme.getAttr() for theme in ClaimTheme.objects.filter(forum=forum)]
        if display_type == 'overview':
            for claim in claims:
                context['claims'].append(claim.getAttr(forum))
            context['claims'] = sorted(context['claims'], key=lambda c: c['updated_at_full'], reverse=True)
            response['html'] = render_to_string("claim-overview.html", context)
        elif display_type == 'fullscreen':
            claim_id = request.REQUEST.get('claim_id')
            if claim_id: # claim_id is known
                # claim_version = Claim.objects.get(id=claim_id).versions.get(is_adopted=True)
                context['claim'] = Claim.objects.get(id=claim_id).getAttr(forum)
            else: # just clicked "full-screen review"
                if len(claims):
                    context['claim'] = claims[0].versions.get(is_adopted=True).getAttr(forum)
                    response['claim_id'] = context['claim']['id']
            response['html'] = render_to_string("claim-fullscreen.html", context)
    if action == 'navigator':
        for claim in claims:
            context['claims'].append(claim.getExcerpt(forum))
        context['claims'] = sorted(context['claims'], key=lambda c: c['updated_at_full'], reverse=True)
        response['html'] = render_to_string("claim-navigator.html", context)
    return HttpResponse(json.dumps(response), mimetype='application/json')

def api_claim(request):
    response = {}
    action = request.REQUEST.get('action')
    if not request.user.is_authenticated():
        return HttpResponse("Please log in first.", status=403)
    if action == 'create':
        highlight = Highlight.objects.get(id=request.REQUEST.get('highlight_id'))
        _add_claim(request, highlight)
    elif action == 'update':
        _edit_claim(request)
    elif action == 'delete':
        claim = Claim.objects.get(id=request.REQUEST.get('claim_id'))
        claim.is_deleted = True
        # TODO delete all versions 
        claim.save()
    elif action == 'reword':
        claim = Claim.objects.get(id=request.REQUEST.get('claim_id'))
        content = request.REQUEST.get('content')
        now = timezone.now()
        newClaim = Claim(forum_id=request.session['forum_id'], author=request.user, content=content, created_at=now, updated_at=now, source_highlight=claim.source_highlight, is_adopted=False)
        newClaim.save()
        ClaimReference.objects.create(refer_type='reword', from_claim=claim, to_claim=newClaim)
    elif action == 'adopt':
        old_claim = Claim.objects.get(id=request.REQUEST.get('old_id'))
        new_claim = Claim.objects.get(id=request.REQUEST.get('new_id'))

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
        
        # TODO "suggest merging"
        flags = Vote.objects.filter(entry=claim).filter(Q(vote_type='reword') | Q(vote_type='merge'))
        for flag in flags:
            context['entries'].append(flag.getAttr())
        
        for claim_ref in ClaimReference.objects.filter(from_claim=claim):
            claim_info = claim_ref.to_claim.getAttr(forum)
            claim_info['relation'] = claim_ref.refer_type
            context['entries'].append(claim_info)

        context['entries'] = sorted(context['entries'], key=lambda entry: entry['created_at_full'], reverse=True)
        response['html'] = render_to_string("activity-feed-claim.html", context)
        return HttpResponse(json.dumps(response), mimetype='application/json')

def _edit_claim(request):
    private = request.REQUEST.get('nopublish')
    content = request.REQUEST.get('content')
    now = timezone.now()
    claim = Claim.objects.get(id=request.REQUEST.get('claim_id'))
    if content:
        claim.content = content
    if private == 'false':
        claim.published = True
    claim.updated_at = now
    claim.save()
    return claim

def _add_claim(request, highlight): # by this point user authentication must has been checked
    private = request.REQUEST.get('nopublish')
    content = request.REQUEST.get('content')
    now = timezone.now()
    newClaim = Claim(forum_id=request.session['forum_id'], author=request.user, created_at=now, updated_at=now, source_highlight=highlight)
    newClaim.published = private == 'false'
    newClaim.save()
    claim_version = ClaimVersion(forum_id=request.session['forum_id'], author=request.user, content=content, created_at=now, updated_at=now, claim=newClaim)
    claim_version.save()
    return newClaim

def _get_claim_votes(user, claim_version):
    ret = {}
    if not user.is_authenticated():
        for vote_type in ['pro', 'con', 'finding', 'discarded', 'prioritize']:
            votes = claim_version.events.filter(vote__vote_type=vote_type).order_by('-created_at')
            ret[vote_type] = [vote.user.get_full_name() for vote in votes]
    else:
        ret['my_votes'] = '|'.join(Vote.objects.filter(entry=claim_version, user=user).values_list('vote_type', flat=True))
        for vote_type in ['pro', 'con', 'finding', 'discarded', 'prioritize']:
            votes = claim_version.events.filter(vote__vote_type=vote_type).order_by('-created_at')
            ret[vote_type] = [vote.user.get_full_name() for vote in votes if vote.user != user]
    return ret

def api_get_flags(request):
    response = {}
    action = request.REQUEST.get('action')
    if action == 'load_single':
        claim = Claim.objects.get(id=request.REQUEST.get('claim_id'))
        all_flags = _get_flags(request, claim, 'reword merge theme')
        response['html'] = render_to_string("claim-tags.html", all_flags)
        return HttpResponse(json.dumps(response), mimetype='application/json')
    if action == 'load_all':
        forum = Forum.objects.get(id=request.session['forum_id'])
        claims = Claim.objects.filter(forum=forum, is_deleted=False, published=True)
        for claim in claims:
            response[claim.id] = render_to_string("claim-tags.html", _get_flags(request, claim, 'reword merge theme'))
        return HttpResponse(json.dumps(response), mimetype='application/json')

def _get_flags(request, claim, action): # TODO claim_Version, rather.
    ret = {}
    ret['claim_id'] = claim.id
    if 'reword' in action:
        reword_people = [vote.user.get_full_name() for vote in claim.events.filter(vote__vote_type='reword')]
        ret['reword'] = {
            'reword_people': ', '.join(reword_people),
            'reword_cnt': len(reword_people),
            'i_voted': request.user in [vote.user for vote in claim.events.filter(vote__vote_type='reword')]
        }
    if 'theme' in action:
        forum = Forum.objects.get(id=request.session['forum_id'])
        ret['themes'] = []
        for theme in ClaimTheme.objects.filter(forum=forum):
            people = [themeassignment.user.get_full_name() for themeassignment in claim.events.filter(themeassignment__theme=theme)]
            ret['themes'].append({
                'id': theme.id,
                'theme_name': theme.name,
                'assignment_people': ', '.join(people),
                'assignment_cnt': len(people),
                'i_voted': request.user in [themeassignment.user for themeassignment in claim.events.filter(themeassignment__theme=theme)]
            })
    return ret

def api_claim_flag(request):
    response = {}
    if not request.user.is_authenticated():
        return HttpResponse("Please log in first.", status=403)
    action = request.REQUEST.get('action')
    claim = Claim.objects.get(id=request.REQUEST.get('claim_id'))
    context = {}
    if action == 'flag':
        flag_type = request.REQUEST.get('flag_type')
        deflag = request.REQUEST.get('deflag')
        Vote.objects.filter(user=request.user, entry=claim, vote_type=flag_type).delete()
        if deflag == 'false':
            if flag_type == 'reword':
                # TODO add a reason
                # TODO vote should be targetted at claim version
                Vote.objects.create(user=request.user, entry=claim, created_at=timezone.now(), vote_type='reword')
        response['html'] = render_to_string("claim-tags.html", _get_flags(request, claim, 'reword'))
        return HttpResponse(json.dumps(response), mimetype='application/json')
    if action == 'theme':
        theme = ClaimTheme.objects.get(id=request.REQUEST.get('theme_id'))
        detheme = request.REQUEST.get('detheme')
        ThemeAssignment.objects.filter(user=request.user, entry=claim, theme=theme).delete()
        if detheme == 'false':
            ThemeAssignment.objects.create(user=request.user, entry=claim, created_at=timezone.now(), theme=theme)
        response['html'] = render_to_string("claim-tags.html", _get_flags(request, claim, 'theme'))
        return HttpResponse(json.dumps(response), mimetype='application/json')

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
                for v in ['pro', 'con', 'finding', 'discarded']:
                    Vote.objects.filter(user=request.user, entry=claim, vote_type=v).delete()
            # TODO vote should be targetted at claim version
            Vote.objects.create(user=request.user, entry=claim, vote_type=vote_type, created_at=timezone.now())
        # after voting, return latest votes on the claim
        response['voters'] = _get_claim_votes(request.user, claim.adopted_version())
        return HttpResponse(json.dumps(response), mimetype='application/json')
    if action == 'load_single':
        claim = Claim.objects.get(id=request.REQUEST.get('claim_id'))
        response['voters'] = _get_claim_votes(request.user, claim.adopted_version())
        return HttpResponse(json.dumps(response), mimetype='application/json')
    if action == 'load_all':
        forum = Forum.objects.get(id=request.session['forum_id'])
        claims = Claim.objects.filter(forum=forum, is_deleted=False, published=True)
        for claim in claims:
            response[claim.id] = _get_claim_votes(request.user, claim.adopted_version())
        return HttpResponse(json.dumps(response), mimetype='application/json')