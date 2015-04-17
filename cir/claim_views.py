import json

from django.template.loader import render_to_string
from django.http import HttpResponse
from django.utils import timezone

from cir.models import *
from cir.utils import pretty_date

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
    context['claims_cnt'] = 0
    if action == 'get-claim':
        display_type = request.REQUEST.get('display_type')
        context['themes'] = [theme.getAttr() for theme in ClaimTheme.objects.filter(forum=forum)]
        if display_type == 'overview':
            for claim in claims:
                context['claims_cnt'] += 1
                context['claims'].append(claim.getAttr(forum))
            context['claims'] = sorted(context['claims'], key=lambda c: c['updated_at_full'], reverse=True)
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
            context['claims_cnt'] += 1
            context['claims'].append(claim.getExcerpt(forum))
        context['claims'] = sorted(context['claims'], key=lambda c: c['updated_at_full'], reverse=True)
        response['html'] = render_to_string("claim-navigator.html", context)
    return HttpResponse(json.dumps(response), mimetype='application/json')

def api_claim(request):
    response = {}
    action = request.REQUEST.get('action')
    if 'actual_user_id' in request.session:
        actual_author = User.objects.get(id=request.session['actual_user_id'])
    else:
        actual_author = None
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
        for version in versions:
            version.is_deleted = True
            version.save()
        claim.save()
    elif action == 'delete version':
        version = ClaimVersion.objects.get(id=request.REQUEST.get('version_id'))
        version.is_deleted = True
        version.save()
    elif action == 'reword':
        claim = Claim.objects.get(id=request.REQUEST.get('claim_id'))
        content = request.REQUEST.get('content')
        collective = request.REQUEST.get('collective')
        now = timezone.now()
        new_version = ClaimVersion(forum_id=request.session['forum_id'], content=content, created_at=now, updated_at=now, is_adopted=False, claim=claim)
        if collective == 'true':
            new_version.collective = True
            # automatically adopt
            current_version = claim.adopted_version()
            current_version.is_adopted = False
            current_version.save()
            new_version.is_adopted = True
            claim.updated_at = now
            claim.save()
        if actual_author:
            new_version.author = actual_author
            new_version.delegator = request.user
        else:
            new_version.author = request.user
        new_version.save()
    elif action == 'merge':
        now = timezone.now()
        content = request.REQUEST.get('content')
        if actual_author:
            newClaim = Claim(forum_id=request.session['forum_id'], author=actual_author, delegator=request.user, created_at=now, updated_at=now)
            newClaim.save()
            ClaimVersion.objects.create(forum_id=request.session['forum_id'], author=actual_author, delegator=request.user, content=content, created_at=now, updated_at=now, claim=newClaim)
        else:
            newClaim = Claim(forum_id=request.session['forum_id'], author=request.user, created_at=now, updated_at=now)
            newClaim.save()
            ClaimVersion.objects.create(forum_id=request.session['forum_id'], author=request.user, content=content, created_at=now, updated_at=now, claim=newClaim)
        claim_ids = request.REQUEST.get('claim_ids').split()
        for claim_id in claim_ids:
            oldClaim = Claim.objects.get(id=claim_id)
            ClaimReference.objects.create(refer_type='merge', from_claim=oldClaim, to_claim=newClaim)
            newClaim.theme = oldClaim.theme
            newClaim.claim_category = oldClaim.claim_category
        newClaim.save()
    elif action == 'change category':
        claim = Claim.objects.get(id=request.REQUEST.get('claim_id'))
        category = request.REQUEST.get('type')
        if category in ['pro', 'con', 'finding', 'discarded']:
            claim.claim_category = category
            claim.save()
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
        # discussions on the claim
        if highlight:
            posts = highlight.posts_of_highlight.all()
        else: # a merged claim doesn't has a source_highlight
            posts = claim.get_comments.all()
        for post in posts:
            context['entries'].append(post.getAttr(forum))
        # suggested rewording
        reword_flags = Vote.objects.filter(entry=claim.adopted_version()).filter(vote_type='reword')
        for flag in reword_flags:
            context['entries'].append(flag.getAttr())
        # suggested merging
        merge_flags = Vote.objects.filter(entry=claim).filter(vote_type='merge')
        for flag in merge_flags:
            context['entries'].append(flag.getAttr())
        # performed rewording
        for version in claim.versions.all():
            if not version.is_adopted: # skip the adopted one
                version_info = version.getAttr(forum)
                context['entries'].append(version_info)
        # performed merging
        for newer_claim in claim.newer_versions.all():
            new_claim = newer_claim.to_claim
            entry = {
                'new_claim_author_id': new_claim.author.id,
                'new_claim_author_name': new_claim.author.get_full_name(),
                'entry_type': 'claim old version',
                'is_merged': new_claim.id,
                'other_old_claims': '.'.join([str(claimref.from_claim.id) for claimref in new_claim.older_versions.all() if claimref.from_claim != claim]),
                'created_at_full': new_claim.created_at,
                'updated_at_full': new_claim.updated_at,
                'updated_at': pretty_date(new_claim.updated_at)
            }
            context['entries'].append(entry)
        if claim.older_versions.all(): # this is a merged one!
            attribute = claim.getAttr(forum)
            attribute['entry_type'] = 'claim new version'
            context['entries'].append(attribute)
        context['entries'] = sorted(context['entries'], key=lambda entry: entry['created_at_full'], reverse=True)
        response['html'] = render_to_string("activity-feed-claim.html", context)
        return HttpResponse(json.dumps(response), mimetype='application/json')

