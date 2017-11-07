#coding:utf-8

from gensim import corpora, models, similarities, utils, matutils
import cPickle
import pickle as pk
import logging
import os
import numpy as np
import scipy
import sys
from collections import defaultdict

from nltk.corpus import stopwords 
from nltk.stem.wordnet import WordNetLemmatizer
from nltk.stem.porter import PorterStemmer
import string

logger = logging.getLogger('text_similar')
logging.basicConfig(format='%(asctime)s : %(levelname)s : %(message)s', level=logging.INFO)

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
    # Ignore errors even if the string is not proper UTF-8 or has
    # broken marker bytes.
    # Python built-in function unicode() can do this.
        return unicode(text, "utf-8", errors="ignore")
    else:
        # Assume the value object has proper __unicode__() method
        return unicode(text)

# https://stackoverflow.com/questions/6486738/clustering-using-latent-dirichlet-allocation-algo-in-gensim
class TextSimilar(utils.SaveLoad):

    def __init__(self):
        self.conf = {}

    def _preprocess(self):
        self.doc_complete = []
        with open(self.fname, 'rb') as f:
            self.doc_complete = pk.load(f)

        raw_docs = [to_unicode(doc['body'].strip()).split()[0:] for doc in self.doc_complete]
        cPickle.dump(raw_docs, open(self.conf['fname_raw_docs'], 'wb'))

        clean_docs = [to_unicode(clean((doc['title'] + " " + doc['body']).strip())).split()[0:] for doc in self.doc_complete]
        
        # remove words that appear only once
        frequency = defaultdict(int)
        for clean_doc in clean_docs:
            for token in clean_doc:
                frequency[token] += 1

        clean_docs = [[token for token in clean_doc if frequency[token] > 1] for clean_doc in clean_docs]

        cPickle.dump(clean_docs, open(self.conf['fname_clean_docs'], 'wb'))

        dictionary = corpora.Dictionary(clean_docs)
        dictionary.save(self.conf['fname_dict'])

        corpus = [dictionary.doc2bow(doc) for doc in clean_docs]
        corpora.MmCorpus.serialize(self.conf['fname_corpus'], corpus)

        return raw_docs, clean_docs, dictionary, corpus

    def _generate_conf(self):
        fname = self.fname[self.fname.rfind('/') + 1:]
        self.conf['fname_raw_docs']   = '%s.raw_docs' % fname
        self.conf['fname_clean_docs']   = '%s.clean_docs' % fname
        self.conf['fname_dict']   = '%s.dict' % fname
        self.conf['fname_corpus'] = '%s.mm' % fname

    def train(self, fname, is_pre=True, method='lda', **params):
        self.fname = fname
        self.method = method
        self._generate_conf()
        if is_pre:
            self.raw_docs, self.clean_docs, self.dictionary, corpus = self._preprocess()
        else:
            self.raw_docs = cPickle.load(open(self.conf['fname_raw_docs']))
            self.clean_docs = cPickle.load(open(self.conf['fname_clean_docs']))
            self.dictionary = corpora.Dictionary.load(self.conf['fname_dict'])
            corpus = corpora.MmCorpus(self.conf['fname_corpus'])

        if params is None:
            params = {}

        logger.info("training TF-IDF model")
        self.tfidf = models.TfidfModel(corpus, id2word=self.dictionary)
        corpus_tfidf = self.tfidf[corpus]
        
        # set random seed
        random_seed = 135
        state = np.random.RandomState(random_seed)

        if method == 'lsi':
            logger.info("training LSI model")
            self.lsi = models.LsiModel(corpus_tfidf, id2word=self.dictionary, **params)
            self.similar_index = similarities.MatrixSimilarity(self.lsi[corpus_tfidf])
            self.para = self.lsi[corpus_tfidf]
        elif method == 'lda_tfidf':
            logger.info("training LDA model")
            self.lda = models.LdaMulticore(corpus_tfidf, id2word=self.dictionary, random_state=state, workers=8, **params)
            self.similar_index = similarities.MatrixSimilarity(self.lda[corpus_tfidf])
            self.para = self.lda[corpus_tfidf]
        elif method == 'lda':
            logger.info("training LDA model")
            self.lda = models.LdaMulticore(corpus, id2word=self.dictionary, workers=8, random_state=state, **params)
            # self.lda = models.ldamodel.LdaModel(corpus, id2word = self.dictionary, **params)
            self.similar_index = similarities.MatrixSimilarity(self.lda[corpus])
            self.para = self.lda[corpus]
        elif method == 'logentropy':
            logger.info("training a log-entropy model")
            self.logent = models.LogEntropyModel(corpus, id2word=self.dictionary)
            self.similar_index = similarities.MatrixSimilarity(self.logent[corpus])
            self.para = self.logent[corpus]
        else:
            msg = "unknown semantic method %s" % method
            logger.error(msg)
            raise NotImplementedError(msg)

    def doc2vec(self, doc):
        doc_text = clean(doc['title'] + " " + doc['body'])
        bow = self.dictionary.doc2bow(to_unicode(doc_text).split())
        if self.method == 'lsi':
            return self.lsi[self.tfidf[bow]]
        elif self.method == 'lda':
            return self.lda[bow]
        elif self.method == 'lda_tfidf':
            return self.lda[self.tfidf[bow]]
        elif self.method == 'logentropy':
            return self.logent[bow]

    def find_similar(self, doc, n=10):
        vec = self.doc2vec(doc)
        sims = self.similar_index[vec]
        sims = sorted(enumerate(sims), key=lambda item: -item[1])
        ret = []
        for idx, value in sims[:n]:
            # print(idx, value)
            ret.append((idx, value))
        return ret

    def get_vectors(self):
        return self._get_vector(self.para)

    def _get_vector(self, corpus):

        def get_max_id():
            maxid = -1
            for document in corpus:
                maxid = max(maxid, max([-1] + [fieldid for fieldid, _ in document])) # [-1] to avoid exceptions from max(empty)
            return maxid

        num_features = 1 + get_max_id()
        index = np.empty(shape=(len(corpus), num_features), dtype=np.float32)
        for docno, vector in enumerate(corpus):
            if docno % 1000 == 0:
                print("PROGRESS: at document #%i/%i" % (docno, len(corpus)))

            if isinstance(vector, np.ndarray):
                pass
            elif scipy.sparse.issparse(vector):
                vector = vector.toarray().flatten()
            else:
                vector = matutils.unitvec(matutils.sparse2full(vector, num_features))
            index[docno] = vector        

        return index