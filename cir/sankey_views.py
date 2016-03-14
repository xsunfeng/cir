import json
import re
import math
import numpy as np
from django.http import HttpResponse
from django.template.loader import render_to_string
from django.utils.timezone import localtime
from django.utils import timezone
from cir.models import *
from datetime import datetime, date, time, timedelta

from . import preprocessing

day_chooser_lower = date(2016, 3, 10)
day_chooser_upper = date(2016, 3, 12)

def get_graph(request):
	relation = request.REQUEST.get('relation')
	# filters
	author_ids = request.REQUEST.get('author_ids').split(" ")
	theme_ids = request.REQUEST.get('theme_ids').split(" ")
	doc_ids = request.REQUEST.get('doc_ids').split(" ")
	xl = request.REQUEST.get('time_upper_bound')
	time_upper_bound = datetime.fromtimestamp(float(xl) / 1000.0)
	xs = request.REQUEST.get('time_lower_bound')
	time_lower_bound = datetime.fromtimestamp(float(xs) /1000.0)
	xl = int(xl)
	xs = int(xs)
	# initialize
	forum_id = request.session['forum_id']
	forum = Forum.objects.get(id = forum_id)
	highlights = Highlight.objects.all()
	highlights = highlights.filter(created_at__lte = day_chooser_upper).filter(created_at__gte = day_chooser_lower)
	highlights = highlights.filter(created_at__lte = time_upper_bound).filter(created_at__gte = time_lower_bound)
	if (author_ids[0] != ""):
		highlights = highlights.filter(author_id__in = author_ids)
	if (theme_ids[0] != ""):
		highlights = highlights.filter(theme_id__in = theme_ids)

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
	elif (relation == "dp"):
		doc_author_pair_set = []
		for h in highlights:
			if (h.context != None and DocSection.objects.get(id=h.context.id).forum_id == forum_id):
				doc_id = DocSection.objects.get(id=h.context.id).doc.id
				doc_title = DocSection.objects.get(id=h.context.id).doc.title
				author_id = h.author.id
				author_name = h.author.last_name
				# create have-been-used nodes
				doc_node = {"name": "doc-" + str(doc_id), "text": doc_title}
				if doc_node not in graph["nodes"]:
					graph["nodes"].append(doc_node)
				author_node = {"name": "author-" + str(author_id), "text": author_name}
				if author_node not in graph["nodes"]:
					graph["nodes"].append(author_node)
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
	# graph["doc_length_map"] = doc_length_map
	return HttpResponse(json.dumps(graph), content_type='application/json')

def get_barchart(request):
	# filters
	author_ids = request.REQUEST.get('author_ids').split(" ")
	theme_ids = request.REQUEST.get('theme_ids').split(" ")
	doc_ids = request.REQUEST.get('doc_ids').split(" ")
	selected = request.REQUEST.get('selected')
	xl = request.REQUEST.get('time_upper_bound')
	time_upper_bound = datetime.fromtimestamp(float(xl) / 1000.0)
	xs = request.REQUEST.get('time_lower_bound')
	time_lower_bound = datetime.fromtimestamp(float(xs) /1000.0)
	xl = int(xl)
	xs = int(xs)
	# initialize
	response = {}
	highlight_arr = []
	highlight_response = {}
	highlight_response_num = 20 # 0 ~ highlight_response_num
	forum_id = request.session['forum_id']
	forum = Forum.objects.get(id=forum_id)

	highlights = Highlight.objects.all()
	highlights = highlights.filter(created_at__lte = day_chooser_upper).filter(created_at__gte = day_chooser_lower)
	highlights = highlights.filter(created_at__lte = time_upper_bound).filter(created_at__gte = time_lower_bound)
	# there are filters
	if (author_ids[0] != "" or theme_ids[0] != ""):
		print "not first time, no filters~~~~~~~~~~"
		response["data"] = []
		interval = int(math.ceil((xl - xs) / highlight_response_num));
		for i in range(0, highlight_response_num):
			item = {}
			item["time_lower_bound"] = xs + i * interval
			item["time_upper_bound"] = xs + (i + 1) * interval - 1
			ll = datetime.fromtimestamp(float(item["time_lower_bound"]) / 1000.0)
			uu = datetime.fromtimestamp(float(item["time_upper_bound"]) / 1000.0)
			hh = highlights.filter(created_at__lte = uu).filter(created_at__gte = ll)
			item["num_nugget"] = hh.count()
			if (author_ids[0] != ""):
				hh = hh.filter(author_id__in = author_ids)
			if (theme_ids[0] != ""):
				hh = hh.filter(theme_id__in = theme_ids)
			item["num_nugget_ind"] = hh.count()
			item["num_nugget_sel"] = 0
			if (selected != None):
				if (selected.startswith("doc")):
					section_ids = []
					for section in DocSection.objects.filter(forum = forum).filter(doc_id=selected.split("-")[1]):
						section_ids.append(section.id)
					hh = hh.filter(context_id__in=section_ids)
				elif (selected.startswith("author")):
					hh = hh.filter(author_id=selected.split("-")[1])
				elif (selected.startswith("theme")):
					hh = hh.filter(theme_id=selected.split("-")[1])
				item["num_nugget_sel"] = hh.count()
			response["data"].append(item)
			item["time"] = str(ll.hour) + " " + str(ll.minute)
	# first time, no filters
	else:
		print "first time, no filters----------"
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
			response["data"] = []
			count = 0
			for i in range (0, len(highlight_time)):
				item = {}
				item["time"] = highlight_time[i]
				item["time_upper_bound"] = highlight_time_upper_bound[i]
				item["time_lower_bound"] = highlight_time_lower_bound[i]
				item["num_nugget"] = highlight_bar[i]
				item["num_nugget_ind"] = highlight_bar[i]
				item["num_nugget_sel"] = 0
				item["num_nugget_acc"] = highlight_bar[i]
				count = item["num_nugget_acc"]
				response["data"].append(item)
	return HttpResponse(json.dumps(response), content_type='application/json')

