from django.conf.urls import patterns, include, url
import settings
import user_views, forum_views, doc_views, claim_views
from django.contrib import admin
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

    # include other apps
    url(r'^admin/doc/', include('django.contrib.admindocs.urls')),
    url(r'^password_reset/', include('password_reset.urls')),

    # these must be put last!
    url(r'^(?P<forum_url>[a-zA-Z0-9_]+)/?$', forum_views.enter_forum),
    url(r'^(?P<forum_url>[a-zA-Z0-9_]+)/statement/?$', forum_views.enter_statement),
)

if settings.DEBUG:
	urlpatterns += patterns('', (r'^media/(?P<path>.*)$', 'django.views.static.serve', {
	        'document_root': settings.MEDIA_ROOT}))
