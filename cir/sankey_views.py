import json
from django.http import HttpResponse
from django.template.loader import render_to_string
from django.utils.timezone import localtime
from cir.models import *
from datetime import datetime, date, time, timedelta

from . import preprocessing

day_chooser_lower = date(2015, 12, 6)
day_chooser_upper = date(2015, 12, 10)

def get_graph(request):
	relation = request.REQUEST.get('relation')
	# time upper bound
	time_upper_bound_str = request.REQUEST.get('time_upper_bound')
	print "upper", time_upper_bound_str
	tmp = time_upper_bound_str.split(" ")
	time_upper_bound = datetime(int(tmp[0]), int(tmp[1]), int(tmp[2]), int(tmp[3]), int(tmp[4]), int(tmp[5]))
	# time lower bound
	time_lower_bound_str = request.REQUEST.get('time_lower_bound')
	print "lower", time_lower_bound_str
	tmp = time_lower_bound_str.split(" ")
	time_lower_bound = datetime(int(tmp[0]), int(tmp[1]), int(tmp[2]), int(tmp[3]), int(tmp[4]), int(tmp[5]))

	print time_lower_bound
	print time_upper_bound

	forum_id = request.session['forum_id']
	# create links among themes and sections
	highlights = Highlight.objects.filter(created_at__lte = time_upper_bound).filter(created_at__gte = time_lower_bound)
	highlights = highlights.filter(created_at__lte = day_chooser_upper).filter(created_at__gte = day_chooser_lower)

	graph = {}
	graph["nodes"] = []
	graph["links"] = []

	if (relation == "dst"):
		pair_set = []
		for h in highlights:
			if (h.context != None and h.theme != None and DocSection.objects.get(id=h.context.id).forum_id == forum_id):
				section_id = h.context.id
				section_title = DocSection.objects.get(id = section_id).title
				theme_id = h.theme.id
				theme_name = h.theme.name
				# create have-been-used nodes
				section_node = {"name": "section-" + str(section_id), "text": section_title}
				if section_node not in graph["nodes"]:
					graph["nodes"].append(section_node)
				theme_node = {"name": "theme-" + str(theme_id), "text": theme_name}
				if theme_node not in graph["nodes"]:
					graph["nodes"].append(theme_node)
				# if no links yet, create one; otherwise, accumulate
				key = str(section_id) + " " + str(theme_id)
				if key not in pair_set:
					pair_set.append(key)
					graph["links"].append({"source": "section-" + str(section_id), "target": "theme-" + str(theme_id), "value":1})
				else:
					for item in graph["links"]:
						if (item["source"] == "section-" + str(section_id) and item["target"] == "theme-" + str(theme_id)):
							item["value"] = item["value"] + 1
							break
		# create dummy themes for alone sections
		isEmptySection = False
		sections = DocSection.objects.filter(forum_id=request.session['forum_id'])
		for section in sections:
			section_node = {"name": "section-" + str(section.id), "text": section.title}
			graph["links"].append({"source": "doc-" + str(section.doc.id), "target": "section-" + str(section.id), "value":1})
			if section_node not in graph["nodes"]:
				isEmptySection = True
				graph["nodes"].append(section_node)
				graph["links"].append({"source": "section-" + str(section.id), "target": "theme-dummy", "value":1})
		if isEmptySection:
			graph["nodes"].append({"name": "theme-dummy", "text": "theme-dummy"})
		# create dummy sections for not-alone themes
		isEmptyTheme = False
		themes = ClaimTheme.objects.filter(forum_id=request.session['forum_id'])
		for theme in themes:
			theme_node = {"name": "theme-" + str(theme.id), "text": theme.name}
			if theme_node not in graph["nodes"]:
				isEmptyTheme = True
				graph["nodes"].append(theme_node)
				graph["links"].append({"source": "section-dummy", "target": "theme-" + str(theme.id), "value":1})
		if isEmptyTheme:
			graph["nodes"].append({"name": "section-dummy", "text": "section-dummy"})
		docs = Doc.objects.filter(forum_id=request.session['forum_id'])
		for doc in docs:
			graph["nodes"].append({"name": "doc-" + str(doc.id), "text":  str(doc.title)})
		# graph["nodes"].append({"name":"Barry"})
		# graph["links"].append({"source":"Sarah","target":"Alice","value":4})
	elif (relation == "dt"):
		pair_set = []
		for h in highlights:
			if (h.context != None and h.theme != None and DocSection.objects.get(id=h.context.id).forum_id == forum_id):
				doc_id = DocSection.objects.get(id=h.context.id).doc.id
				doc_title = DocSection.objects.get(id=h.context.id).doc.title
				theme_id = h.theme.id
				theme_name = h.theme.name
				# create have-been-used nodes
				doc_node = {"name": "doc-" + str(doc_id), "text": doc_title}
				if doc_node not in graph["nodes"]:
					graph["nodes"].append(doc_node)
				theme_node = {"name": "theme-" + str(theme_id), "text": theme_name}
				if theme_node not in graph["nodes"]:
					graph["nodes"].append(theme_node)
				# if no links yet, create one; otherwise, accumulate
				key = str(doc_id) + " " + str(theme_id)
				if key not in pair_set:
					pair_set.append(key)
					graph["links"].append({"source": "doc-" + str(doc_id), "target": "theme-" + str(theme_id), "value":1})
				else:
					for item in graph["links"]:
						if (item["source"] == "doc-" + str(doc_id) and item["target"] == "theme-" + str(theme_id)):
							item["value"] = item["value"] + 1
							break
		isEmptyTheme = False
		themes = ClaimTheme.objects.filter(forum_id=request.session['forum_id'])
		for theme in themes:
			theme_node = {"name": "theme-" + str(theme.id), "text": theme.name}
			if theme_node not in graph["nodes"]:
				isEmptyTheme = True
				graph["nodes"].append(theme_node)
				graph["links"].append({"source": "doc-dummy", "target": "theme-" + str(theme.id), "value":1})
		if isEmptyTheme:
			graph["nodes"].append({"name": "doc-dummy", "text": "doc-dummy"})
	elif (relation == "dpt"):
		doc_author_pair_set = []
		author_theme_pair_set = []
		for h in highlights:
			if (h.context != None and h.theme != None and DocSection.objects.get(id=h.context.id).forum_id == forum_id):
				doc_id = DocSection.objects.get(id=h.context.id).doc.id
				doc_title = DocSection.objects.get(id=h.context.id).doc.title
				theme_id = h.theme.id
				theme_name = h.theme.name
				author_id = h.author.id
				author_name = h.author.last_name
				# create have-been-used nodes
				doc_node = {"name": "doc-" + str(doc_id), "text": doc_title}
				if doc_node not in graph["nodes"]:
					graph["nodes"].append(doc_node)
				author_node = {"name": "author-" + str(author_id), "text": author_name}
				if author_node not in graph["nodes"]:
					graph["nodes"].append(author_node)
				theme_node = {"name": "theme-" + str(theme_id), "text": theme_name}
				if theme_node not in graph["nodes"]:
					graph["nodes"].append(theme_node)
				# if no links yet, create one; otherwise, accumulate
				key = str(doc_id) + " " + str(author_id)
				if key not in doc_author_pair_set:
					doc_author_pair_set.append(key)
					graph["links"].append({"source": "doc-" + str(doc_id), "target": "author-" + str(author_id), "value":1})
				else:
					for item in graph["links"]:
						if (item["source"] == "doc-" + str(doc_id) and item["target"] == "author-" + str(author_id)):
							item["value"] = item["value"] + 1
							break
				key = str(author_id) + " " + str(theme_id)
				if key not in author_theme_pair_set:
					author_theme_pair_set.append(key)
					graph["links"].append({"source": "author-" + str(author_id), "target": "theme-" + str(theme_id), "value":1})
				else:
					for item in graph["links"]:
						if (item["source"] == "author-" + str(author_id) and item["target"] == "theme-" + str(theme_id)):
							item["value"] = item["value"] + 1
							break
		isEmptyTheme = False
		themes = ClaimTheme.objects.filter(forum_id=request.session['forum_id'])
		for theme in themes:
			theme_node = {"name": "theme-" + str(theme.id), "text": theme.name}
			if theme_node not in graph["nodes"]:
				isEmptyTheme = True
				graph["nodes"].append(theme_node)
				graph["links"].append({"source": "doc-dummy", "target": "theme-" + str(theme.id), "value":1})
		if isEmptyTheme:
			graph["nodes"].append({"name": "doc-dummy", "text": "doc-dummy"})
	return HttpResponse(json.dumps(graph), content_type='application/json')

