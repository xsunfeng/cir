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
