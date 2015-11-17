import json
from datetime import timedelta
from sets import Set

from django.template.loader import render_to_string
from django.shortcuts import render
from django.http import HttpResponse
from django.utils import timezone

from cir.models import *

def api_vis(request):
    response = {}
    activity_type = json.loads(request.body)['activity_type']
    forum = Forum.objects.get(id=request.session['forum_id'])
    if activity_type == 'all':
        claim_versions = ClaimVersion.objects.filter(forum=forum).order_by('created_at')
        votes = Vote.objects.filter(forum=forum)
        posts = Post.objects.filter(forum=forum)

        # get first & last entry
        time_start = claim_versions[0].created_at - timedelta(days=1)
        time_end = claim_versions.reverse()[0].created_at + timedelta(days=1)
        response['time_start'] = time_start.isoformat()
        response['time_end'] = time_end.isoformat()

        # activity data includes claim creation, voting
        response['activityData'] = {}
        response['users'] = {}
        for panelist in forum.members.filter(role='panelist'):
            response['users'][panelist.user.id] = panelist.user.get_full_name()
            response['activityData'][panelist.user.id] = [
                claim.getAttrSimple() for claim in claim_versions.filter(author=panelist.user)
            ]
            response['activityData'][panelist.user.id].extend([
                vote.getAttrSimple() for vote in votes.filter(user=panelist.user)
            ])
            response['activityData'][panelist.user.id].extend([
                post.getAttrSimple() for post in posts.filter(author=panelist.user)
            ])
    return HttpResponse(json.dumps(response), mimetype='application/json')
