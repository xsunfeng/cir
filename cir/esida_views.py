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

WorkDir = os.path.join(PROJECT_PATH, 'corex/')

### Preprocessing Begin ###
print "Preprocess begins..."
start = time.time()

try:
    TrainTexts = pickle.load(open(WorkDir + "train_texts.pickle", "rb"))
    AllWords = pickle.load(open(WorkDir + "all_words.pickle", "rb"))
    DocWord = pickle.load(open(WorkDir + "doc_word.pickle", "rb"))
    WVModel = pickle.load(open(WorkDir + "wv_model.pickle", "rb"))
except (OSError, IOError) as e:
    print("No such file(s).")

# read complete docs

print "It took ", time.time() - start, " seconds to preprocess..."
### Preprocessing End ###

# Train the Initial CorEx topic model with 20 topics (Takes about 3.74s)
NumTopics = 20
MaxIter = 30
RandomSeed = 1989

print "Training init model..."
start = time.time()

InitModel = ct.Corex(n_hidden=NumTopics, words=AllWords, max_iter=MaxIter, verbose=False, seed=RandomSeed)
InitModel.fit(DocWord, words=AllWords)

print "It took ", time.time() - start, " seconds to train the model..."

def init_docs():
    doc_count = 0
    complete_docs = []
    with open(WorkDir + 'petitions_complete.csv') as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            doc = row.copy()
            doc['idx'] = doc_count
            indices = [i for i, x in enumerate(InitModel.labels[doc_count]) if x == True]
            doc['topic_ids_str'] = ' '.join(str(x) for x in indices)
            if float(row['signature_count']) >= float(row['signature_threshold']):
                doc['sig_percent'] = 100.0
            else:
                doc['sig_percent'] = 100.0 * float(row['signature_count']) / float(row['signature_threshold'])
            complete_docs.append(doc)
            doc_count = doc_count + 1
    return complete_docs

print "Init docs..."
start = time.time()

CompleteDocs = init_docs()

print "It took ", time.time() - start, " seconds to init docs..."

def get_init_cords(request):
    global CorexModels, CorexCords
    response = {}
    response['cords'] = CorexCords[-1]
    return HttpResponse(json.dumps(response), mimetype='application/json')

def gen_cords(corex_model):
    global CorexModels, CorexCords
    doc_vecs = []
    for i in range(len(TrainTexts)):
        doc_vec = list(corex_model.p_y_given_x[i])
        doc_vecs.append(doc_vec)
## fast t-SNE
    # from tsne import bh_sne
    # cords = bh_sne(np.array(doc_vecs), random_state=np.random.RandomState(RandomSeed))
## sklearn TSNE
    # from sklearn.manifold import TSNE
    # tsne = TSNE(n_components=2, random_state=RandomSeed)
    # cords = tsne.fit_transform(doc_vecs)
## PCA
    from sklearn.decomposition import PCA    
    pca = PCA(n_components=2, random_state=RandomSeed)
    cords = pca.fit_transform(doc_vecs)
    lines = []
    for i in range(len(corex_model.p_y_given_x)):
        line = {'cord_x': str(cords[i][0]),
                'cord_y': str(cords[i][1]),
                'body': CompleteDocs[i]['body'],
                'title': CompleteDocs[i]['title'],
                'doc_id': str(i)}
        topic_idx = 0;
        for j in range(corex_model.n_hidden):
            line['topic_' + str(j)] = doc_vecs[i][j]
            if (doc_vecs[i][j] >= doc_vecs[i][topic_idx]):
                topic_idx = j
        line['topic_id'] = topic_idx
        lines.append(line)
    return lines


print "Init global variables..."
start = time.time()

# state storage for models
CorexModels = []
CorexModels.append(InitModel)
CorexCords = []
CorexCords.append(gen_cords(InitModel))
# CorexDocs = []

print "It took ", time.time() - start, " seconds to init global variables..."

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

def gen_json(request):
    global CorexModels, CorexCords
    response = {}
    response['cords'] = CorexCords[-1]
    return HttpResponse(json.dumps(response), mimetype='application/json')

def enter_esida(request, forum_url):
    print "Enter esida..."
    start = time.time()

    global CorexModels, CorexCords
    print('There are currently ' + str(len(CorexModels)) + ' CorEx models')
    context = {}
    # need user name anyway.
    if request.user.is_authenticated():
        context['user_id'] = request.user.id
        context['user_name'] = request.user.get_full_name()
    else:
        context['user_id'] = '-1'
    forum = Forum.objects.get(url=forum_url)
    context['forum_id'] = forum.id
    context['docs'] = CompleteDocs
    context['num_docs'] = CorexModels[-1].p_y_given_x.shape[0]
    context['topics'] = []
    for n in range(CorexModels[-1].n_hidden):
        item = []
        for word, weight in CorexModels[-1].get_topics(topic=n, n_words=20):
            item.append(tuple((word, weight * 500, color_category30[n])))
        context['topics'].append(item)
    request.session['forum_id'] = context['forum_id']
    request.session['user_id'] = context['user_id']

    print "It took ", time.time() - start, " seconds to enter esida..."
    return render(request, "esida/index.html", context)

