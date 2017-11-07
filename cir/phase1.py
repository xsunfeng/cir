import json

from django.template.loader import render_to_string
from django.http import HttpResponse
from django.utils import timezone
from django.shortcuts import render_to_response

from cir.models import *
import claim_views
from cir.phase_control import PHASE_CONTROL
import utils

from bs4 import BeautifulSoup

from nltk.corpus import stopwords 
from nltk.stem.wordnet import WordNetLemmatizer
from nltk.stem.porter import PorterStemmer

import string
import pprint

import gensim
from gensim import corpora, summarization
import re, math
import random
from collections import Counter

stop = set(stopwords.words('english'))
exclude = set(string.punctuation) 
wordnet_lemmatizer = WordNetLemmatizer()
porter_stemmer = PorterStemmer()
def clean(doc):
    stop_free = " ".join([i for i in doc.lower().split() if i not in stop])
    punc_free = ''.join(ch for ch in stop_free if ch not in exclude)
    lemmatized = " ".join(wordnet_lemmatizer.lemmatize(word) for word in punc_free.split())
    stemmed = " ".join(porter_stemmer.stem(word) for word in lemmatized.split())
    return stemmed

def get_nugget_comment_list(request):
    response = {}
    context = {}
    highlight_id = request.REQUEST.get("highlight_id")
    this_highlight = Highlight.objects.get(id=highlight_id)
    thread_comments = NuggetComment.objects.filter(highlight=this_highlight)
    context['highlight'] = this_highlight.getAttr()
    context['comments'] = thread_comments
    response['nugget_comment_list'] = render_to_string("phase1/nugget_comment_list.html", context)
    response['nugget_comment_highlight'] = render_to_string("phase1/nugget_comment_highlight.html", context)
    return HttpResponse(json.dumps(response), mimetype='application/json')

def put_nugget_comment(request):
    response = {}
    context = {}
    author = request.user
    parent_id = request.REQUEST.get('parent_id')
    highlight_id = request.REQUEST.get('highlight_id')
    text = request.REQUEST.get('text')
    created_at = timezone.now()
    highlight = Highlight.objects.get(id = highlight_id)
    if parent_id == "": #root node
        newNuggetComment = NuggetComment(author = author, text = text, highlight = highlight, created_at = created_at)
    else:
        parent = NuggetComment.objects.get(id = parent_id)
        newNuggetComment = NuggetComment(author = author, text = text, highlight = highlight, parent = parent, created_at = created_at)
    newNuggetComment.save()
    return HttpResponse(json.dumps(response), mimetype='application/json')

def api_load_all_documents(request):
    response = {}
    context = {}
    context["docs"] = []
    forum = Forum.objects.get(id=request.session['forum_id'])
    # retrieve docs in a folder
    docs = Doc.objects.filter(forum_id=request.session['forum_id'])
    for doc in docs:
        doc_attr = {}
        doc_attr['folder'] = doc.folder
        doc_attr['title'] = doc.title
        doc_attr['sections'] = []
        ordered_sections = doc.sections.filter(order__isnull=False).order_by('order')
        for section in ordered_sections:
            doc_attr['sections'].append(section.getAttr(forum))
        unordered_sections = doc.sections.filter(order__isnull=True).order_by('updated_at')
        for section in unordered_sections:
            doc_attr['sections'].append(section.getAttr(forum))
        context["docs"].append(doc_attr);
        response['workbench_document'] = render_to_string("workbench-documents.html", context)
    return HttpResponse(json.dumps(response), mimetype='application/json')

