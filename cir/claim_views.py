import json

from django.template.loader import render_to_string
from django.http import HttpResponse
from django.utils import timezone
from django.db.models import Q

from cir.models import *
from cir.utils import pretty_date
from cir.phase_control import PHASE_CONTROL

VISITOR_ROLE = 'visitor'

def api_get_claim(request):
    response = {}
    action = request.REQUEST.get('action')
    forum = Forum.objects.get(id=request.session['forum_id'])
    context = {}
    context['phase'] = PHASE_CONTROL[forum.phase]
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
        if theme == '-1':
            claims = claims.filter(theme__isnull=True)
            context['theme'] = 'Undecided'
        else:
            context['theme'] = ClaimTheme.objects.get(id=theme).name
            claims = claims.filter(theme_id=theme)
    context['claims'] = []
    context['claims_cnt'] = 0
    context['themes'] = [theme.getAttr() for theme in ClaimTheme.objects.filter(forum=forum)]
    if action == 'get-claim':
        display_type = request.REQUEST.get('display_type')
        if display_type == 'overview':
            for claim in claims:
                context['claims_cnt'] += 1
                context['claims'].append(claim.getAttr(forum))
            context['claims'] = sorted(context['claims'], key=lambda c: c['updated_at_full'], reverse=True)
            response['html'] = render_to_string("claim/claim-overview.html", context)
        elif display_type == 'fullscreen':
            # if no claims available, just leave context['claim'] and response['claim_id'] undefined.
            if len(claims) != 0:
                claim_return = claims.reverse()[0]
                old_claim_id = request.REQUEST.get('claim_id')
                # the specified claim may not exist in the current filtered set.
                # if this is the case, return the first claim in the current filtered set.
                if old_claim_id:
                    for claim in claims:
                        if claim.id == int(old_claim_id):
                            claim_return = claim
                            break
                context['claim'] = claim_return.getAttr(forum)
                response['claim_id'] = claim_return.id
            response['html'] = render_to_string("claim/claim-fullscreen.html", context)
    if action == 'navigator':
        for claim in claims:
            context['claims_cnt'] += 1
            context['claims'].append(claim.getExcerpt(forum))
        context['claims'] = sorted(context['claims'], key=lambda c: c['updated_at_full'], reverse=True)
        response['html'] = render_to_string("claim/claim-navigator.html", context)
    return HttpResponse(json.dumps(response), mimetype='application/json')