def get_doc(request):
	xl = request.REQUEST.get('time_upper_bound')
	time_upper_bound = datetime.fromtimestamp(float(xl) / 1000.0)
	xs = request.REQUEST.get('time_lower_bound')
	time_lower_bound = datetime.fromtimestamp(float(xs) /1000.0)
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
	response['word_cloud'] = render_to_string("vis/doc.html", context)
	return HttpResponse(json.dumps(response), content_type='application/json')

def get_doc_coverage(request):
	# filters
	selected = request.REQUEST.get("selected")
	author_ids = request.REQUEST.get('author_ids').split(" ")
	theme_ids = request.REQUEST.get('theme_ids').split(" ")
	doc_ids = request.REQUEST.get('doc_ids').split(" ")
	xl = request.REQUEST.get('time_upper_bound')
	time_upper_bound = datetime.fromtimestamp(float(xl) / 1000.0)
	xs = request.REQUEST.get('time_lower_bound')
	time_lower_bound = datetime.fromtimestamp(float(xs) /1000.0)
	# initialize
	response = {}
	context = {}
	response["coverage_map"] = {}
	response["coverage_map_filtered"] = {}
	response["coverage_map_selected"] = {}
	response["author_map_filtered"] = {}
	forum = Forum.objects.get(id = request.session['forum_id'])
	docs = Doc.objects.filter(forum=forum)
	# assign values
	for doc in docs:
		response["coverage_map"][doc.id] = {}
		response["coverage_map_filtered"][doc.id] = {}
		response["coverage_map_selected"][doc.id] = {}
		response["author_map_filtered"][doc.id] = {}
		for section in doc.sections.all():
			section_segmented_text = section.getAttr(forum)["segmented_text"]
			length = len(re.findall(r"data-id", section_segmented_text))
			response["coverage_map"][doc.id][section.id] = [0] * length
			response["coverage_map_filtered"][doc.id][section.id] = [0] * length
			response["coverage_map_selected"][doc.id][section.id] = [0] * length
			response["author_map_filtered"][doc.id][section.id] = [0] * length
			highlights = section.highlights.all()
			# filters
			highlights = highlights.filter(created_at__lte = time_upper_bound).filter(created_at__gte = time_lower_bound)
			highlights = highlights.filter(created_at__lte = day_chooser_upper).filter(created_at__gte = day_chooser_lower)
			for h in highlights:
				for i in range(h.start_pos, h.end_pos):
					response["coverage_map"][doc.id][section.id][i] = 1
			if (author_ids[0] != "" or theme_ids[0] != ""):
				if (author_ids[0] != ""):
					highlights = highlights.filter(author_id__in = author_ids)
				if (theme_ids[0] != ""):
					highlights = highlights.filter(theme_id__in = theme_ids)
				for h in highlights:
					for i in range(h.start_pos, h.end_pos):
						response["coverage_map_filtered"][doc.id][section.id][i] = 1
			if (selected != None):
				if (selected.startswith("author")):
					highlights = highlights.filter(author_id=selected.split("-")[1])
				elif (selected.startswith("theme")):
					highlights = highlights.filter(theme_id=selected.split("-")[1])
				for h in highlights:
					for i in range(h.start_pos, h.end_pos):
						response["coverage_map_selected"][doc.id][section.id][i] = 1
	# add author arrow
	response["author_theme_map"] = {}
	if (author_ids[0] != ""):
		section_ids = []
		for section in DocSection.objects.filter(forum = forum):
			section_ids.append(section.id)
		hls = Highlight.objects.filter(context_id__in=section_ids)
		if (theme_ids[0] != ""):
			hls = hls.filter(theme_id__in = theme_ids)
		hls = hls.filter(created_at__lte = time_upper_bound).filter(created_at__gte = time_lower_bound)
		hls = hls.filter(created_at__lte = day_chooser_upper).filter(created_at__gte = day_chooser_lower)
		for author_id in author_ids:
			hl = hls.filter(author_id = str(author_id)).order_by("-created_at")
			if (hl.count() > 0):
				print hl[0].created_at
				section_id = hl[0].context.id
				doc_id = DocSection.objects.get(id=hl[0].context.id).doc.id
				response["author_map_filtered"][doc_id][section_id][hl[0].start_pos] = author_id
				response["author_theme_map"][author_id] = hl[0].theme.name
	# initialize
	num_category = 5
	viewlogs = ViewLog.objects.all()
	viewlogs = viewlogs.filter(created_at__lte = day_chooser_upper).filter(created_at__gte = day_chooser_lower)
	# for realtime heatmap
	# viewlogs = viewlogs.filter(created_at__lte = time_upper_bound).filter(created_at__gte = time_lower_bound)
	if (author_ids[0] != ""):
		viewlogs = viewlogs.filter(author_id__in = author_ids)
	if (theme_ids[0] != ""):
		viewlogs = viewlogs.filter(theme_id__in = theme_ids)
	if (doc_ids[0] != ""):
		viewlogs = viewlogs.filter(doc_id__in = doc_ids)
	# get max view log number
	m = 0
	for doc in Doc.objects.filter(forum = forum):
		if (viewlogs.filter(doc_id = doc.id).count() > 0):
			viewlog = viewlogs.filter(doc_id = doc.id).order_by("-created_at")[0]
			arr = viewlog.heatmap.split(",")
			arr = [int(x) for x in arr]
			l = np.array(arr)
			if ( l.max() > m ): m = l.max()
	unit = m / (num_category - 1)
	response["heatmap"] = {}
	for doc_id in doc_ids:
		if (viewlogs.filter(doc_id = doc_id).count() > 0):
			viewlog = viewlogs.filter(doc_id = doc_id).order_by("-created_at")[0]
			arr = viewlog.heatmap.split(",")
			arr = [int(x) for x in arr]
			l = np.array(arr)
			l = l / unit
			response["heatmap"][str(doc_id)] = l.tolist()
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