# https://www.analyticsvidhya.com/blog/2016/08/beginners-guide-to-topic-modeling-in-python/
def api_get_overview(request):
    response = {}
    forum = Forum.objects.get(id=request.session['forum_id'])
    if (forum.graph != None):
        response['doc_graph'] = json.loads(forum.graph)
        return HttpResponse(json.dumps(response), mimetype='application/json')
    doc_dict = {}
    for doc in Doc.objects.filter(forum = forum):
        doc_dict[doc.id] = ""
        for sec in DocSection.objects.filter(doc_id = doc.id):
            raw_html = sec.content
            cleantext = BeautifulSoup(raw_html).text
            cleantext = " ".join(cleantext.split("\n"))
            cleantext = " ".join(cleantext.split("\t"))
            cleantext = cleantext.encode('ascii', 'ignore').decode('ascii')
            doc_dict[doc.id] = doc_dict[doc.id] + " " + cleantext

    _index2docid = []
    doc_complete = []
    for k,v in doc_dict.iteritems():
        doc_complete.append(v)
        _index2docid.append(k)

    doc_clean = [clean(doc).split() for doc in doc_complete]   

    # Creating the term dictionary of our courpus, where every unique term is assigned an index. 
    dictionary = corpora.Dictionary(doc_clean)

    # Converting list of documents (corpus) into Document Term Matrix using dictionary prepared above.
    doc_term_matrix = [dictionary.doc2bow(doc) for doc in doc_clean]

    # Creating the object for LDA model using gensim library
    ldamodel = gensim.models.ldamodel.LdaModel(doc_term_matrix, id2word = dictionary, passes=50)

    # print(ldamodel.print_topics(num_topics=8, num_words=10))

    index = gensim.similarities.MatrixSimilarity(ldamodel[doc_term_matrix])

    doc_graph = {}
    doc_graph["nodes"] = []
    doc_graph["links"] = []
    num_docs = len(doc_complete)
    for source_index in range(0, num_docs):
        node = {}
        node['id'] = _index2docid[source_index]
        node['group'] = '0'
        doc_graph["nodes"].append(node)
        doc = doc_complete[source_index]
        doc_clean = clean(doc)
        vec_bow = dictionary.doc2bow(doc_clean.lower().split())
        vec_lda = ldamodel[vec_bow]
        sims = index[vec_lda]
        sims = sorted(enumerate(sims), key=lambda item: -item[1])
        for target_index, score in sims:
            link = {}
            link['source'] = _index2docid[source_index]
            link['target'] = _index2docid[target_index]
            link['value'] = str(score)
            print link 
            if (link['source'] < link['target']):
                doc_graph["links"].append(link)
    response['doc_graph'] = doc_graph
    forum.graph = json.dumps(doc_graph)
    forum.save()
    return HttpResponse(json.dumps(response), mimetype='application/json')

# https://rare-technologies.com/text-summarization-with-gensim/
def api_get_summarization(request):
    response = {}
    forum = Forum.objects.get(id=request.session['forum_id'])
    doc_id = request.REQUEST.get("doc_id")
    doc = Doc.objects.get(id = doc_id)
    doc_text = ""
    for sec in DocSection.objects.filter(doc_id = doc.id):
        raw_html = sec.content
        cleantext = BeautifulSoup(raw_html).text
        cleantext = " ".join(cleantext.split("\n"))
        cleantext = " ".join(cleantext.split("\t"))
        cleantext = cleantext.encode('ascii', 'ignore').decode('ascii')
        doc_text = doc_text + " " + cleantext
    doc_text = re.sub(r'(?<=[.,])(?=[^\s])', r' ', doc_text)
    response['doc_summarization'] = summarization.summarize(doc_text,  word_count=80)
    response['doc_keywords'] = summarization.keywords(doc_text, ratio=0.08, lemmatize=True).split("\n");
    response['doc_title'] = doc.title;
    # get extracted nuggets text
    nugget_text = ""
    for section in doc.sections.all():
        highlights = section.highlights.all()
        for highlight in highlights:
            nugget_text = nugget_text + " " + highlight.text
    if len(nugget_text.split(" ")) > 50:
        response['nugget_summarization'] = summarization.summarize(nugget_text,  word_count=80)
        response['nugget_keywords'] = summarization.keywords(nugget_text, ratio=0.08, lemmatize=True).split("\n")
    else:
        response['nugget_summarization'] = "not enough nuggets extracted to generate content summarization"
        response['nugget_keywords'] = []
    # calculate est. read time
    response['word_count'] = len(doc_text.split(" "))
    return HttpResponse(json.dumps(response), mimetype='application/json')

