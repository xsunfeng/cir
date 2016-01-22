import json
from django.http import HttpResponse
from cir.models import *

def get_graph(request):
	graph = {}
	graph["nodes"] = []
	graph["links"] = []
	forum_id = request.session['forum_id']
	count = 0

	themes = ClaimTheme.objects.filter(forum_id=request.session['forum_id'])
	for theme in themes:
		graph["nodes"].append({"node": count, "name": str(theme),  "more": "theme-" + str(theme.id) })
		count = count + 1
	sections = DocSection.objects.filter(forum_id=request.session['forum_id'])
	for section in sections:
		if (Highlight.objects.filter(context_id = section.id).count() != 0):
			print section.id
			print Highlight.objects.filter(context_id = section.id)[0].id
			print "====="
			graph["nodes"].append({"node": count, "name": "section" + str(section.id), "more": "section-" + str(section.id) })
			count = count + 1
	print graph["nodes"]
	highlights = Highlight.objects.all()
	for h in highlights:
		if (h.context != None and h.theme != None):
			sec_id = h.context.id
			theme_id = h.theme.id
			source_node = get_item_by_more(graph["nodes"], "section-" + str(sec_id))
			target_node = get_item_by_more(graph["nodes"], "theme-" + str(theme_id))
			if (source_node != None and target_node != None):
				if ({"source": source_node["node"], "target": target_node["node"], "value":1} not in graph["links"]):
					graph["links"].append({"source": source_node["node"], "target": target_node["node"], "value":1})
				else:
					for item in graph["links"]:
						if (item["source"] == source_node["node"] and item["target"] == target_node["node"]):
							item["value"] = item["value"] + 1
							break
	for item in graph["nodes"]:
		print item
	# for item in graph["links"]:
	# 	print item
	# graph["nodes"].append({'node': 0, 'name': 'theme0', 'more': 'theme-23'})
	# graph["nodes"].append({'node': 1, 'name': 'theme1', 'more': 'theme-24'})
	# graph["nodes"].append({'node': 2, 'name': 'theme2', 'more': 'theme-25'})
	# graph["nodes"].append({'node': 10, 'name': 'section10', 'more': 'section-970'})
	# graph["nodes"].append({'node': 11, 'name': 'section11', 'more': 'section-984'})
	# graph["nodes"].append({'node': 12, 'name': 'section12', 'more': 'section-995'})
	# graph["links"].append({"source":0, "target":3, "value":2})
	# graph["links"].append({"source":0, "target":4, "value":2})
	# graph["links"].append({"source":1, "target":5, "value":2})
	return HttpResponse(json.dumps(graph), content_type='application/json')

def get_item_by_more(dic, more):
	for item in dic:
		if (item["more"] == more):
			return item