def get_barchart(request):
	theme_id = request.REQUEST.get('theme_id')
	author_id = request.REQUEST.get('author_id')
	print "theme", theme_id
	print "author", author_id
	# for experiment purposes!!!!!!!!
	response = {}
	highlight_arr = []
	highlight_response = {}
	highlight_response_num = 20 # 0 ~ highlight_response_num
	forum_id = request.session['forum_id']
	highlights = Highlight.objects.all()
	if (theme_id != "-1"):
		highlights = highlights.filter(theme_id = theme_id)
	if (author_id != "-1"):
		highlights = highlights.filter(author_id = author_id)
	highlights = highlights.filter(created_at__lte = day_chooser_upper).filter(created_at__gte = day_chooser_lower)
	for h in highlights:
		if (h.context != None and h.theme != None and DocSection.objects.get(id=h.context.id).forum_id == forum_id):
			highlight_arr.append({"id":h.id, "created_at":localtime(h.created_at)});
	if (len(highlight_arr) > 0):
		highlight_arr = sorted(highlight_arr, key=lambda k:k['created_at'])
		highlight_response_interval = ((highlight_arr[len(highlight_arr) - 1]["created_at"] - highlight_arr[0]["created_at"]).total_seconds() + 1) / highlight_response_num
		highlight_bar = [0] * (highlight_response_num + 1)
		for item in highlight_arr:
			key = int(((item["created_at"] - highlight_arr[0]["created_at"]).total_seconds()) / highlight_response_interval)
			highlight_bar[key] = highlight_bar[key] + 1
			# print ((item["created_at"] - highlight_arr[0]["created_at"]).total_seconds() - key * highlight_response_interval)
		highlight_line = [0] * (highlight_response_num + 1)
		highlight_line[0] = highlight_bar[0]
		for i in range(1, highlight_response_num + 1):
			highlight_line[i] = highlight_line[i - 1] + highlight_bar[i]
		highlight_time = []
		highlight_time_upper_bound = []
		highlight_time_lower_bound = []
		for i in range(0, highlight_response_num):
			time_lower_bound = highlight_arr[0]["created_at"] +  timedelta(seconds=(i) * highlight_response_interval)
			time_upper_bound = highlight_arr[0]["created_at"] +  timedelta(seconds=(i + 1) * highlight_response_interval - 1)
			highlight_time_lower_bound.append(time_lower_bound.strftime("%Y %m %d %H %M %S"))
			highlight_time_upper_bound.append(time_upper_bound.strftime("%Y %m %d %H %M %S"))
			highlight_time.append(time_lower_bound.strftime("%H:%M"))
		highlight_bar.pop()
		highlight_line.pop()
		# response["highlight_bar"] = highlight_bar
		# response["highlight_line"] = highlight_line
		# response["highlight_time"] = highlight_time
		response["data"] = []
		for i in range (0, len(highlight_time)):
			item = {}
			item["time"] = highlight_time[i]
			item["time_upper_bound"] = highlight_time_upper_bound[i]
			item["time_lower_bound"] = highlight_time_lower_bound[i]
			item["num_nugget"] = highlight_bar[i]
			response["data"].append(item)
	return HttpResponse(json.dumps(response), content_type='application/json')