def update_topics(request):
    print('update topics')
    global CorexModels, CorexCords
    response = {}
    context = {}
    json_topics = request.REQUEST.get("json_topics")
    move_anchor_words = json.loads(json_topics)
    ct_model_move = ct.Corex(n_hidden=len(move_anchor_words), words=AllWords, max_iter=MaxIter, verbose=False, seed=RandomSeed)
    ct_model_move.fit(DocWord, words=AllWords, anchors=move_anchor_words, anchor_strength=6);
    CorexModels.append(ct_model_move)
    cords = gen_cords(ct_model_move)
    CorexCords.append(cords)
    context['topics'] = []
    for n in range(len(ct_model_move.get_topics())):
        item = []
        for word, weight in ct_model_move.get_topics(topic=n, n_words=20):
            item.append(tuple((word, weight * 500, color_category30[n])))
        context['topics'].append(item)
    response['topics-container'] = render_to_string("esida/topics-container.html", context)
    response['cords'] = cords
    return HttpResponse(json.dumps(response), mimetype='application/json')

def merge_topics(request):
    print('merge topics')
    global CorexModels, CorexCords
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
    ct_model_merge = ct.Corex(n_hidden=len(anchor_words_merge), words=AllWords, max_iter=MaxIter, verbose=False, seed=RandomSeed)
    ct_model_merge.fit(DocWord, words=AllWords, anchors=anchor_words_merge, anchor_strength=6);
    CorexModels.append(ct_model_merge)
    cords = gen_cords(ct_model_merge)
    CorexCords.append(cords)
    context['topics'] = []
    for n in range(len(ct_model_merge.get_topics())):
        item = []
        for word, weight in ct_model_merge.get_topics(topic=n, n_words=20):
            item.append(tuple((word, weight * 500, color_category30[n])))
        context['topics'].append(item)
    response['topics-container'] = render_to_string("esida/topics-container.html", context)
    response['cords'] = cords
    return HttpResponse(json.dumps(response), mimetype='application/json')

def split_topics(request):
    print('split topics')
    global CorexModels, CorexCords
    response = {}
    context = {}
    to_split_id = int(request.REQUEST.get("topic_id"))
    num_cluster = int(request.REQUEST.get("num_split"))
    json_topics = request.REQUEST.get("json_topics")
    anchor_words_split = json.loads(json_topics)

    def distance(word1, word2):
        return WVModel.wv.similarity(word1, word2)
     
    def buildSimilarityMatrix(samples):
        numOfSamples = len(samples)
        matrix = np.zeros(shape=(numOfSamples, numOfSamples))
        for i in range(len(matrix)):
            for j in range(len(matrix)):
                matrix[i,j] = distance(samples[i], samples[j])
        return matrix

    to_split_words = anchor_words_split[to_split_id]
    sim_mat = buildSimilarityMatrix(to_split_words)
    mat = np.matrix(sim_mat)
    res = SpectralClustering(num_cluster).fit_predict(mat)
    word_set = [[] for _ in range(num_cluster)]
    for i in range(len(to_split_words)):
        idx = res[i]
        word = to_split_words[i]
        word_set[idx].append(word)
    # create new anchor words
    del anchor_words_split[to_split_id]
    for i in range(num_cluster):
        anchor_words_split.append(word_set[i])

    ct_model_split = ct.Corex(n_hidden=(len(anchor_words_split)), words=AllWords, max_iter=MaxIter, verbose=False, seed=RandomSeed)
    ct_model_split.fit(DocWord, words=AllWords, anchors=anchor_words_split, anchor_strength=6);
    CorexModels.append(ct_model_split)
    cords = gen_cords(ct_model_split)
    CorexCords.append(cords)
    context['topics'] = []
    for n in range(len(ct_model_split.get_topics())):
        item = []
        for word, weight in ct_model_split.get_topics(topic=n, n_words=20):
            item.append(tuple((word, weight * 500, color_category30[n])))
        context['topics'].append(item)
    response['topics-container'] = render_to_string("esida/topics-container.html", context)
    response['cords'] = cords
    return HttpResponse(json.dumps(response), mimetype='application/json')

def last_state(request):
    print('last state')
    global CorexModels, CorexCords
    if (len(CorexModels) > 1):
        CorexModels = CorexModels[:-1]
        CorexCords = CorexCords[:-1]
    cur_model = CorexModels[-1]

    context = {}
    context['topics'] = []
    for n in range(len(cur_model.get_topics())):
        item = []
        for word, weight in cur_model.get_topics(topic=n, n_words=20):
            item.append(tuple((word, weight * 500, color_category30[n])))
        context['topics'].append(item)
    response = {}
    response['topics-container'] = render_to_string("esida/topics-container.html", context)
    response['cords'] = CorexCords[-1]
    return HttpResponse(json.dumps(response), mimetype='application/json')

def init_state(request):
    print('init state')
    global CorexModels, CorexCords
    if (len(CorexModels) > 1):
        CorexModels = CorexModels[:1]
        CorexCords = CorexCords[:1]
    cur_model = CorexModels[-1]

    context = {}
    context['topics'] = []
    for n in range(len(cur_model.get_topics())):
        item = []
        for word, weight in cur_model.get_topics(topic=n, n_words=20):
            item.append(tuple((word, weight * 500, color_category30[n])))
        context['topics'].append(item)
    response = {}
    response['topics-container'] = render_to_string("esida/topics-container.html", context)
    response['cords'] = CorexCords[-1]
    return HttpResponse(json.dumps(response), mimetype='application/json')

def get_doc(request):
    response = {}
    doc_idx = int(request.REQUEST.get("doc_idx"))
    response = CompleteDocs[doc_idx]
    return HttpResponse(json.dumps(response), mimetype='application/json')

def fprint(topic_model):
    _topics = topic_model.get_topics()
    for n, topic in enumerate(_topics):
        _topic_words,_ = zip(*topic)
        # print '{}: '.format(n) + ','.join(_topic_words)