def _edit_claim(request):
    private = request.REQUEST.get('nopublish')
    content = request.REQUEST.get('content')
    now = timezone.now()
    claim = Claim.objects.get(id=request.REQUEST.get('claim_id'))
    if content:
        adopted_version = claim.adopted_version()
        adopted_version.content = content
        adopted_version.updated_at = now
        adopted_version.save()
        claim.updated_at = now
    if private == 'false':
        claim.published = True
    claim.save()
    return claim

def _add_claim(request, highlight): # by this point user authentication must has been checked
    private = request.REQUEST.get('nopublish')
    content = request.REQUEST.get('content')
    now = timezone.now()
    if 'actual_user_id' in request.session:
        actual_author = User.objects.get(id=request.session['actual_user_id'])
    else:
        actual_author = None
    if actual_author:
        newClaim = Claim(forum_id=request.session['forum_id'], author=actual_author, delegator=request.user, created_at=now, updated_at=now, source_highlight=highlight)
    else:
        newClaim = Claim(forum_id=request.session['forum_id'], author=request.user, created_at=now, updated_at=now, source_highlight=highlight)
    newClaim.published = private == 'false'
    newClaim.save()
    if actual_author:
        claim_version = ClaimVersion(forum_id=request.session['forum_id'], author=actual_author, delegator=request.user, content=content, created_at=now, updated_at=now, claim=newClaim)
    else:
        claim_version = ClaimVersion(forum_id=request.session['forum_id'], author=request.user, content=content, created_at=now, updated_at=now, claim=newClaim)
    claim_version.save()
    return newClaim

def _get_claim_votes(user, claim):
    ret = {}
    if not user.is_authenticated():
        for vote_type in ['pro', 'con', 'finding', 'discarded', 'prioritize']:
            votes = claim.events.filter(vote__vote_type=vote_type).order_by('-created_at')
            ret[vote_type] = [vote.user.get_full_name() for vote in votes]
    else:
        ret['my_votes'] = '|'.join(Vote.objects.filter(entry=claim, user=user).values_list('vote_type', flat=True))
        for vote_type in ['pro', 'con', 'finding', 'discarded', 'prioritize']:
            votes = claim.events.filter(vote__vote_type=vote_type).order_by('-created_at')
            ret[vote_type] = [vote.user.get_full_name() for vote in votes if vote.user != user]
    return ret