def api_draft_stmt(request):
    response = {}
    action = request.REQUEST.get('action')
    forum = Forum.objects.get(id=request.session['forum_id'])
    context = {}
    if action == 'add-to-stmt':
        new_claim = Claim.objects.get(id=request.REQUEST['claim_id'])
        order = int(request.REQUEST['order'])
        # refresh claims one by one
        claims = Claim.objects.filter(forum=forum, stmt_order__isnull=False, claim_category=new_claim.claim_category)
        for claim in claims:
            if claim.stmt_order >= order:
                claim.stmt_order += 1
                claim.save()
        new_claim.stmt_order = order
        new_claim.save()
    if action == 'reorder':
        orders = json.loads(request.REQUEST.get('order'))
        for claim_id in orders:
            claim = Claim.objects.get(id=claim_id)
            claim.stmt_order = orders[claim_id]
            claim.save()
    if action == 'destmt':
        claim = Claim.objects.get(id=request.REQUEST['claim_id'])
        claim.stmt_order = None
        claim.save()
    if action == 'add-to-stmt' or action == 'get-list' or action == 'reorder' or action == 'destmt':
        context['categories'] = {}
        response['claims_cnt'] = {'finding': 0, 'pro': 0, 'con': 0}
        claims = Claim.objects.filter(forum=forum, is_deleted=False, stmt_order__isnull=False)
        for category in ['finding', 'pro', 'con']:
            context['categories'][category] = [claim.getAttr(forum) for claim in claims.filter(claim_category=category).order_by('stmt_order')]
            response['claims_cnt'][category] += len(context['categories'][category])
        response['html'] = render_to_string("claim/draft-stmt.html", context)
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
        now = timezone.now()
        claim.is_deleted = True
        claim.updated_at = now
        for version in claim.versions.all():
            version.is_deleted = True
            version.updated_at = now
            version.save()
        claim.save()
    elif action == 'reword':
        claim = Claim.objects.get(id=request.REQUEST.get('claim_id'))
        content = request.REQUEST.get('content')
        collective = request.REQUEST.get('collective')
        now = timezone.now()
        new_version = ClaimVersion(forum_id=request.session['forum_id'], content=content, created_at=now,
            updated_at=now, is_adopted=False, claim=claim)
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
            newClaim = Claim(forum_id=request.session['forum_id'], author=actual_author, delegator=request.user,
                created_at=now, updated_at=now)
            newClaim.save()
            ClaimVersion.objects.create(forum_id=request.session['forum_id'], author=actual_author,
                delegator=request.user, content=content, created_at=now, updated_at=now, claim=newClaim)
        else:
            newClaim = Claim(forum_id=request.session['forum_id'], author=request.user, created_at=now, updated_at=now)
            newClaim.save()
            ClaimVersion.objects.create(forum_id=request.session['forum_id'], author=request.user, content=content,
                created_at=now, updated_at=now, claim=newClaim)
        claim_ids = request.REQUEST.get('claim_ids').split()
        for claim_id in claim_ids:
            oldClaim = Claim.objects.get(id=claim_id)
            ClaimReference.objects.create(refer_type='merge', from_claim=oldClaim, to_claim=newClaim)
            newClaim.theme = oldClaim.theme
            newClaim.claim_category = oldClaim.claim_category
        newClaim.save()
    elif action == 'change category':
        claim = Claim.objects.get(id=request.REQUEST.get('claim_id'))
        vote_type = request.REQUEST.get('type')
        # add a collective event
        if 'actual_user_id' in request.session:
            actual_author = User.objects.get(id=request.session['actual_user_id'])
        else:
            actual_author = None
        if actual_author:
            Vote.objects.create(user=actual_author, delegator=request.user, entry=claim, vote_type=vote_type,
                created_at=timezone.now(), collective=True)
        else:
            Vote.objects.create(user=request.user, entry=claim, vote_type=vote_type, created_at=timezone.now(),
                collective=True)
        # change the claim itself
        if vote_type in ['pro', 'con', 'finding', 'discarded']:
            claim.claim_category = vote_type
            claim.save()
    return HttpResponse(json.dumps(response), mimetype='application/json')

def api_claim_activities(request):
    response = {}
    action = request.REQUEST.get('action')
    if action == 'load-thread':
        activity = request.REQUEST.get('filter')
        claim = Claim.objects.get(id=request.REQUEST.get('claim_id'))
        forum = Forum.objects.get(id=request.session['forum_id'])
        context = {}
        context['entries'] = []
        if activity == 'all' or activity == 'general':
            posts = claim.comments_of_entry.all()
            for post in posts:
                for comment in post.getTree(exclude_root=False):
                    context['entries'].append(comment.getAttr(forum))
        if activity == 'all' or activity == 'categorize':
            votes = Vote.objects.filter(entry=claim).filter(
                Q(vote_type='pro') | Q(vote_type='con') | Q(vote_type='finding') | Q(vote_type='discarded'))
            for vote in votes:
                context['entries'].append(vote.getAttr(forum))
                posts = vote.comments_of_event.all()
                for post in posts:
                    for comment in post.getTree(exclude_root=False):
                        context['entries'].append(comment.getAttr(forum))
        if activity == 'all' or activity == 'theming':
            themeassignments = ThemeAssignment.objects.filter(entry=claim)
            for themeassignment in themeassignments:
                context['entries'].append(themeassignment.getAttr(forum))
                posts = themeassignment.comments_of_event.all()
                for post in posts:
                    for comment in post.getTree(exclude_root=False):
                        context['entries'].append(comment.getAttr(forum))
        if activity == 'all' or activity == 'improve':
            reword_flags = Vote.objects.filter(entry=claim.adopted_version()).filter(vote_type='reword')
            for flag in reword_flags:
                context['entries'].append(flag.getAttr(forum))
            merge_flags = Vote.objects.filter(entry=claim).filter(vote_type='merge')
            for flag in merge_flags:
                context['entries'].append(flag.getAttr(forum))
            # performed rewording
            for version in claim.versions.all():
                if not version.is_adopted:  # skip the adopted one
                    version_info = version.getAttr(forum)
                    context['entries'].append(version_info)
            # performed merging
            for newer_claim in claim.newer_versions.all():
                new_claim = newer_claim.to_claim
                try:
                    author_role = Role.objects.get(user=new_claim.author, forum=forum).role
                except:
                    author_role = VISITOR_ROLE
                try:
                    author_initial = str.upper(str(new_claim.author.first_name[0]) + str(new_claim.author.last_name[0]))
                except:
                    author_initial = ''
                entry = {'author_role': author_role, 'author_initial': author_initial,
                    'new_claim_author_id': new_claim.author.id,
                    'new_claim_author_name': new_claim.author.get_full_name(), 'entry_type': 'claim old version',
                    'is_merged': new_claim.id, 'other_old_claims': '.'.join(
                    [str(claimref.from_claim.id) for claimref in new_claim.older_versions.all() if
                        claimref.from_claim != claim]),
                    'created_at_full': new_claim.created_at,
                    'updated_at_full': new_claim.updated_at, 'updated_at': pretty_date(new_claim.updated_at)}
                context['entries'].append(entry)
            if claim.older_versions.all():  # this is a merged one!
                attribute = claim.getAttr(forum)
                attribute['entry_type'] = 'claim new version'
                context['entries'].append(attribute)
        context['entries'] = sorted(context['entries'], key=lambda en: en['created_at_full'])
        response['html'] = render_to_string("feed/activity-feed-claim.html", context)
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