def api_get_information_coverage(request):
    response = {}
    doc_id = request.REQUEST.get("doc_id")
    doc = Doc.objects.get(id = doc_id)
    doc_text = ""
    for sec in DocSection.objects.filter(doc_id = doc.id):
        raw_html = sec.content
        cleantext = BeautifulSoup(raw_html).text
        cleantext = " ".join(cleantext.split("\n"))
        cleantext = " ".join(cleantext.split("\t"))
        cleantext = cleantext.encode('ascii', 'ignore').decode('ascii')
        doc_text = doc_text + " " + cleantext

    doc_text = re.sub(r'(?<=[.,])(?=[^\s])', r' ', doc_text)
    nugget_text = ""
    for section in doc.sections.all():
        highlights = section.highlights.all()
        for highlight in highlights:
            nugget_text = nugget_text + " " + highlight.text

    nugget_text = re.sub(r'(?<=[.,])(?=[^\s])', r' ', nugget_text)
    # calculate information coverage and redundancy
    stop = set(stopwords.words('english'))
    exclude = set(string.punctuation) 
    lemma = WordNetLemmatizer()
    doc_clean = clean(doc_text).split()
    nugget_clean = clean(nugget_text).split()
    cov, red = calc_coverage(doc_clean, nugget_clean)
    response['coverage'] = cov
    response['redundancy'] = red
    return HttpResponse(json.dumps(response), mimetype='application/json')

def api_get_toc(request):
    response = {}
    context = {}
    # retrieve docs not in any folder
    context['root_docs'] = []
    root_docs = Doc.objects.filter(forum_id=request.session['forum_id'], folder__isnull=True).order_by("order")
    for doc in root_docs:
        m_doc = {}
        m_doc['name'] = doc.title
        m_doc['id'] = doc.id
        m_doc['content'] = []
        for section in doc.sections.all():
            m_sec = {}
            m_sec["name"] = section.title
            m_sec["id"] = section.id
            m_doc['content'].append(m_sec)
        m_doc['content'].sort(key = lambda x: x["id"])
        context['root_docs'].append(m_doc)
    # retrieve docs in a folder
    folders = EntryCategory.objects.filter(forum_id=request.session['forum_id'], category_type='doc')
    context['folders'] = []
    for folder in folders:
        m_folder = {}
        m_folder['name'] = folder.name
        m_folder['content'] = [] 
        docs = Doc.objects.filter(folder=folder)
        for doc in docs:
            m_doc = {}
            m_doc['name'] = doc.title
            m_doc['id'] = doc.id
            m_doc['content'] = []
            for section in doc.sections.all():
                m_sec = {}
                m_sec["name"] = section.title
                m_sec["id"] = section.id
                m_doc['content'].append(m_sec)
            m_doc['content'].sort(key = lambda x: x["id"])
            m_folder['content'].append(m_doc)
        context['folders'].append(m_folder)
    response['document_toc'] = render_to_string("document-toc.html", context)
    return HttpResponse(json.dumps(response), mimetype='application/json')

def api_get_doc_by_hl_id(request):
    response = {}
    context = {}
    forum = Forum.objects.get(id=request.session['forum_id'])
    # retrieve docs in a folder
    hl_id = request.REQUEST.get("hl_id")
    hl = Highlight.objects.get(id = hl_id)
    sec = DocSection.objects.get(id=hl.context.id)
    doc = sec.doc
    context['doc_name'] = doc.title
    context['sections'] = []
    context['doc_id'] = doc.id
    ordered_sections = doc.sections.filter(order__isnull=False).order_by('order')
    for section in ordered_sections:
        context['sections'].append(section.getAttr(forum))
    unordered_sections = doc.sections.filter(order__isnull=True).order_by('updated_at')
    for section in unordered_sections:
        context['sections'].append(section.getAttr(forum))
    response['workbench_document'] = render_to_string("workbench-document.html", context)
    response['doc_id'] = doc.id
    return HttpResponse(json.dumps(response), mimetype='application/json')

