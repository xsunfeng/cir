from django.shortcuts import render, render_to_response, redirect
from django.template import RequestContext
from django.db.models import Q
from django.utils import timezone
from django.template.loader import render_to_string
from django.http import HttpResponse

from cir.settings import PROJECT_PATH
from cir.models import *
from cir.phase_control import PHASE_CONTROL
from cir.settings import DISPATCHER_URL

from gensim import corpora, models, similarities, utils, matutils
import cPickle
import logging
import scipy
import sys
from collections import defaultdict
import time

import pickle as pk
import os
import csv
import datetime
import json
import string

# helper functions
from nltk.corpus import stopwords 
from nltk.stem.wordnet import WordNetLemmatizer
from nltk.stem.porter import PorterStemmer
# clean strings
stop = set(stopwords.words('english'))
exclude = set(string.punctuation) 
wordnet_lemmatizer = WordNetLemmatizer()
porter_stemmer = PorterStemmer()
ignore_words = ["get","country","obama","without","right","government","president","cause","end","becomes","men","say","including","take","ask","stop","support","1","want","petition","american","united", "state","thousand", "since","even","million", "hour", "it" ,"could", "mr", "two", "every", "may","new","know", "good", "one", "many", "time", "need", "would", "way", "u", "year", "also", "day", "make", "made", "people", "use", "must", "found", "please", "help"]
def clean(doc):
    stop_free = " ".join([i for i in doc.lower().split() if i not in stop])
    punc_free = ''.join(ch for ch in stop_free if ch not in exclude)
    lemmatized = " ".join(wordnet_lemmatizer.lemmatize(word) for word in punc_free.split())
    short_removed = " ".join([i for i in lemmatized.split() if len(i) > 2])
    freq_ignored = " ".join([i for i in short_removed.split() if i not in ignore_words])
    # stemmed = " ".join(porter_stemmer.stem(word) for word in lemmatized.split())
    return freq_ignored

# convert to unicode
def to_unicode(text):
    if type(text) == str:
        return unicode(text, "utf-8", errors="ignore")
    else:
        return unicode(text)

# pre-load issue id and name pairs
issue_names = {
    '18'    :'Education',
    '24'    :'Foreign Policy',
    '25'    :'Health Care',
    '29'    :'Immigration',
    '133'   :'Rural Policy',
    '175'   :'Urban Policy',
    '296'   :'Energy & Environment',
    '301'   :'Innovation: Arts & Technology',
    '306'   :'Budget & Taxes',
    '311'   :'Civil Rights & Equality',
    '316'   :'Economy & Jobs',
    '321'   :'Criminal Justice Reform',
    '326'   :'Homeland Security & Defense',
    '331'   :'Gun Violence',
    '336'   :'Government & Regulatory Reform',
    '341'   :'Technology & Innovation',
    '346'   :'Transportation & Infrastructure',
    '351'   :'Veterans & Military',
}

work_dir = os.path.join(PROJECT_PATH, 'lda/')
doc_complete_name = 'doc_complete_50'
model_name = 'lda_lda_t18_r135_l50'

# pre-load documents
_file = work_dir + doc_complete_name + '.pkl'
with open(_file, 'rb') as f:
    doc_complete_ = pk.load(f) 
    doc_complete = []
    num_docs = len(doc_complete_)
    for doc_id in range(num_docs):
        doc = doc_complete_[doc_id]
        doc['idx'] = doc_id
        doc['created_pretty'] = datetime.datetime.fromtimestamp(int(doc['created'])).strftime('%Y-%m-%d')
        doc_complete.append(doc)

# pre-load model
_model = work_dir + model_name + '.model'
lda = models.LdaMulticore.load(_model)
dictionary = cPickle.load(open(work_dir + doc_complete_name + '.pkl.dict'))
corpus = corpora.MmCorpus(work_dir + doc_complete_name + '.pkl.mm')
similar_index = similarities.MatrixSimilarity(lda[corpus])
with open(work_dir + model_name + '.topics') as topic_json:
    topic_id2name = json.load(topic_json)

topic_id2words = {}
for topic_id in range(lda.num_topics):
    topic_words = []
    for word, prob in lda.show_topic(topic_id, 20):
        topic_words.append(word + ":" + "%.3f" %prob)
    text = ", ".join(topic_words)
    topic_id2words[str(topic_id)] = text

def enter_recom(request):
    context = {}
    context['docs'] = doc_complete
    context['topics'] = []
    lda.print_topics()
    for topic_id in range(lda.num_topics):
        item = {}
        item['words'] = topic_id2words[str(topic_id)]
        item['title'] = topic_id2name[str(topic_id)]
        context['topics'].append(item)
    return render(request, "recom/index.html", context)

def get_doc(request):
    response = {}
    doc_idx = int(request.REQUEST.get("doc_idx"))
    doc = doc_complete[doc_idx]
    doc['created_pretty'] = datetime.datetime.fromtimestamp(int(doc['created'])).strftime('%Y-%m-%d')
    if doc['signature_count'] >= doc['signature_threshold']:
        doc['sig_percent'] = 100.0
    else:
        doc['sig_percent'] = 100.0 * doc['signature_count'] / doc['signature_threshold']
    doc['issue_names'] = []
    # get issue names from issue ids
    if (doc['issues'] is not None):
        for issue_id in doc['issues'].split(','):
            issue_id = issue_id.strip()
            if (issue_id in issue_names):
                doc['issue_names'].append(issue_names[issue_id])
    # get generated topic names
    doc['topic_names'] = []
    doc['topic_words'] = []
    doc_text = doc['title'] + ' ' + doc['body']
    doc_clean = clean(doc_text)
    bow = dictionary.doc2bow(to_unicode(doc_clean).split())
    vec = lda[bow]
    vec = sorted(vec, key=lambda tup: -tup[1])
    for topic_id, score in vec:
        doc['topic_names'].append(topic_id2name[str(topic_id)])
        doc['topic_words'].append(topic_id2words[str(topic_id)])
    response = doc
    return HttpResponse(json.dumps(response), mimetype='application/json')

def find_similar(request):
    response = {}
    context = {}
    doc_text = request.REQUEST.get('doc_text')
    doc_clean = clean(doc_text)
    bow = dictionary.doc2bow(to_unicode(doc_clean).split())
    vec = lda[bow]
    sims = similar_index[vec]
    sims = sorted(enumerate(sims), key=lambda item: -item[1])
    context['recom_docs'] = []
    for idx, value in sims:
        if (value > 0.1):
            item = doc_complete[idx]
            item['score'] = str(value)
            item['idx'] = str(idx)
            context['recom_docs'].append(item)
    response['recom_doc_list'] = render_to_string("recom/recom_doc_list.html", context)
    return HttpResponse(json.dumps(response), mimetype='application/json')