def _get_version_votes(user, claim_version):
    ret = {}
    if not user.is_authenticated():
        for vote_type in ['like']:
            votes = claim_version.events.filter(vote__vote_type=vote_type).order_by('-created_at')
            ret[vote_type] = [vote.user.get_full_name() for vote in votes]
    else:
        ret['my_votes'] = '|'.join(Vote.objects.filter(entry=claim_version, user=user).values_list('vote_type', flat=True))
        for vote_type in ['like']:
            votes = claim_version.events.filter(vote__vote_type=vote_type).order_by('-created_at')
            ret[vote_type] = [vote.user.get_full_name() for vote in votes if vote.user != user]
    return ret

def api_get_flags(request):
    response = {}
    action = request.REQUEST.get('action')
    if action == 'load_single':
        claim = Claim.objects.get(id=request.REQUEST.get('claim_id'))
        response['version_id'] = claim.adopted_version().id
        response['reword_flags'] = render_to_string("claim-tags.html", _get_flags(request, claim.adopted_version(), 'reword'))
        response['merge_flags'] = render_to_string("claim-tags.html", _get_flags(request, claim, 'merge'))
        response['themes'] = render_to_string("claim-tags.html", _get_flags(request, claim, 'theme'))
        return HttpResponse(json.dumps(response), mimetype='application/json')
    if action == 'load_all':
        forum = Forum.objects.get(id=request.session['forum_id'])
        claims = Claim.objects.filter(forum=forum, is_deleted=False, published=True)
        for claim in claims:
            version_id = claim.adopted_version().id
            response[version_id] = {'reword_flags': render_to_string("claim-tags.html", _get_flags(request, claim.adopted_version(), 'reword'))}
            response[claim.id] = {
                'merge_flags': render_to_string("claim-tags.html", _get_flags(request, claim, 'merge')),
                'themes': render_to_string("claim-tags.html", _get_flags(request, claim, 'theme'))
            }
        return HttpResponse(json.dumps(response), mimetype='application/json')

def _get_flags(request, entry, action):
    context = {}
    if 'actual_user_id' in request.session:
        actual_author = User.objects.get(id=request.session['actual_user_id'])
    else:
        actual_author = None
    if 'reword' == action:
        context['version_id'] = entry.id
        reword_people = [vote.user.get_full_name() for vote in entry.events.filter(vote__vote_type='reword', collective=False)] # ignore collective ones
        context['reword'] = {
            'reword_people': ', '.join(reword_people),
            'reword_cnt': len(reword_people),
        }
        if actual_author:
            context['reword']['i_voted'] = actual_author in [vote.user for vote in entry.events.filter(vote__vote_type='reword', collective=False)] # ignore collective ones
        else:
            context['reword']['i_voted'] = request.user in [vote.user for vote in entry.events.filter(vote__vote_type='reword', collective=False)] # ignore collective ones
    if 'merge' == action:
        context['claim_id'] = entry.id
        # must assert that entry has been suggested for merging for only once.
        merged_by = [vote.user.get_full_name() for vote in entry.events.filter(vote__vote_type='merge', collective=False)] # ignore collective ones
        if len(merged_by):
            vote = entry.events.get(vote__vote_type='merge')
            entry_ids = Vote.objects.filter(user=vote.user, created_at=vote.created_at).values_list('entry__id', flat=True)
            context['merge'] = {
                'entry_ids': '.'.join([str(id) for id in entry_ids]),
                'merge_person': vote.user.get_full_name(),
            }
            if actual_author:
                context['merge']['i_voted'] = actual_author == vote.user
            else:
                context['merge']['i_voted'] = request.user == vote.user
    if 'theme' == action:
        context['claim_id'] = entry.id
        forum = Forum.objects.get(id=request.session['forum_id'])
        context['themes'] = []
        for theme in ClaimTheme.objects.filter(forum=forum):
            people = [themeassignment.user.get_full_name() for themeassignment in entry.events.filter(themeassignment__theme=theme)]
            theme_info = {
                'id': theme.id,
                'theme_name': theme.name,
                'assignment_people': ', '.join(people),
                'assignment_cnt': len(people),
            }
            if actual_author:
                theme_info['i_voted'] = actual_author in [themeassignment.user for themeassignment in entry.events.filter(themeassignment__theme=theme)]
            else:
                theme_info['i_voted'] = request.user in [themeassignment.user for themeassignment in entry.events.filter(themeassignment__theme=theme)]
            context['themes'].append(theme_info)
    return context