def api_get_doc_by_sec_id(request):
    response = {}
    context = {}
    forum = Forum.objects.get(id=request.session['forum_id'])
    # retrieve docs in a folder
    sec_id = request.REQUEST.get("sec_id")
    sec = DocSection.objects.get(id = sec_id)
    doc = sec.doc
    context['doc_name'] = doc.title
    context['sections'] = []
    context['doc_id'] = doc.id
    ordered_sections = doc.sections.filter(order__isnull=False).order_by('order')
    for section in ordered_sections:
        context['sections'].append(section.getAttr(forum))
    unordered_sections = doc.sections.filter(order__isnull=True).order_by('updated_at')
    for section in unordered_sections:
        context['sections'].append(section.getAttr(forum))
    response['workbench_document'] = render_to_string("workbench-document.html", context)
    response['doc_id'] = doc.id
    return HttpResponse(json.dumps(response), mimetype='application/json')

def api_get_doc_by_doc_id(request):
    response = {}
    context = {}
    forum = Forum.objects.get(id=request.session['forum_id'])
    # retrieve docs in a folder
    doc_id = request.REQUEST.get("doc_id")
    doc = Doc.objects.get(id = doc_id)
    context['doc_name'] = doc.title
    context['doc_id'] = doc.id
    context['sections'] = []
    ordered_sections = doc.sections.filter(order__isnull=False).order_by('order')
    for section in ordered_sections:
        context['sections'].append(section.getAttr(forum))
    unordered_sections = doc.sections.filter(order__isnull=True).order_by('updated_at')
    for section in unordered_sections:
        context['sections'].append(section.getAttr(forum))
    response['workbench_document'] = render_to_string("workbench-document.html", context)
    response['doc_id'] = doc.id
    return HttpResponse(json.dumps(response), mimetype='application/json')

def api_get_init_doc(request):
    response = {}
    context = {}
    forum = Forum.objects.get(id=request.session['forum_id'])
    # retrieve docs in a folder
    doc = Doc.objects.filter(forum_id=request.session['forum_id'], order__isnull=False).order_by('order')[0]
    doc_id = doc.id
    context['doc_name'] = doc.title
    context['doc_id'] = doc_id
    context['sections'] = []
    ordered_sections = doc.sections.filter(order__isnull=False).order_by('order')
    for section in ordered_sections:
        context['sections'].append(section.getAttr(forum))
    unordered_sections = doc.sections.filter(order__isnull=True).order_by('updated_at')
    for section in unordered_sections:
        context['sections'].append(section.getAttr(forum))
    response['workbench_document'] = render_to_string("workbench-document.html", context)
    response['doc_id'] = doc_id
    return HttpResponse(json.dumps(response), mimetype='application/json')

def get_theme_list(request):
    response = {}
    context = {}
    forum = Forum.objects.get(id=request.session['forum_id'])
    context['forum_name'] = forum.full_name
    context['forum_url'] = forum.url    
    themes = ClaimTheme.objects.filter(forum_id=request.session['forum_id'])
    response["themes"] = []
    for theme in themes:
        item = {}
        item["name"] = theme.name
        item["id"] = theme.id
        response["themes"].append(item)
    context["phase"] = PHASE_CONTROL[forum.phase]

    return HttpResponse(json.dumps(response), mimetype='application/json')

def get_highlights(request):
    response = {}
    response['highlights'] = []
    theme_id = request.REQUEST.get('theme_id')
    doc_id = request.REQUEST.get('doc_id')
    doc = Doc.objects.get(id = doc_id)
    for section in doc.sections.all():
        highlights = section.highlights.all()
        for highlight in highlights:
            highlight_info = highlight.getAttr()
            highlight_info["cur_theme"] = True if highlight.theme.id == theme_id else False
            highlight_info["doc_id"] = DocSection.objects.get(id=highlight.context.id).doc.id
            highlight_info["is_nugget"] = highlight.is_nugget
            response['highlights'].append(highlight_info)
    return HttpResponse(json.dumps(response), mimetype='application/json')

def api_load_one_highlight(request):
    response = {}
    response['highlights'] = []
    hl_id = request.REQUEST.get('hl_id')
    hl = Highlight.objects.get(id = hl_id)
    highlight_info = hl.getAttr()
    response['highlight'] = highlight_info
    return HttpResponse(json.dumps(response), mimetype='application/json')

def api_remove_claim(request):
    response = {}
    claim_id = request.REQUEST.get('claim_id')
    c = Claim.objects.get(id=claim_id)
    c.delete()
    return HttpResponse(json.dumps(response), mimetype='application/json')

