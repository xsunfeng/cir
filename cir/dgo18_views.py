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
# replace this with a new document collection
doc_complete_name = 'doc_complete_50'
# replace this with a new trained lad model, also the .topics need to be updated
model_name = 'lda_lda_t18_r135_l50'

# pre-load documents
with open(work_dir + doc_complete_name + '.pkl', 'rb') as f:
    doc_complete_ = pk.load(f) 
    doc_complete = []
    num_docs = len(doc_complete_)
    for doc_id in range(num_docs):
        doc = doc_complete_[doc_id]
        doc['idx'] = doc_id
        doc['created_pretty'] = datetime.datetime.fromtimestamp(int(doc['created'])).strftime('%Y-%m-%d')
        doc_complete.append(doc)

# pre-load model
model = models.LdaMulticore.load(work_dir + model_name + '.model')
dictionary = cPickle.load(open(work_dir + doc_complete_name + '.pkl.dict'))
corpus = corpora.MmCorpus(work_dir + doc_complete_name + '.pkl.mm')

for i in range(0, model.num_topics):
    print model.print_topic(i)

from random import randint
colors = [''] * 30
for i in range(30):
    colors[i] = '%06X' % randint(0, 0xFFFFFF)

def gen_json(request):
    doc_vecs = []
    for i in range(len(train_texts)):
        doc_vec = list(cur_ct_model.p_y_given_x[i])
        doc_vecs.append(doc_vec)
    from sklearn.decomposition import PCA 
    pca = PCA(n_components=2)
    cords = pca.fit_transform([doc_vec for doc_vec in doc_vecs])
    print(cords)
    response = {}
    lines = []
    for i in range(len(cords)):
        body = u' '.join([word.encode('ascii', 'ignore').decode('ascii') for word in train_texts[i]])
        line = {'cord_x': str(cords[i][0]),
                'cord_y': str(cords[i][1]),
                'body': body}
        color = 0;
        for j in range(model.num_topics):
            line['topic_' + str(j)] = doc_vecs[i][j]
            if (doc_vecs[i][j] > doc_vecs[i][color]):
                color = j
        line['topic_id'] = color
        lines.append(line)
    response['pca'] = lines
    return HttpResponse(json.dumps(response), mimetype='application/json')

def enter_dgo18(request, forum_url):
    context = {}
    # need user name anyway.
    if request.user.is_authenticated():
        context['user_id'] = request.user.id
        context['user_name'] = request.user.get_full_name()
    else:
        context['user_id'] = '-1'
    forum = Forum.objects.get(url=forum_url)
    context['forum_id'] = forum.id
    context['topics'] = []
    for i in range(model.num_topics):
        item = []
        for word, weight in model.show_topic(i, topn=10):
            item.append(tuple((word, str(round(weight, 3)), weight * 500, colors[i])))
        context['topics'].append(item)
    request.session['forum_id'] = context['forum_id']
    request.session['user_id'] = context['user_id']
    context['docs'] = []
    for i in range(len(doc_complete)):
        item = {}
        item['id'] = str(i)
        item['title'] = doc_complete[i]['title']
        item['body'] = doc_complete[i]['body']
        context['docs'].append(item)
    return render(request, "dgo18/index.html", context)

def get_doc(request):
    doc_id = int(request.REQUEST.get("doc_id"))
    body = doc_complete[doc_id]['body']
    response = {}
    response['body'] = body
    terms = []
    for topic_id, prob in model[corpus[doc_id]]:
        terms.append('<div class="ui label">' + "Topic " + str(topic_id) + 
        '<div class="detail">' + str(round(prob, 5)) + '</div></div>')
    response['topics'] = ", ".join(terms)
    return HttpResponse(json.dumps(response), mimetype='application/json')

def save_weight(request):
    response = {}
    context = {}
    topic_id = int(request.REQUEST.get("topic_id"))
    word_text = request.REQUEST.get("word_text")
    new_weight = float(request.REQUEST.get("new_weight"))
    # update term weight
    print("before--------")
    print(model.expElogbeta[topic_id][dictionary.token2id[word_text]])
    print(new_weight)
    print("after--------")
    model.expElogbeta[topic_id][dictionary.token2id[word_text]] = new_weight
    terms = []
    doc_id = int(request.REQUEST.get("doc_id"))
    for topic_id, prob in model[corpus[doc_id]]:
        terms.append('<div class="ui label">' + "Topic " + str(topic_id) + 
        '<div class="detail">' + str(round(prob, 5)) + '</div></div>')
    response['topics'] = ", ".join(terms)
    return HttpResponse(json.dumps(response), mimetype='application/json')