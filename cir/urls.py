from django.conf.urls import patterns, include, url
from django.contrib import admin

import settings
import user_views
import forum_views
import doc_views
import claim_views
import facilitator_views
import tag_views


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
    url(r'^api_claim/$', claim_views.api_claim),
    url(r'^api_get_claim/$', claim_views.api_get_claim),
    url(r'^api_claim_activities/$', claim_views.api_claim_activities),
    url(r'^api_claim_vote/$', claim_views.api_claim_vote),
    url(r'^api_claim_flag/$', claim_views.api_claim_flag),
    url(r'^api_get_flags/$', claim_views.api_get_flags),
    url(r'^api_tag/$', tag_views.api_tag),

    url(r'^api_register_delegator/$', facilitator_views.register_delegator), # include other apps
    url(r'^admin/doc/', include('django.contrib.admindocs.urls')),
    url(r'^password_reset/', include('password_reset.urls')),
    url(r'^dashboard/forum/$', facilitator_views.admin_forum),
    url(r'^dashboard/docs/$', facilitator_views.admin_document),
    url(r'^dashboard/phase/$', facilitator_views.admin_phase),

    # these must be put last!
    url(r'^(?P<forum_url>[a-zA-Z0-9_]+)/?$', forum_views.enter_forum),
    url(r'^(?P<forum_url>[a-zA-Z0-9_]+)/dashboard/?$', facilitator_views.enter_dashboard),
    url(r'^(?P<forum_url>[a-zA-Z0-9_]+)/statement/?$', forum_views.enter_statement), )

urlpatterns += patterns('',
    (r'^media/(?P<path>.*)$', 'django.views.static.serve', {'document_root': settings.MEDIA_ROOT}))

handler500 = forum_views.handler500
