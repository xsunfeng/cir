import json
import nltk

from django.template.loader import render_to_string
from django.http import HttpResponse
from django.utils import timezone
from django.db.models import Q
from django.core.cache import cache

from cir.models import *
from annotator.models import Annotation
from cir.utils import segment_text

index_building = False

VISITOR_ROLE = 'visitor'

def api_geoparse(request):
    sentences = nltk.sent_tokenize(request.REQUEST.get('text'))
    tokenized_sentences = [nltk.word_tokenize(sentence) for sentence in sentences]
    tagged_sentences = [nltk.pos_tag(sentence) for sentence in tokenized_sentences]
    chunked_sentences = nltk.ne_chunk_sents(tagged_sentences, binary=True)
    response = {}
    def extract_entity_names(t):
        entity_names = []

        if hasattr(t, 'label') and t.label:
            if t.label() == 'NE':
                entity_names.append(' '.join([child[0] for child in t]))
            else:
                for child in t:
                    entity_names.extend(extract_entity_names(child))

        return entity_names

    response['entity_names'] = []
    for tree in chunked_sentences:
        response['entity_names'].extend(extract_entity_names(tree))

    return HttpResponse(json.dumps(response), mimetype='application/json')

def api_postcir(request):
    response = {}
    action = request.REQUEST.get('action')
    now = timezone.now()
    if action == 'new-post':
        content = request.REQUEST.get('content')
        citations = request.POST.getlist('citations[]')
        geonames = request.POST.getlist('geonames[]')
        for citation in citations:
            claim = Claim.objects.get(id=citation.claim_id)
            start = citation.start
            end = citation.end
            Highlight.objects.create(start_pos=start, end_pos=end, context=claim, is_nugget=False, created_at=now, author=request.user)
        for geoname in geonames:
            Annotation.objects.create(text=geoname.text, shape=geoname.geotext, created_at=now)

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