def api_claim_flag(request):
    response = {}
    if not request.user.is_authenticated():
        return HttpResponse("Please log in first.", status=403)
    action = request.REQUEST.get('action')
    context = {}
    if 'actual_user_id' in request.session:
        actual_author = User.objects.get(id=request.session['actual_user_id'])
    else:
        actual_author = None
    if action == 'flag': # flagging a ClaimVersion
        flag_type = request.REQUEST.get('flag_type') # whether we use claim_id or version_id, it depends on flag_type
        deflag = request.REQUEST.get('deflag')
        now = timezone.now()
        if flag_type == 'reword':
            claim_version = ClaimVersion.objects.get(id=request.REQUEST.get('version_id'))
            collective = request.REQUEST.get('collective')
            reason = request.REQUEST.get('reason')
            if collective == 'true': # impossible to deflag
                if actual_author:
                    Vote.objects.create(user=actual_author, delegator=request.user, entry=claim_version, created_at=now, vote_type='reword', reason=reason, collective=True)
                else:
                    Vote.objects.create(user=request.user, entry=claim_version, created_at=now, vote_type='reword', reason=reason, collective=True)
            else:
                if actual_author:
                    Vote.objects.filter(user=actual_author, entry=claim_version, vote_type=flag_type).delete()
                    if deflag == 'false':
                        Vote.objects.create(user=actual_author, delegator=request.user, entry=claim_version, created_at=now, vote_type='reword', reason=reason)
                else:
                    Vote.objects.filter(user=request.user, entry=claim_version, vote_type=flag_type).delete()
                    if deflag == 'false':
                        Vote.objects.create(user=request.user, entry=claim_version, created_at=now, vote_type='reword', reason=reason)
            response['html'] = render_to_string("claim-tags.html", _get_flags(request, claim_version, 'reword'))
        elif flag_type == 'merge':
            if deflag == 'false':
                claim_ids = request.REQUEST.get('claim_ids').split()
                for claim_id in claim_ids:
                    if actual_author:
                        Vote.objects.create(user=actual_author, delegator=request.user, entry=Claim.objects.get(id=claim_id), created_at=now, vote_type='merge')
                    else:
                        Vote.objects.create(user=request.user, entry=Claim.objects.get(id=claim_id), created_at=now, vote_type='merge')
                # doesn't need to return html -- LoadFlags will be called
            else:
                claim = Claim.objects.get(id=request.REQUEST.get('claim_id'))
                if actual_author:
                    timestamp = Vote.objects.get(user=actual_author, entry=claim, vote_type='merge').created_at
                    Vote.objects.filter(user=actual_author, created_at=timestamp).delete()
                else:
                    timestamp = Vote.objects.get(user=request.user, entry=claim, vote_type='merge').created_at
                    Vote.objects.filter(user=request.user, created_at=timestamp).delete()
                response['html'] = render_to_string("claim-tags.html", _get_flags(request, claim, 'merge'))
        return HttpResponse(json.dumps(response), mimetype='application/json')
    if action == 'theme': # thematizing a Claim
        claim = Claim.objects.get(id=request.REQUEST.get('claim_id'))
        theme = ClaimTheme.objects.get(id=request.REQUEST.get('theme_id'))
        detheme = request.REQUEST.get('detheme')
        if actual_author:
            ThemeAssignment.objects.filter(user=actual_author, entry=claim, theme=theme).delete()
        else:
            ThemeAssignment.objects.filter(user=request.user, entry=claim, theme=theme).delete()
        if detheme == 'false':
            if actual_author:
                ThemeAssignment.objects.create(user=actual_author, delegator=request.user, entry=claim, created_at=timezone.now(), theme=theme)
            else:
                ThemeAssignment.objects.create(user=request.user, entry=claim, created_at=timezone.now(), theme=theme)
        response['html'] = render_to_string("claim-tags.html", _get_flags(request, claim, 'theme'))
        return HttpResponse(json.dumps(response), mimetype='application/json')