def put_claim(request):
    response = {}
    content = request.REQUEST.get('content')
    theme_id = request.REQUEST.get('theme_id')
    data_hl_ids = request.REQUEST.get('data_hl_ids')
    category = "pending"
    now = timezone.now()
    newClaim = Claim(forum_id=request.session['forum_id'], author=request.user, created_at=now, updated_at=now, content=content, theme_id=theme_id, claim_category=category)
    newClaim.save()
    claim_version = ClaimVersion(forum_id=request.session['forum_id'], author=request.user, content=content, created_at=now, updated_at=now, claim=newClaim)
    claim_version.save()
    data_hl_ids_list = data_hl_ids.strip().split(" ")
    for data_hl_id in data_hl_ids_list:
        newHighlightClaim = HighlightClaim(claim_id=newClaim.id, highlight_id=data_hl_id)
        newHighlightClaim.save()
    return HttpResponse(json.dumps(response), mimetype='application/json')

def change_nugget_theme(request):
    highlight_id = request.REQUEST.get("highlight_id")
    theme_id = request.REQUEST.get("theme_id")
    highlight = Highlight.objects.get(id=highlight_id)
    highlight.theme_id = theme_id
    highlight.save()
    response = {}
    return HttpResponse(json.dumps(response), mimetype='application/json')

# nugget list zone
def api_change_to_nugget(request):
    # input: highlight_ids, output: set as nugget
    response = {}
    context = {}
    data_hl_ids = request.REQUEST.get("data_hl_ids").split(" ")
    for data_hl_id in data_hl_ids:
        hl = Highlight.objects.get(id = data_hl_id)
        hl.is_nugget = True
        hl.save()
    docs = Doc.objects.filter(forum_id=request.session["forum_id"])
    context['highlights'] = []
    for doc in docs:
        for section in doc.sections.all():
            highlights = section.highlights.filter(is_nugget = True)
            for highlight in highlights:
                context['highlights'].append(highlight.getAttr())
    response['workbench_nuggets'] = render_to_string("workbench-nuggets.html", context)
    return HttpResponse(json.dumps(response), mimetype='application/json')

def api_change_to_nugget_1(request):
    # input: highlight_id, output: one nugget
    response = {}
    context = {}
    data_hl_id = request.REQUEST.get("data_hl_id")
    hl = Highlight.objects.get(id = data_hl_id)
    hl.is_nugget = True
    hl.save()
    context['highlight'] = hl.getAttr()
    response['workbench_single_nugget'] = render_to_string("workbench-single-nugget.html", context)
    return HttpResponse(json.dumps(response), mimetype='application/json')

def api_remove_nugget(request):
    # input: highlight_ids, output: set as not nugget
    response = {}
    context = {}
    hl_id = request.REQUEST.get("hl_id")
    hl = Highlight.objects.get(id = hl_id)
    hl.is_nugget = False
    hl.save()
    context['highlight'] = hl.getAttr()
    response['workbench_single_nugget'] = render_to_string("workbench-single-nugget.html", context)
    return HttpResponse(json.dumps(response), mimetype='application/json')

def get_nugget_list(request):
    response = {}
    context = {}
    theme_id = int(request.REQUEST.get("theme_id"))
    docs = Doc.objects.filter(forum_id=request.session["forum_id"])
    context['highlights'] = []
    for doc in docs:
        for section in doc.sections.all():
            highlights = section.highlights.all()
            for highlight in highlights:
                highlight_info = highlight.getAttr()
                highlight_info["doc_id"] = DocSection.objects.get(id=highlight.context.id).doc.id
                highlight_info["is_author"] = (highlight.author == request.user)
                highlight_info["author_intro"] = UserInfo.objects.get(user = highlight.author).description
                highlight_info["author_id"] = highlight.author.id
                highlight_info["theme_desc"] = highlight.theme.description
                highlight_info["comment_number"] = NuggetComment.objects.filter(highlight_id = highlight.id).count()
                context['highlights'].append(highlight_info)
    context['highlights'].sort(key = lambda x: x["created_at"], reverse=True)
    response['workbench_nugget_list'] = render_to_string("phase1/nugget_list.html", context)
    return HttpResponse(json.dumps(response), mimetype='application/json')