def _add_claim(request, highlight):  # by this point user authentication must has been checked
    private = request.REQUEST.get('nopublish')
    content = request.REQUEST.get('content')
    theme_id = request.REQUEST.get('theme')
    now = timezone.now()
    theme = None
    if theme_id:
        theme = ClaimTheme.objects.get(id=theme_id)
    if 'actual_user_id' in request.session:
        actual_author = User.objects.get(id=request.session['actual_user_id'])
    else:
        actual_author = None
    if actual_author:
        newClaim = Claim(forum_id=request.session['forum_id'], author=actual_author, delegator=request.user,
            created_at=now, updated_at=now, source_highlight=highlight, theme=theme)
    else:
        newClaim = Claim(forum_id=request.session['forum_id'], author=request.user, created_at=now, updated_at=now,
            source_highlight=highlight, theme=theme)
    newClaim.published = private == 'false'
    newClaim.save()
    if actual_author:
        claim_version = ClaimVersion(forum_id=request.session['forum_id'], author=actual_author, delegator=request.user,
            content=content, created_at=now, updated_at=now, claim=newClaim)
    else:
        claim_version = ClaimVersion(forum_id=request.session['forum_id'], author=request.user, content=content,
            created_at=now, updated_at=now, claim=newClaim)
    claim_version.save()
    return newClaim

def _get_claim_votes(user, claim):
    ret = {}
    if not user.is_authenticated():
        for vote_type in ['pro', 'con', 'finding', 'discarded', 'prioritize']:
            votes = Vote.objects.filter(entry=claim, vote_type=vote_type, collective=False).order_by('-created_at')
            ret[vote_type] = [vote.user.get_full_name() for vote in votes]
    else:
        ret['my_votes'] = '|'.join(
            Vote.objects.filter(entry=claim, user=user, collective=False).values_list('vote_type', flat=True))
        for vote_type in ['pro', 'con', 'finding', 'discarded', 'prioritize']:
            votes = Vote.objects.filter(entry=claim, vote_type=vote_type, collective=False).order_by('-created_at')
            ret[vote_type] = [vote.user.get_full_name() for vote in votes if vote.user != user]
    return ret

def _get_version_votes(user, claim_version):
    ret = {}
    if not user.is_authenticated():
        for vote_type in ['like']:
            votes = claim_version.events.filter(vote__vote_type=vote_type).order_by('-created_at')
            ret[vote_type] = [vote.user.get_full_name() for vote in votes]
    else:
        ret['my_votes'] = '|'.join(
            Vote.objects.filter(entry=claim_version, user=user).values_list('vote_type', flat=True))
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
        response['reword_flags'] = render_to_string('claim/claim-tags.html',
            _get_flags(request, claim.adopted_version(), 'reword'))
        response['merge_flags'] = render_to_string('claim/claim-tags.html', _get_flags(request, claim, 'merge'))
        response['themes'] = render_to_string('claim/claim-tags.html', _get_flags(request, claim, 'theme'))
        return HttpResponse(json.dumps(response), mimetype='application/json')
    if action == 'load_all':
        forum = Forum.objects.get(id=request.session['forum_id'])
        claims = Claim.objects.filter(forum=forum, is_deleted=False, published=True)
        for claim in claims:
            version_id = claim.adopted_version().id
            response[version_id] = {
            'reword_flags': render_to_string('claim/claim-tags.html', _get_flags(request, claim.adopted_version(), 'reword'))}
            response[claim.id] = {
                'merge_flags': render_to_string('claim/claim-tags.html', _get_flags(request, claim, 'merge')),
                'themes': render_to_string('claim/claim-tags.html', _get_flags(request, claim, 'theme'))}
        return HttpResponse(json.dumps(response), mimetype='application/json')

