import json
from django.http import HttpResponse
from cir.models import *

def get_graph(request):
	print "get_graph"
	graph = {}
	graph["nodes"] = []
	graph["links"] = []
	graph["section_size"] = 0
	graph["theme_size"] = 0
	forum_id = request.session['forum_id']
	# num_section = Doc.objects.filter(forum_id=request.session['forum_id']).count()
	# num_theme = ClaimTheme.objects.filter(forum_id=request.session['forum_id']).count()
	# for i in range(num_section + 1):
	# 	row = []
	# 	for j in range(num_theme + 1):
	# 		row.append(0)
	# 	matrix.append(row)
	# print matrix

	# create links among themes and sections
	highlights = Highlight.objects.all()
	pair_set = []
	for h in highlights:
		if (h.context != None and h.theme != None):
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
	for item in graph["nodes"]:
		print item
	# create dummy themes for alone sections
	isEmptySection = False
	sections = DocSection.objects.filter(forum_id=request.session['forum_id'])
	for section in sections:
		section_node = {"name": "section-" + str(section.id), "text": section.title}
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
	# graph["nodes"].append({"name":"Barry"})
	# graph["nodes"].append({"name":"Frodo"})
	# graph["nodes"].append({"name":"Elvis"})
	# graph["nodes"].append({"name":"Sarah"})
	# graph["nodes"].append({"name":"Alice"})
	# graph["links"].append({"source":"Barry","target":"Elvis","value":2})
	# graph["links"].append({"source":"Frodo","target":"Elvis","value":2})
	# graph["links"].append({"source":"Frodo","target":"Sarah","value":2})
	# graph["links"].append({"source":"Barry","target":"Alice","value":2})
	# graph["links"].append({"source":"Elvis","target":"Sarah","value":2})
	# graph["links"].append({"source":"Elvis","target":"Alice","value":2})
	# graph["links"].append({"source":"Sarah","target":"Alice","value":4})
	return HttpResponse(json.dumps(graph), content_type='application/json')

def get_item_by_more(dic, more):
	for item in dic:
		if (item["more"] == more):
			return item