def api_load_nugget_list_partial(request):
    response = {}
    context = {}
    context['highlights'] = []
    highlight_ids = request.REQUEST.get("highlight_ids")
    highlight_ids = highlight_ids.split()
    for highlight_id in highlight_ids:
        highlight = Highlight.objects.get(id = highlight_id)
        context['highlights'].append(highlight.getAttr())
    response['workbench_nugget_list'] = render_to_string("workbench-nuggets.html", context)
    return HttpResponse(json.dumps(response), mimetype='application/json')

def api_load_claim_list_partial(request):
    response = {}
    context = {}
    context['highlights'] = []
    highlight_id = request.REQUEST.get("highlight_id")
    highlightClaims = HighlightClaim.objects.filter(highlight_id = highlight_id)
    context["claims"] = []
    for highlightClaim in highlightClaims:
        claim = highlightClaim.claim
        item = {}
        item['date'] = utils.pretty_date(claim.updated_at)
        item['content'] = unicode(ClaimVersion.objects.filter(claim_id = claim.id)[0]) + " (" + claim.claim_category + ")" 
        item['id'] = claim.id
        item['author_name'] = claim.author.first_name + " " + claim.author.last_name
        item['is_author'] = (request.user == claim.author)
        item['highlight_ids'] = ""
        for highlight in claim.source_highlights.all():
            item['highlight_ids'] += (str(highlight.id) + " ")
        item['highlight_ids'].strip(" ")
        context["claims"].append(item)
    response['workbench_claims'] = render_to_string("workbench-claims.html", context)
    return HttpResponse(json.dumps(response), mimetype='application/json')

def api_edit_claim(request):
    claim_id = request.REQUEST.get("claim_id")
    content = request.REQUEST.get("content")
    claim = Claim.objects.get(id = claim_id)
    claim.content = content
    claim.save()
    response = {}
    return HttpResponse(json.dumps(response), mimetype='application/json')

def get_claim_list(request):
    forum = Forum.objects.get(id=request.session['forum_id'])
    response = {}
    context = {}
    theme_id = int(request.REQUEST.get('theme_id'))
    if (theme_id > 0): 
        claims = Claim.objects.filter(theme_id = theme_id)
    else:
        claims = Claim.objects.filter(forum = forum)
    context["claims"] = []
    for claim in claims:
        item = {}
        item['date'] = utils.pretty_date(claim.updated_at)
        item['created_at'] = utils.pretty_date(claim.created_at)
        item['created_at_used_for_sort'] = claim.created_at
        item['content'] = unicode(ClaimVersion.objects.filter(claim_id = claim.id)[0]) 
        item['id'] = claim.id
        item['author_name'] = claim.author.first_name + " " + claim.author.last_name
        item['is_author'] = (request.user == claim.author)
        item['highlight_ids'] = ""
        for highlight in claim.source_highlights.all():
            item['highlight_ids'] += (str(highlight.id) + " ")
        item['highlight_ids'].strip(" ")
        context["claims"].append(item)
    context['claims'].sort(key = lambda x: x["created_at_used_for_sort"], reverse=True)
    response['workbench_claims'] = render_to_string("phase2/claim_list.html", context)
    return HttpResponse(json.dumps(response), mimetype='application/json')   

