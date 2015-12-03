from django.conf.urls import patterns, include, url
from django.contrib import admin

import settings
import user_views
import forum_views
import doc_views
import claim_views
import facilitator_views
import tag_views
import workbench_views
import chatter_views
import vis_views


admin.autodiscover()

urlpatterns = patterns('',
    url(r'^$', forum_views.home),
    url(r'^admin/?', include(admin.site.urls)),
    url(r'^api_register/$', user_views.register),
    url(r'^api_login/$', user_views.login_view),
    url(r'^api_logout/$', user_views.logout_view),
    url(r'^api_change_info/$', user_views.change_info),
    url(r'^api_doc/$', doc_views.api_doc),
    url(r'^api_highlight/$', doc_views.api_highlight),
    url(r'^api_annotation/$', doc_views.api_annotation),
    url(r'^api_qa/$', doc_views.api_qa),
    url(r'^api_claim/$', claim_views.api_claim),
    url(r'^api_get_claim/$', claim_views.api_get_claim),
    url(r'^api_draft_stmt/$', claim_views.api_draft_stmt),
    url(r'^api_claim_activities/$', claim_views.api_claim_activities),
    url(r'^api_claim_vote/$', claim_views.api_claim_vote),
    url(r'^api_claim_flag/$', claim_views.api_claim_flag),
    url(r'^api_get_flags/$', claim_views.api_get_flags),
    url(r'^api_tag/$', tag_views.api_tag),
    url(r'^api_tag_theme/$', facilitator_views.tag_theme),
    url(r'^api_vis/$', vis_views.api_vis),

    url(r'^workbench/api_load_all_documents/$', workbench_views.api_load_all_documents),
    url(r'^workbench/api_load_all_themes/$', workbench_views.api_load_all_themes),
    url(r'^workbench/api_load_highlights/$', workbench_views.api_load_highlights),
    url(r'^workbench/api_load_one_highlight/$', workbench_views.api_load_one_highlight),
    url(r'^workbench/api_get_claim_by_theme/$', workbench_views.api_get_claim_by_theme),
    url(r'^workbench/api_change_to_nugget/$', workbench_views.api_change_to_nugget),
    url(r'^workbench/api_change_to_nugget_1/$', workbench_views.api_change_to_nugget_1),
    url(r'^workbench/api_remove_nugget/$', workbench_views.api_remove_nugget),
    url(r'^workbench/api_add_claim/$', workbench_views.api_add_claim),
    url(r'^workbench/api_remove_claim/$', workbench_views.api_remove_claim),
    url(r'^workbench/api_get_toc/$', workbench_views.api_get_toc),
    url(r'^workbench/api_edit_claim/$', workbench_views.api_edit_claim),
    url(r'^workbench/api_assign_nugget/$', workbench_views.api_assign_nugget),
    url(r'^workbench/api_load_nugget_list/$', workbench_views.api_load_nugget_list),
    url(r'^workbench/api_load_nugget_list_partial/$', workbench_views.api_load_nugget_list_partial),
    url(r'^workbench/api_load_claim_list_partial/$', workbench_views.api_load_claim_list_partial),
    url(r'^workbench/api_get_doc_by_sec_id/$', workbench_views.api_get_doc_by_sec_id),
    url(r'^workbench/api_get_doc_by_hl_id/$', workbench_views.api_get_doc_by_hl_id),

    url(r'^api_chatter/$', chatter_views.api_chatter),

    url(r'^api_register_delegator/$', facilitator_views.register_delegator), # include other apps
    url(r'^admin/doc/', include('django.contrib.admindocs.urls')),
    url(r'^password_reset/', include('password_reset.urls')),
    url(r'^dashboard/forum/$', facilitator_views.admin_forum),
    url(r'^dashboard/docs/$', facilitator_views.admin_document),
    url(r'^dashboard/phase/$', facilitator_views.admin_phase),

    # these must be put last!
    url(r'^(?P<forum_url>[a-zA-Z0-9_]+)/?$', forum_views.enter_forum),
    url(r'^(?P<forum_url>[a-zA-Z0-9_]+)/workbench/?$', forum_views.enter_workbench),
    url(r'^(?P<forum_url>[a-zA-Z0-9_]+)/dashboard/?$', facilitator_views.enter_dashboard),
    url(r'^(?P<forum_url>[a-zA-Z0-9_]+)/statement/?$', forum_views.enter_statement), )

urlpatterns += patterns('',
    (r'^media/(?P<path>.*)$', 'django.views.static.serve', {'document_root': settings.MEDIA_ROOT}))

handler500 = forum_views.handler500
