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

# read complete docs

print "it took ", time.time() - start, " seconds to preprocess."
### Preprocessing End ###

# Train the Initial CorEx topic model with 20 topics (Takes about 3.74s)
seed = 1989
num_topics = 20
max_iter = 30
random_state = 1989

ct_model = ct.Corex(n_hidden=num_topics, words=all_words, max_iter=max_iter, verbose=False, seed=seed)
ct_model.fit(doc_word, words=all_words)

complete_docs = []
doc_count = 0
with open(work_dir + 'petitions_complete.csv') as csvfile:
    reader = csv.DictReader(csvfile)
    for row in reader:
        doc = row.copy()
        doc['idx'] = doc_count
        indices = [i for i, x in enumerate(ct_model.labels[doc_count]) if x == True]
        doc['topic_ids_str'] = ' '.join(str(x) for x in indices)
        if float(row['signature_count']) >= float(row['signature_threshold']):
            doc['sig_percent'] = 100.0
        else:
            doc['sig_percent'] = 100.0 * float(row['signature_count']) / float(row['signature_threshold'])
        complete_docs.append(doc)
        doc_count = doc_count + 1

def gen_cords(corex_model):
    doc_vecs = []
    for i in range(len(train_texts)):
        doc_vec = list(corex_model.p_y_given_x[i])
        doc_vecs.append(doc_vec)
    from tsne import bh_sne
    _cords = bh_sne(np.array(doc_vecs), random_state=np.random.RandomState(random_state))
    _lines = []
    for i in range(len(corex_model.p_y_given_x)):
        _line = {'cord_x': str(_cords[i][0]),
                'cord_y': str(_cords[i][1]),
                'body': complete_docs[i]['body'],
                'title': complete_docs[i]['title'],
                'doc_id': str(i)}
        topic_idx = 0;
        for j in range(corex_model.n_hidden):
            _line['topic_' + str(j)] = doc_vecs[i][j]
            if (doc_vecs[i][j] >= doc_vecs[i][topic_idx]):
                topic_idx = j
        _line['topic_id'] = topic_idx
        _lines.append(_line)
    return _lines

# state storage for models
corex_models = []
corex_models.append(ct_model)
corex_cords = []
corex_cords.append(gen_cords(ct_model))
# corex_docs = []

# Print all topics from the CorEx topic model
# def gen_topic_words(corex_model):
#     topic_words = []
#     for n in range(corex_model.n_hidden):
#         words,_ = zip(*corex_model.get_topics(topic=n, n_words=20))
#         topic_words.append(list(words))
#     return topic_words
# End

color_category30 = [
"d3fe14",  
"1da49c", 
"ccf6e9", 
"a54509", 
"7d5bf0", 
"d08f5d", 
"fec24c",  
"0d906b", 
"7a9293", 
"7ed8fe",  
"d9a742",  
"c7ecf9",  
"72805e", 
"dccc69",  
"86757e",  
"a0acd2",  
"fecd0f",  
"4a9bda", 
"bdb363",  
"b1485d",  
"b98b91",  
"86df9c",  
"6e6089",
"826cae", 
"4b8d5f", 
"8193e5",  
"b39da2", 
"5bfce4", 
"df4280", 
"a2aca6"
]

count = 0

def gen_json(request):
    response = {}
    response['cords'] = corex_cords[-1]
    return HttpResponse(json.dumps(response), mimetype='application/json')

def enter_esida(request, forum_url):
    print('There are currently ' + str(len(corex_models)) + ' CorEx models')
    context = {}
    # need user name anyway.
    if request.user.is_authenticated():
        context['user_id'] = request.user.id
        context['user_name'] = request.user.get_full_name()
    else:
        context['user_id'] = '-1'
    forum = Forum.objects.get(url=forum_url)
    context['forum_id'] = forum.id
    context['docs'] = complete_docs
    context['num_docs'] = corex_models[-1].p_y_given_x.shape[0]
    context['topics'] = []
    for n in range(corex_models[-1].n_hidden):
        item = []
        for word, weight in corex_models[-1].get_topics(topic=n, n_words=20):
            item.append(tuple((word, weight * 500, color_category30[n])))
        context['topics'].append(item)
    request.session['forum_id'] = context['forum_id']
    request.session['user_id'] = context['user_id']
    return render(request, "esida/index.html", context)

def get_cords(request):
    response = {}
    response['cords'] = corex_cords[-1]
    # print("There are " + str(len(corex_cords)) + " cords.")
    return HttpResponse(json.dumps(response), mimetype='application/json')