def api_others(request):  
    response = {}
    action = request.REQUEST.get('action')
    if action == 'create':
        if not request.user.is_authenticated():
            return HttpResponse("Please log in first.", status=403)
        content = request.REQUEST.get('content')
        content_type = request.REQUEST.get('type')
        start = request.REQUEST.get('start')
        end = request.REQUEST.get('end')
        context_id = request.REQUEST.get('contextId')
        # create highlight object
        context = Entry.objects.get(id=context_id)
        highlight = Highlight(start_pos=start, end_pos=end, context=context, author=request.user)
        highlight.save()
        response['highlight_id'] = highlight.id
        # then create the content
        now = timezone.now()
        if 'actual_user_id' in request.session:
            actual_author = User.objects.get(id=request.session['actual_user_id'])
        else:
            actual_author = None
        if content_type == 'comment':
            if actual_author:
                Post.objects.create(forum_id=request.session['forum_id'], author=actual_author, delegator=request.user,
                    content=content, created_at=now, updated_at=now, highlight=highlight, content_type='comment')
            else:
                Post.objects.create(forum_id=request.session['forum_id'], author=request.user, content=content,
                    created_at=now, updated_at=now, highlight=highlight, content_type='comment')
        elif content_type == 'question':
            if actual_author:
                Post.objects.create(forum_id=request.session['forum_id'], author=actual_author, delegator=request.user,
                    content=content, created_at=now, updated_at=now, highlight=highlight, content_type='question')
            else:
                Post.objects.create(forum_id=request.session['forum_id'], author=request.user, content=content,
                    created_at=now, updated_at=now, highlight=highlight, content_type='question')
        elif content_type == 'claim':
            claim_views._add_claim(request, highlight)
        return HttpResponse(json.dumps(response), mimetype='application/json')
    if action == 'load-doc':
        doc_id = request.REQUEST.get('doc_id')
        doc = Doc.objects.get(id=doc_id)
        response['highlights'] = []
        mytags = set()
        alltags = set()
        for section in doc.sections.all():
            highlights = section.highlights.all()
            for highlight in highlights:
                highlight_info = highlight.getAttr()
                response['highlights'].append(highlight_info)
                if highlight_info['type'] == 'tag':
                    if highlight_info['author_id'] == request.user.id:
                        mytags.add(highlight_info['content'])
                    alltags.add(highlight_info['content'])
        response['html'] = render_to_string('doc-tag-area.html', {'mytags': mytags, 'alltags': alltags})
        return HttpResponse(json.dumps(response), mimetype='application/json')

WORD = re.compile(r'\w+')
def calc_coverage(D_source, D_target):
    n = len(D_source)
    m = len(D_target)
    nv = [0] * m
    # calcualte nv
    for i, d_source in enumerate(D_source):
        idx_max = 0
        sim_max = 0
        for j, d_target in enumerate(D_target):
            sim_val = calc_sim(d_source, d_target)
            if (sim_val > sim_max):
                sim_max = sim_val
        k_set = []
        for j, d_target in enumerate(D_target):
            sim_val = calc_sim(d_source, d_target)
            if (sim_val == sim_max):
                k_set.append(j)
        k = random.choice(k_set)
        nv[k] += sim_max
    # calculate information content coverage
    Cov_c = sum(nv) / n
    print 'Cov_c', Cov_c
    # calculate information structure coverage
    if (m == 1):
        Cov_s = 1
    else:
        Cov_s = calc_entropy(nv)
    print 'Cov_s', Cov_s
    # calculate overall coverage
    Cov = Cov_c * Cov_s
    # calculate redundancy
    sum_outer = 0
    for i, d_target1 in enumerate(D_target):
        sum_inner = 0
        for j, d_target2 in enumerate(D_target):
            sum_inner += calc_sim(d_target1, d_target2)
        if (sum_inner != 0):
            sum_outer += (1 - 1.0 / sum_inner)
    Red = sum_outer / m
    return Cov, Red

def calc_sim(text1, text2):
    def get_cosine(vec1, vec2):
         intersection = set(vec1.keys()) & set(vec2.keys())
         numerator = sum([vec1[x] * vec2[x] for x in intersection])
         sum1 = sum([vec1[x]**2 for x in vec1.keys()])
         sum2 = sum([vec2[x]**2 for x in vec2.keys()])
         denominator = math.sqrt(sum1) * math.sqrt(sum2)
         if not denominator:
            return 0.0
         else:
            return float(numerator) / denominator
    def text_to_vector(text):
         words = WORD.findall(text)
         return Counter(words)
    vector1 = text_to_vector(text1)
    vector2 = text_to_vector(text2)
    return get_cosine(vector1, vector2)

def calc_entropy(_nv):
    freqList = [x * 1.0 / sum(_nv) for x in _nv]
    ent = 0.0
    for freq in freqList:
        if freq != 0:
            ent = ent + freq * math.log(freq, 2)
    ent = -ent / math.log(len(freqList), 2)
    return ent