def get_doc_length(request):
	response = {}
	context = {}
	doc_id = request.REQUEST.get('doc_id')
	doc = Doc.objects.get(id=doc_id)
	forum_id = request.session['forum_id']
	forum = Forum.objects.get(id = forum_id)
	length = 0
	for section in doc.sections.all():
		section_segmented_text = section.getAttr(forum)["segmented_text"]
		length = length + len(section_segmented_text)
	response['length'] = length
	return HttpResponse(json.dumps(response), content_type='application/json')

def put_heatmap(request):
	response = {}
	context = {}
	forum_id = request.session['forum_id']
	forum = Forum.objects.get(id = forum_id)
	upper = request.REQUEST.get('upper')
	lower = request.REQUEST.get('lower')
	height = request.REQUEST.get('height')
	doc_id = request.REQUEST.get('doc_id')
	theme_id = request.REQUEST.get('theme_id')
	author_id = request.REQUEST.get('author_id')
	if theme_id != "-1":
		print doc_id
		print author_id
		viewlogs = ViewLog.objects.filter(doc_id = doc_id, author_id = author_id, theme_id = theme_id)
		if (viewlogs.count() > 1):
			viewlog_latest = viewlogs.order_by("-created_at")[0]
			heatmap = viewlog_latest.heatmap.split(",")
			heatmap = [int(x) for x in heatmap]
		else:
			heatmap = [0] * 100
		left = int(round(100 * (float)(upper) / (float)(height)))
		right = int(round(100 * (float)(lower) / (float)(height)))
		for i in range(left, right):
			heatmap[i] = heatmap[i] + 1
		heatmap = ",".join(str(x) for x in heatmap)
		ViewLog.objects.create(doc_id = doc_id, author_id = author_id, theme_id = theme_id, created_at = timezone.now(), heatmap = heatmap)
	return HttpResponse(json.dumps(response), content_type='application/json')

def get_entities(request):
	response = {}
	forum_id = request.session['forum_id']
	forum = Forum.objects.get(id = forum_id)
	# we only consider root docs by this moment
	response["docs"] = []
	root_docs = Doc.objects.filter(forum=forum, folder__isnull=True).order_by("order")
	for doc in root_docs:
		item = {}
		item["id"] = "doc-" + str(doc.id)
		item["name"] = "doc-" + str(doc.title)
		response["docs"].append( item )
	response["themes"] = []
	themes = ClaimTheme.objects.filter(forum=forum)
	for theme in themes:
		item = {}
		item["id"] = "theme-" + str(theme.id)
		item["name"] = str(theme.name)
		response["themes"].append( item )
	response["authors"] = []
	for role in Role.objects.filter(forum=forum, role="panelist"):
		author = role.user
		item = {}
		item["id"] = "author-" + str(author.id)
		item["name"] = "P" + str(author.id) + ":" + str(author.last_name)
		response["authors"].append( item )
	return HttpResponse(json.dumps(response), content_type='application/json')


