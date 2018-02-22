# from django.shortcuts import render, render_to_response, redirect
# from django.template import RequestContext
# from django.db.models import Q
# from django.utils import timezone
# from django.template.loader import render_to_string
# from django.http import HttpResponse

# from cir.settings import PROJECT_PATH
# from cir.models import *
# from cir.phase_control import PHASE_CONTROL
# from cir.settings import DISPATCHER_URL

# from gensim import corpora, models, similarities, utils, matutils
# import cPickle
# import logging
# import scipy
# import sys
# from collections import defaultdict
# import time

# import pickle as pk
# import os
# import csv
# import datetime
# import json
# import string

# # helper functions
# from nltk.corpus import stopwords 
# from nltk.stem.wordnet import WordNetLemmatizer
# from nltk.stem.porter import PorterStemmer
# # clean strings
# stop = set(stopwords.words('english'))
# exclude = set(string.punctuation) 
# wordnet_lemmatizer = WordNetLemmatizer()
# porter_stemmer = PorterStemmer()
# ignore_words = ["get","country","obama","without","right","government","president","cause","end","becomes","men","say","including","take","ask","stop","support","1","want","petition","american","united", "state","thousand", "since","even","million", "hour", "it" ,"could", "mr", "two", "every", "may","new","know", "good", "one", "many", "time", "need", "would", "way", "u", "year", "also", "day", "make", "made", "people", "use", "must", "found", "please", "help"]
# def clean(doc):
#     stop_free = " ".join([i for i in doc.lower().split() if i not in stop])
#     punc_free = ''.join(ch for ch in stop_free if ch not in exclude)
#     lemmatized = " ".join(wordnet_lemmatizer.lemmatize(word) for word in punc_free.split())
#     short_removed = " ".join([i for i in lemmatized.split() if len(i) > 2])
#     freq_ignored = " ".join([i for i in short_removed.split() if i not in ignore_words])
#     # stemmed = " ".join(porter_stemmer.stem(word) for word in lemmatized.split())
#     return freq_ignored

# # convert to unicode
# def to_unicode(text):
#     if type(text) == str:
#         return unicode(text, "utf-8", errors="ignore")
#     else:
#         return unicode(text)

# # pre-load issue id and name pairs
# issue_names = {
#     '18'    :'Education',
#     '24'    :'Foreign Policy',
#     '25'    :'Health Care',
#     '29'    :'Immigration',
#     '133'   :'Rural Policy',
#     '175'   :'Urban Policy',
#     '296'   :'Energy & Environment',
#     '301'   :'Innovation: Arts & Technology',
#     '306'   :'Budget & Taxes',
#     '311'   :'Civil Rights & Equality',
#     '316'   :'Economy & Jobs',
#     '321'   :'Criminal Justice Reform',
#     '326'   :'Homeland Security & Defense',
#     '331'   :'Gun Violence',
#     '336'   :'Government & Regulatory Reform',
#     '341'   :'Technology & Innovation',
#     '346'   :'Transportation & Infrastructure',
#     '351'   :'Veterans & Military',
# }

# work_dir = os.path.join(PROJECT_PATH, 'lda/')
# # replace this with a new document collection
# doc_complete_name = 'doc_complete_50'
# # replace this with a new trained lad model, also the .topics need to be updated
# model_name = 'lda_lda_t18_r135_l50'

# # pre-load documents
# _file = work_dir + doc_complete_name + '.pkl'
# with open(_file, 'rb') as f:
#     doc_complete_ = pk.load(f) 
#     doc_complete = []
#     num_docs = len(doc_complete_)
#     for doc_id in range(num_docs):
#         doc = doc_complete_[doc_id]
#         doc['idx'] = doc_id
#         doc['created_pretty'] = datetime.datetime.fromtimestamp(int(doc['created'])).strftime('%Y-%m-%d')
#         doc_complete.append(doc)

# # pre-load model
# _model = work_dir + model_name + '.model'
# lda = models.LdaMulticore.load(_model)
# dictionary = cPickle.load(open(work_dir + doc_complete_name + '.pkl.dict'))
# corpus = corpora.MmCorpus(work_dir + doc_complete_name + '.pkl.mm')
# similar_index = similarities.MatrixSimilarity(lda[corpus])
# with open(work_dir + model_name + '.topics') as topic_json:
#     topic_id2name = json.load(topic_json)

# topic_id2words = {}
# for topic_id in range(lda.num_topics):
#     topic_words = []
#     for word, prob in lda.show_topic(topic_id, 20):
#         topic_words.append(word + ":" + "%.3f" %prob)
#     text = ", ".join(topic_words)
#     topic_id2words[str(topic_id)] = text