def api_claim_vote(request):
    response = {}
    action = request.REQUEST.get('action')
    if 'actual_user_id' in request.session:
        actual_author = User.objects.get(id=request.session['actual_user_id'])
    else:
        actual_author = None
    if action == 'vote':
        if not request.user.is_authenticated():
            return HttpResponse("Please log in first.", status=403)
        # categorizing is targeted at a claim
        claim = Claim.objects.get(id=request.REQUEST.get('claim_id'))
        unvote = request.REQUEST.get('unvote')
        vote_type = request.REQUEST.get('type')
        if unvote == 'true':
            if actual_author:
                Vote.objects.filter(user=actual_author, entry=claim, vote_type=vote_type).delete()
            else:
                Vote.objects.filter(user=request.user, entry=claim, vote_type=vote_type).delete()
        else:
            if vote_type == 'pro' or vote_type == 'con' or vote_type == 'finding' or vote_type == 'discarded': # mutual exclusive
                for v in ['pro', 'con', 'finding', 'discarded']:
                    if actual_author:
                        Vote.objects.filter(user=actual_author, entry=claim, vote_type=v).delete()
                    else:
                        Vote.objects.filter(user=request.user, entry=claim, vote_type=v).delete()
            if actual_author:
                Vote.objects.create(user=actual_author, delegator=request.user, entry=claim, vote_type=vote_type, created_at=timezone.now())
            else:
                Vote.objects.create(user=request.user, entry=claim, vote_type=vote_type, created_at=timezone.now())
        # after voting, return latest votes on the claim
        if actual_author:
            response['voters'] = _get_claim_votes(actual_author, claim)
        else:
            response['voters'] = _get_claim_votes(request.user, claim)
        return HttpResponse(json.dumps(response), mimetype='application/json')
    if action == 'load_single':
        claim = Claim.objects.get(id=request.REQUEST.get('claim_id'))
        if actual_author:
            response['voters'] = _get_claim_votes(actual_author, claim)
        else:
            response['voters'] = _get_claim_votes(request.user, claim)
        return HttpResponse(json.dumps(response), mimetype='application/json')
    if action == 'load_all':
        forum = Forum.objects.get(id=request.session['forum_id'])
        claims = Claim.objects.filter(forum=forum, is_deleted=False, published=True)
        for claim in claims:
            if actual_author:
                response[claim.id] = _get_claim_votes(actual_author, claim)
            else:
                response[claim.id] = _get_claim_votes(request.user, claim)
        return HttpResponse(json.dumps(response), mimetype='application/json')
    if action == 'load version':
        claim_version = ClaimVersion.objects.get(id=request.REQUEST.get('version_id'))
        if actual_author:
            response['voters'] = _get_version_votes(actual_author, claim_version)
        else:
            response['voters'] = _get_version_votes(request.user, claim_version)
        return HttpResponse(json.dumps(response), mimetype='application/json')
    if action == 'like version':
        if not request.user.is_authenticated():
            return HttpResponse("Please log in first.", status=403)
        claim_version = ClaimVersion.objects.get(id=request.REQUEST.get('version_id'))
        unvote = request.REQUEST.get('unvote')
        if actual_author:
            if unvote == 'true':
                Vote.objects.filter(user=actual_author, entry=claim_version, vote_type='like').delete()
            else:
                Vote.objects.create(user=actual_author, delegator=request.user, entry=claim_version, vote_type='like', created_at=timezone.now())
            response['voters'] = _get_version_votes(actual_author, claim_version)
        else:
            if unvote == 'true':
                Vote.objects.filter(user=request.user, entry=claim_version, vote_type='like').delete()
            else:
                Vote.objects.create(user=request.user, entry=claim_version, vote_type='like', created_at=timezone.now())
            response['voters'] = _get_version_votes(request.user, claim_version)
        return HttpResponse(json.dumps(response), mimetype='application/json')