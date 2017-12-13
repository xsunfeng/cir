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

import os
import re
import operator
import warnings
import gensim
import time
import numpy as np
import simplejson as json

from sklearn.cluster import SpectralClustering
from gensim.models import CoherenceModel, LdaModel, LsiModel, HdpModel
from gensim.models.wrappers import LdaMallet
from gensim.corpora import Dictionary
from pprint import pprint

import logging
import csv
import pickle

import numpy as np
import corex_topic as ct
import scipy.sparse as ss

from sklearn.datasets import fetch_20newsgroups
from sklearn.feature_extraction.text import CountVectorizer

work_dir = os.path.join(PROJECT_PATH, 'corex/')

### Preprocessing Begin ###
print "preprocess begins."
start = time.time()

try:
    train_texts = pickle.load(open(work_dir + "train_texts.pickle", "rb"))
    all_words = pickle.load(open(work_dir + "all_words.pickle", "rb"))
    doc_word = pickle.load(open(work_dir + "doc_word.pickle", "rb"))
    wv_model = pickle.load(open(work_dir + "wv_model.pickle", "rb"))
except (OSError, IOError) as e:
    print("No such file(s).")

print "it took ", time.time() - start, " seconds to preprocess."
### Preprocessing End ###


# Train the Initial CorEx topic model with 20 topics (Takes about 3.74s)
seed = 1989
num_topics = 20
anchor_words = []

ct_model = ct.Corex(n_hidden=num_topics, words=all_words, max_iter=20, verbose=False, seed=seed)
ct_model.fit(doc_word, words=all_words);
# Print all topics from the CorEx topic model
topics = ct_model.get_topics()
for n in range(num_topics):
    topic_words,_ = zip(*ct_model.get_topics(topic=n, n_words=20))
    print '{}: '.format(n) + ', '.join(topic_words[:12])
    anchor_words.append(list(topic_words))
# End

from random import randint
colors = [''] * 30
for i in range(30):
    colors[i] = '%06X' % randint(0, 0xFFFFFF)

def enter_esida(request, forum_url):
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
    for n in range(num_topics):
        item = []
        for word, weight in ct_model.get_topics(topic=n, n_words=20):
            item.append(tuple((word, weight * 500, colors[n])))
        context['topics'].append(item)
    request.session['forum_id'] = context['forum_id']
    request.session['user_id'] = context['user_id']
    return render(request, "esida/index.html", context)

def update_topics(request):
    response = {}
    context = {}
    json_topics = request.REQUEST.get("json_topics")
    move_anchor_words = json.loads(json_topics)
    ct_model_move = ct.Corex(n_hidden=len(move_anchor_words), words=all_words, max_iter=20, verbose=False, seed=seed)
    ct_model_move.fit(doc_word, words=all_words, anchors=move_anchor_words, anchor_strength=6);
    context['topics'] = []
    for n in range(len(ct_model_move.get_topics())):
        item = []
        for word, weight in ct_model_move.get_topics(topic=n, n_words=20):
            item.append(tuple((word, weight * 500, colors[n])))
        context['topics'].append(item)
    response['topics-container'] = render_to_string("esida/topics-container.html", context)
    return HttpResponse(json.dumps(response), mimetype='application/json')

def merge_topics(request):
    response = {}
    context = {}
    topic1_id = int(request.REQUEST.get("topic1_id"))
    topic2_id = int(request.REQUEST.get("topic2_id"))
    json_topics = request.REQUEST.get("json_topics")
    _anchor_words = json.loads(json_topics)

    def merge_topics(idx1, idx2, topic_words):
        idx1, idx2 = min(idx1, idx2), max(idx2, idx1)
        res = []
        for idx, words in enumerate(topic_words):
            res.append(list(words))
            if(idx == idx2):
                res[idx1] = res[idx2] + res[idx1]
        del res[idx2]
        return res

    anchor_words_merge = merge_topics(topic1_id, topic2_id, _anchor_words)
    ct_model_merge = ct.Corex(n_hidden=len(anchor_words_merge), words=all_words, max_iter=20, verbose=False, seed=seed)
    ct_model_merge.fit(doc_word, words=all_words, anchors=anchor_words_merge, anchor_strength=6);
    context['topics'] = []
    for n in range(len(ct_model_merge.get_topics())):
        item = []
        for word, weight in ct_model_merge.get_topics(topic=n, n_words=20):
            item.append(tuple((word, weight * 500, colors[n])))
        context['topics'].append(item)
    response['topics-container'] = render_to_string("esida/topics-container.html", context)
    return HttpResponse(json.dumps(response), mimetype='application/json')

def split_topics(request):
    response = {}
    context = {}
    toSplitId = int(request.REQUEST.get("topic_id"))
    json_topics = request.REQUEST.get("json_topics")
    _anchor_words = json.loads(json_topics)

    def distance(word1, word2):
        return wv_model.wv.similarity(word1, word2)
     
    def buildSimilarityMatrix(samples):
        numOfSamples = len(samples)
        matrix = np.zeros(shape=(numOfSamples, numOfSamples))
        for i in range(len(matrix)):
            for j in range(len(matrix)):
                matrix[i,j] = distance(samples[i], samples[j])
        return matrix

    samples = _anchor_words[toSplitId]
    sim_mat = buildSimilarityMatrix(samples)

    num_cluster = 2 # categorize the words into 2 clusters; will allow config later
    mat = np.matrix(sim_mat)
    res = SpectralClustering(num_cluster).fit_predict(mat)
    ll = [[] for _ in range(num_cluster)]
    for i in range(len(samples)):
        idx = res[i]
        word = samples[i]
        ll[idx].append(word)
    # create new anchor words
    anchor_words_split = list(_anchor_words)
    del anchor_words_split[toSplitId]
    for i in range(num_cluster):
        anchor_words_split.insert(toSplitId, ll[i])

    ct_model_split = ct.Corex(n_hidden=(len(anchor_words_split)), words=all_words, max_iter=20, verbose=False, seed=seed)
    ct_model_split.fit(doc_word, words=all_words, anchors=anchor_words_split, anchor_strength=6);
    context['topics'] = []
    for n in range(len(ct_model_split.get_topics())):
        item = []
        for word, weight in ct_model_split.get_topics(topic=n, n_words=20):
            item.append(tuple((word, weight * 500, colors[n])))
        context['topics'].append(item)
    response['topics-container'] = render_to_string("esida/topics-container.html", context)
    return HttpResponse(json.dumps(response), mimetype='application/json')

def fprint(topic_model):
    _topics = topic_model.get_topics()
    for n, topic in enumerate(_topics):
        topic_words,_ = zip(*topic)
        print '{}: '.format(n) + ','.join(topic_words)