def _get_flags(request, entry, action):
    context = {}
    if 'actual_user_id' in request.session:
        actual_author = User.objects.get(id=request.session['actual_user_id'])
    else:
        actual_author = None
    if 'reword' == action:
        context['version_id'] = entry.id
        reword_people = [vote.user.get_full_name() for vote in
            entry.events.filter(vote__vote_type='reword', collective=False)]  # ignore collective ones
        context['reword'] = {'reword_people': ', '.join(reword_people), 'reword_cnt': len(reword_people), }
        if actual_author:
            context['reword']['i_voted'] = actual_author in [vote.user for vote in
                entry.events.filter(vote__vote_type='reword', collective=False)]  # ignore collective ones
        else:
            context['reword']['i_voted'] = request.user in [vote.user for vote in
                entry.events.filter(vote__vote_type='reword', collective=False)]  # ignore collective ones
    if 'merge' == action:
        context['claim_id'] = entry.id
        # must assert that entry has been suggested for merging for only once.
        merged_by = [vote.user.get_full_name() for vote in
            entry.events.filter(vote__vote_type='merge', collective=False)]  # ignore collective ones
        if len(merged_by):
            vote = entry.events.get(vote__vote_type='merge')
            entry_ids = Vote.objects.filter(user=vote.user, created_at=vote.created_at).values_list('entry__id',
                flat=True)
            context['merge'] = {'entry_ids': '.'.join([str(entry_id) for entry_id in entry_ids]),
                'merge_person': vote.user.get_full_name(), }
            if actual_author:
                context['merge']['i_voted'] = actual_author == vote.user
            else:
                context['merge']['i_voted'] = request.user == vote.user
    if 'theme' == action:
        context['claim_id'] = entry.id
        forum = Forum.objects.get(id=request.session['forum_id'])
        context['themes'] = []
        for theme in ClaimTheme.objects.filter(forum=forum):
            people = [themeassignment.user.get_full_name() for themeassignment in
                entry.events.filter(themeassignment__theme=theme, collective=False)]
            theme_info = {'id': theme.id, 'theme_name': theme.name, 'assignment_people': ', '.join(people),
                'assignment_cnt': len(people), }
            if actual_author:
                theme_info['i_voted'] = actual_author in [themeassignment.user for themeassignment in
                    entry.events.filter(themeassignment__theme=theme, collective=False)]
            else:
                theme_info['i_voted'] = request.user in [themeassignment.user for themeassignment in
                    entry.events.filter(themeassignment__theme=theme, collective=False)]
            context['themes'].append(theme_info)
    return context

