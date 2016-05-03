import json

from django.template.loader import render_to_string
from django.http import HttpResponse
from django.utils import timezone
from django.db.models import Q
from django.core.cache import cache

from cir.models import *
from cir.utils import segment_text

index_building = False

VISITOR_ROLE = 'visitor'


def update_index(request):
    global index_building
    if index_building:
        return
    index_building = True
    print "Building frequency index ..."
    anno = GeoAnnotation.objects.all()
    tmpCache = {}

    segmented_docs = {} # cache segmented docs

    def getTokens(content):
        s = Segmenter()
        try:
            s.feed(content)
            return s.get_tokens()
        except HTMLParseError:
            pass

    for an in anno:
        doc = an.source
        if doc.id not in segmented_docs: # identical behavior with get_doc
            segmented_docs[doc.id] = getTokens('<p>' + '</p><p>'.join(doc.get_sentences_annotated()) + '</p>')
        text = ''.join(segmented_docs[doc.id][an.start:an.end + 1])
        text = text.lower().strip().replace(' ', '_')
        if len(text) == 0:
            continue
        if an.place_id: # from nominatim
            place_id = an.place_id
            place_type = 'nominatim'
        elif an.custom_place:
            place_id = an.custom_place.id
            place_type = 'custom'
        else:
            continue
        shape = an.shape
        if text in tmpCache:
            cached = tmpCache[text]
            if shape in cached: # cannot use ID as key
                cached[shape]['freq'] += 1
            else:
                cached[shape] = {
                    'freq': 1,
                    'type': place_type,
                    'place_id': place_id,
                    'text': an.text
                }
        else:
            tmpCache[text] = {
                shape: {
                    'freq': 1,
                    'type': place_type,
                    'place_id': place_id,
                    'text': an.text
                }
            }
    customPlaces = CustomPlace.objects.all()
    for cp in customPlaces:
        text = cp.place_name.lower().strip().replace(' ', '_')
        if len(text) == 0:
            continue
        shape = cp.shape
        if text in tmpCache:
            cached = tmpCache[text]
            if shape in cached: # cannot use ID as key
                cached[shape]['freq'] += 1
            else:
                cached[shape] = {
                    'freq': 1,
                    'type': 'custom',
                    'place_id': cp.id,
                    'text': cp.place_name
                }
        else:
            tmpCache[text] = {
                shape: {
                    'freq': 1,
                    'type': 'custom',
                    'place_id': cp.id,
                    'text': cp.place_name
                }
            }
    cache.clear()
    for key in tmpCache:
        cache.set(key, tmpCache[key])
    print "Frequency index built."
    index_building = False
    return HttpResponse()


def api_postcir(request):
    response = {}
    action = request.REQUEST.get('action')
    now = timezone.now()
    if action == 'new-post':
        content = request.REQUEST.get('content')
        citations = request.REQUEST.getlist('citations')
        for citation in citations:
            claim = Claim.objects.get(id=citation.claim_id)
            start = citation.start
            end = citation.end
            Highlight.objects.create(start_pos=start, end_pos=end, context=claim, is_nugget=False, created_at=now, author=request.user)
        Post.objects.create(forum_id=request.session['forum_id'], author=request.user,
            content=content, created_at=now, updated_at=now, content_type='postcir')
    if action == 'load-posts':
        forum = Forum.objects.get(id=request.session['forum_id'])
        context = {}
        context['entries'] = []
        posts = Post.objects.filter(forum=forum, content_type='postcir')
        for post in posts:
            context['entries'].append(post.getAttr(forum))
        context['entries'] = sorted(context['entries'], key=lambda en: en['created_at_full'])
        response['html'] = render_to_string("feed/activity-feed-postcir.html", context)
    return HttpResponse(json.dumps(response), mimetype='application/json')

def search_annotation(request):
    searchText = request.REQUEST.get('text').lower().replace(' ', '_')
    cached = cache.get(searchText)
    res = []
    if cached:
        res = sorted([{
            'place_id': cached[shape]['place_id'],
            'freq': cached[shape]['freq'],
            'type': cached[shape]['type'],
            'shape': shape,
            'text': cached[shape]['text']
        } for shape in cached], key=lambda f:f['freq'], reverse=True)
    html = render_to_string('matched anno.html', {
        'matched': res
    })
    return HttpResponse(json.dumps({
        'html': html,
        'matches': res
    }), mimetype='application/json')