def get_doc(request):
	response = {}
	context = {}
	doc_id = request.REQUEST.get('doc_id')
	doc = Doc.objects.get(id=doc_id)
	context["doc"] = doc

	forum_id = request.session['forum_id']
	forum = Forum.objects.get(id = forum_id)
	wordcount={}
	for section in doc.sections.all():
		section_segmented_text = section.getAttr(forum)["segmented_text"]
		section_list = preprocessing.preprocess_pipeline(section_segmented_text, "english", "SnowballStemmer", False, True, True)
		for sentence_list in section_list:
			for word in sentence_list:
				if word not in wordcount:
					wordcount[word] = 1
				else:
					wordcount[word] += 1
	wordcount = {k:wordcount[k] for k in wordcount if wordcount[k] > 2}
	wordcount = sorted(wordcount.items(), key=lambda x: x[1], reverse=True)
	context["wordcount"] = wordcount
	response['html'] = render_to_string("vis/doc.html", context)
	return HttpResponse(json.dumps(response), content_type='application/json')

def put_workbench(request):
	user = request.user
	forum_id = request.session['forum_id']
	workbench_html = request.REQUEST.get('workbench_html')
	workbench, created = SankeyWorkbench.objects.get_or_create(author=user, forum_id=forum_id, 
		defaults={'content': ""})
	workbench.content = workbench_html
	workbench.save()
	response = {}
	return HttpResponse(json.dumps(response), content_type='application/json')

def get_workbench(request):
	user = request.user
	forum_id = request.session['forum_id']
	workbench_html = request.REQUEST.get('workbench_html')
	workbench, created = SankeyWorkbench.objects.get_or_create(author=user, forum_id=forum_id,
		defaults={'content': ""})
	response = {}
	response["workbench_html"] = workbench.content
	return HttpResponse(json.dumps(response), content_type='application/json')

def put_screenshot(request):
	screenshot_html = request.REQUEST.get('screenshot_html')
	screenshot = SankeyScreenshot.objects.create(content=screenshot_html)
	screenshot.save()
	response = {}
	response["screenshot_id"] = screenshot.id
	return HttpResponse(json.dumps(response), content_type='application/json')

def get_screenshot(request):
	screenshot_id = request.REQUEST.get('screenshot_id')
	screenshot = SankeyScreenshot.objects.get(id=screenshot_id)
	response = {}
	response["screenshot_html"] = screenshot.content
	return HttpResponse(json.dumps(response), content_type='application/json')

def get_item_by_more(dic, more):
	for item in dic:
		if (item["more"] == more):
			return item