# # initiate doc_complete
# for doc in doc_complete:
#     doc['created_pretty'] = datetime.datetime.fromtimestamp(int(doc['created'])).strftime('%Y-%m-%d')
#     if doc['signature_count'] >= doc['signature_threshold']:
#         doc['sig_percent'] = 100.0
#     else:
#         doc['sig_percent'] = 100.0 * doc['signature_count'] / doc['signature_threshold']
#     doc['issue_names'] = []
#     # get issue names from issue ids
#     if (doc['issues'] is not None):
#         for issue_id in doc['issues'].split(','):
#             issue_id = issue_id.strip()
#             if (issue_id in issue_names):
#                 doc['issue_names'].append(issue_names[issue_id])
#     # get generated topic names
#     doc['topic_names'] = []
#     doc['topic_ids'] = []
#     doc_text = doc['title'] + ' ' + doc['body']
#     doc_clean = clean(doc_text)
#     bow = dictionary.doc2bow(to_unicode(doc_clean).split())
#     vec = lda[bow]
#     vec = sorted(vec, key=lambda tup: -tup[1])
#     doc['vec'] = vec
#     for topic_id, score in vec:
#         doc['topic_names'].append(topic_id2name[str(topic_id)])
#         doc['topic_ids'].append(str(topic_id))
#     doc['topic_ids_str'] = ", ".join(doc['topic_ids'])

# def enter_recom(request, forum_url):
#     context = {}
#     # need user name anyway.
#     if request.user.is_authenticated():
#         context['user_id'] = request.user.id
#         context['user_name'] = request.user.get_full_name()
#     else:
#         context['user_id'] = '-1'
#     forum = Forum.objects.get(url=forum_url)
#     context['forum_id'] = forum.id
#     request.session['forum_id'] = context['forum_id']
#     request.session['user_id'] = context['user_id']
#     context['docs'] = doc_complete
#     context['topics'] = []
#     # lda.print_topics()
#     for topic_id in range(lda.num_topics):
#         item = {}
#         item['words'] = topic_id2words[str(topic_id)]
#         item['title'] = topic_id2name[str(topic_id)]
#         item['id'] = str(topic_id)
#         context['topics'].append(item)
#     return render(request, "recom/index.html", context)

# def get_doc(request):
#     response = {}
#     target_id = int(request.REQUEST.get("doc_idx"))
#     response = doc_complete[target_id]
#     for q_category in ['topic_accuracy', 'petition_signed']:
#         response[q_category] = 0
#         forum_id = request.session['forum_id']
#         user_id = request.session['user_id']
#         petitionQuestions = PetitionQuestion.objects.filter(forum_id = forum_id, answerer_id = user_id, model_name = model_name,  
#             category = q_category, target_petition = target_id)
#         if (petitionQuestions.count() >= 1):
#             response[q_category] = petitionQuestions.order_by('-created_at')[0].score
#     return HttpResponse(json.dumps(response), mimetype='application/json')

# def get_recom_relevancy(request):
#     response = {}
#     target_id = int(request.REQUEST.get("target_id"))
#     source_id = int(request.REQUEST.get("source_id"))
#     response = doc_complete[target_id]
#     for q_category in ['recom_relevancy']:
#         response[q_category] = 0
#         forum_id = request.session['forum_id']
#         user_id = request.session['user_id']
#         petitionQuestions = PetitionQuestion.objects.filter(forum_id = forum_id, answerer_id = user_id, model_name = model_name,  
#             category = q_category, target_petition = target_id, source_petition = source_id)
#         if (petitionQuestions.count() >= 1):
#             response[q_category] = petitionQuestions.order_by('-created_at')[0].score
#     return HttpResponse(json.dumps(response), mimetype='application/json')

# def find_similar(request):
#     response = {}
#     context = {}
#     is_strict = request.REQUEST.get('is_strict')
#     doc_text = request.REQUEST.get('doc_text')
#     doc_clean = clean(doc_text)
#     bow = dictionary.doc2bow(to_unicode(doc_clean).split())
#     vec = lda[bow]
#     sims = similar_index[vec]
#     sims = sorted(enumerate(sims), key=lambda item: -item[1])
#     context['recom_docs'] = []
#     for idx, value in sims:
#         if (value > 0.1):
#             item = doc_complete[idx] 
#             topics_origin = [int(i[0]) for i in vec]
#             topics_target = [int(i[0]) for i in item['vec']]
#             if is_strict == '3' and (topics_origin != topics_target):
#                 continue
#             if is_strict == '2' and (set(topics_origin) != set(topics_target)):
#                 continue
#             item['score'] = str(value)
#             item['idx'] = str(idx)
#             context['recom_docs'].append(item)
#     response['recom_doc_list'] = render_to_string("recom/recom_doc_list.html", context)
#     return HttpResponse(json.dumps(response), mimetype='application/json')

# def answer_petition_question(request):
#     forum_id = request.session['forum_id']
#     user_id = request.session['user_id']
#     score = request.REQUEST.get('score')
#     category = request.REQUEST.get('category')
#     target_id = request.REQUEST.get('target_id')
#     source_id = request.REQUEST.get('source_id')
#     now = timezone.now()
#     newPetitionQuestion = PetitionQuestion(forum_id = forum_id, answerer_id = user_id, score = score, model_name = model_name,  
#         category = category, target_petition = target_id, source_petition = source_id, created_at = now)
#     newPetitionQuestion.save()
#     response = {}
#     return HttpResponse(json.dumps(response), mimetype='application/json')