def api_claim_flag(request):
    response = {}
    if not request.user.is_authenticated():
        return HttpResponse("Please log in first.", status=403)
    action = request.REQUEST.get('action')
    if 'actual_user_id' in request.session:
        actual_author = User.objects.get(id=request.session['actual_user_id'])
    else:
        actual_author = None
    if action == 'flag':  # flagging a ClaimVersion
        flag_type = request.REQUEST.get('flag_type')  # whether we use claim_id or version_id, it depends on flag_type
        deflag = request.REQUEST.get('deflag')
        now = timezone.now()
        if flag_type == 'reword':
            claim_version = ClaimVersion.objects.get(id=request.REQUEST.get('version_id'))
            collective = request.REQUEST.get('collective')
            reason = request.REQUEST.get('reason')
            if collective == 'true':  # impossible to deflag
                if actual_author:
                    Vote.objects.create(user=actual_author, delegator=request.user, entry=claim_version, created_at=now,
                        vote_type='reword', reason=reason, collective=True)
                else:
                    Vote.objects.create(user=request.user, entry=claim_version, created_at=now, vote_type='reword',
                        reason=reason, collective=True)
            else:
                if actual_author:
                    Vote.objects.filter(user=actual_author, entry=claim_version, vote_type=flag_type).delete()
                    if deflag == 'false':
                        Vote.objects.create(user=actual_author, delegator=request.user, entry=claim_version,
                            created_at=now, vote_type='reword', reason=reason)
                else:
                    Vote.objects.filter(user=request.user, entry=claim_version, vote_type=flag_type).delete()
                    if deflag == 'false':
                        Vote.objects.create(user=request.user, entry=claim_version, created_at=now, vote_type='reword',
                            reason=reason)
            response['html'] = render_to_string("claim/claim-tags.html", _get_flags(request, claim_version, 'reword'))
        elif flag_type == 'merge':
            if deflag == 'false':
                claim_ids = request.REQUEST.get('claim_ids').split()
                for claim_id in claim_ids:
                    if actual_author:
                        Vote.objects.create(user=actual_author, delegator=request.user,
                            entry=Claim.objects.get(id=claim_id), created_at=now, vote_type='merge')
                    else:
                        Vote.objects.create(user=request.user, entry=Claim.objects.get(id=claim_id), created_at=now,
                            vote_type='merge')
                        # doesn't need to return html -- LoadFlags will be called
            else:
                claim = Claim.objects.get(id=request.REQUEST.get('claim_id'))
                if actual_author:
                    timestamp = Vote.objects.get(user=actual_author, entry=claim, vote_type='merge').created_at
                    Vote.objects.filter(user=actual_author, created_at=timestamp).delete()
                else:
                    timestamp = Vote.objects.get(user=request.user, entry=claim, vote_type='merge').created_at
                    Vote.objects.filter(user=request.user, created_at=timestamp).delete()
                response['html'] = render_to_string("claim/claim-tags.html", _get_flags(request, claim, 'merge'))
        return HttpResponse(json.dumps(response), mimetype='application/json')
    if action == 'theme':  # thematizing a Claim
        claim = Claim.objects.get(id=request.REQUEST.get('claim_id'))
        theme = ClaimTheme.objects.get(id=request.REQUEST.get('theme_id'))
        detheme = request.REQUEST.get('detheme')
        collective = request.REQUEST.get('collective')
        now = timezone.now()
        if collective == 'true':
            claim.theme = theme
            claim.save()
            if actual_author:
                ThemeAssignment.objects.create(user=actual_author, delegator=request.user, entry=claim, created_at=now,
                    theme=theme, collective=True)
            else:
                ThemeAssignment.objects.create(user=request.user, entry=claim, created_at=now, theme=theme,
                    collective=True)
        else:
            if actual_author:
                ThemeAssignment.objects.filter(user=actual_author, entry=claim, theme=theme).delete()
            else:
                ThemeAssignment.objects.filter(user=request.user, entry=claim, theme=theme).delete()
            if detheme == 'false':
                if actual_author:
                    ThemeAssignment.objects.create(user=actual_author, delegator=request.user, entry=claim,
                        created_at=now, theme=theme)
                else:
                    ThemeAssignment.objects.create(user=request.user, entry=claim, created_at=now, theme=theme)
        response['html'] = render_to_string("claim/claim-tags.html", _get_flags(request, claim, 'theme'))
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
            if vote_type == 'pro' or vote_type == 'con' or vote_type == 'finding' or vote_type == 'discarded':  # mutual exclusive
                for v in ['pro', 'con', 'finding', 'discarded']:
                    if actual_author:
                        Vote.objects.filter(user=actual_author, entry=claim, vote_type=v).delete()
                    else:
                        Vote.objects.filter(user=request.user, entry=claim, vote_type=v).delete()
            if actual_author:
                Vote.objects.create(user=actual_author, delegator=request.user, entry=claim, vote_type=vote_type,
                    created_at=timezone.now())
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
                Vote.objects.create(user=actual_author, delegator=request.user, entry=claim_version, vote_type='like',
                    created_at=timezone.now())
            response['voters'] = _get_version_votes(actual_author, claim_version)
        else:
            if unvote == 'true':
                Vote.objects.filter(user=request.user, entry=claim_version, vote_type='like').delete()
            else:
                Vote.objects.create(user=request.user, entry=claim_version, vote_type='like', created_at=timezone.now())
            response['voters'] = _get_version_votes(request.user, claim_version)
        return HttpResponse(json.dumps(response), mimetype='application/json')
    if action == 'adopt version':
        new_version = ClaimVersion.objects.get(id=request.REQUEST.get('version_id'))
        current_version = new_version.claim.adopted_version()
        current_version.is_adopted = False
        current_version.save()
        new_version.is_adopted = True
        new_version.save()
        return HttpResponse(json.dumps(response), mimetype='application/json')