def update_topics(request):
    response = {}
    context = {}
    json_topics = request.REQUEST.get("json_topics")
    move_anchor_words = json.loads(json_topics)
    ct_model_move = ct.Corex(n_hidden=len(move_anchor_words), words=all_words, max_iter=max_iter, verbose=False, seed=seed)
    ct_model_move.fit(doc_word, words=all_words, anchors=move_anchor_words, anchor_strength=6);
    corex_models.append(ct_model_move)
    corex_cords.append(gen_cords(ct_model_move))
    context['topics'] = []
    for n in range(len(ct_model_move.get_topics())):
        item = []
        for word, weight in ct_model_move.get_topics(topic=n, n_words=20):
            item.append(tuple((word, weight * 500, color_category30[n])))
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

    def merge_topics_helper(idx1, idx2, _topic_words):
        idx1, idx2 = min(idx1, idx2), max(idx2, idx1)
        res = []
        for idx, words in enumerate(_topic_words):
            res.append(list(words))
            if(idx == idx2):
                res[idx1] = res[idx2] + res[idx1]
        del res[idx2]
        return res

    anchor_words_merge = merge_topics_helper(topic1_id, topic2_id, _anchor_words)
    ct_model_merge = ct.Corex(n_hidden=len(anchor_words_merge), words=all_words, max_iter=max_iter, verbose=False, seed=seed)
    ct_model_merge.fit(doc_word, words=all_words, anchors=anchor_words_merge, anchor_strength=6);
    corex_models.append(ct_model_merge)
    corex_cords.append(gen_cords(ct_model_merge))
    context['topics'] = []
    for n in range(len(ct_model_merge.get_topics())):
        item = []
        for word, weight in ct_model_merge.get_topics(topic=n, n_words=20):
            item.append(tuple((word, weight * 500, color_category30[n])))
        context['topics'].append(item)
    response['topics-container'] = render_to_string("esida/topics-container.html", context)
    return HttpResponse(json.dumps(response), mimetype='application/json')

def split_topics(request):
    response = {}
    context = {}
    toSplitId = int(request.REQUEST.get("topic_id"))
    json_topics = request.REQUEST.get("json_topics")
    num_cluster = int(request.REQUEST.get("num_split"))

    json_topics = request.REQUEST.get("json_topics")
    anchor_words_split = json.loads(json_topics)

    _anchor_words = anchor_words_split[toSplitId]
    def distance(word1, word2):
        return wv_model.wv.similarity(word1, word2)
     
    def buildSimilarityMatrix(samples):
        numOfSamples = len(samples)
        matrix = np.zeros(shape=(numOfSamples, numOfSamples))
        for i in range(len(matrix)):
            for j in range(len(matrix)):
                matrix[i,j] = distance(samples[i], samples[j])
        return matrix

    samples = _anchor_words
    sim_mat = buildSimilarityMatrix(samples)

    # num_cluster = 2 # categorize the words into 2 clusters; will allow config later
    mat = np.matrix(sim_mat)
    res = SpectralClustering(num_cluster).fit_predict(mat)
    ll = [[] for _ in range(num_cluster)]
    for i in range(len(samples)):
        idx = res[i]
        word = samples[i]
        ll[idx].append(word)
    # create new anchor words
    del anchor_words_split[toSplitId]
    for i in range(num_cluster):
        anchor_words_split.append(ll[i])

    ct_model_split = ct.Corex(n_hidden=(len(anchor_words_split)), words=all_words, max_iter=max_iter, verbose=False, seed=seed)
    ct_model_split.fit(doc_word, words=all_words, anchors=anchor_words_split, anchor_strength=6);
    corex_models.append(ct_model_split)
    corex_cords.append(gen_cords(ct_model_split))
    context['topics'] = []
    for n in range(len(ct_model_split.get_topics())):
        item = []
        for word, weight in ct_model_split.get_topics(topic=n, n_words=20):
            item.append(tuple((word, weight * 500, color_category30[n])))
        context['topics'].append(item)
    response['topics-container'] = render_to_string("esida/topics-container.html", context)
    return HttpResponse(json.dumps(response), mimetype='application/json')

def last_state(request):
    global corex_models
    global corex_cords
    if (len(corex_models) > 1):
        corex_models = corex_models[:-1]
        corex_cords = corex_cords[:-1]
    context = {}
    context['topics'] = []
    cur_model = corex_models[-1]
    for n in range(len(cur_model.get_topics())):
        item = []
        for word, weight in cur_model.get_topics(topic=n, n_words=20):
            item.append(tuple((word, weight * 500, color_category30[n])))
        context['topics'].append(item)
    response = {}
    response['topics-container'] = render_to_string("esida/topics-container.html", context)
    return HttpResponse(json.dumps(response), mimetype='application/json')

def init_state(request):
    global corex_models
    global corex_cords
    if (len(corex_models) > 1):
        corex_models = corex_models[:1]
        corex_cords = corex_cords[:1]
    context = {}
    context['topics'] = []
    cur_model = corex_models[-1]
    for n in range(len(cur_model.get_topics())):
        item = []
        for word, weight in cur_model.get_topics(topic=n, n_words=20):
            item.append(tuple((word, weight * 500, color_category30[n])))
        context['topics'].append(item)
    response = {}
    response['topics-container'] = render_to_string("esida/topics-container.html", context)
    return HttpResponse(json.dumps(response), mimetype='application/json')

def get_doc(request):
    response = {}
    doc_idx = int(request.REQUEST.get("doc_idx"))
    response = complete_docs[doc_idx]
    return HttpResponse(json.dumps(response), mimetype='application/json')

def fprint(topic_model):
    _topics = topic_model.get_topics()
    for n, topic in enumerate(_topics):
        _topic_words,_ = zip(*topic)
        # print '{}: '.format(n) + ','.join(_topic_words)