from django.conf.urls import patterns, url
import views

urlpatterns = patterns('',
    url(r'api_postcir/$', views.api_postcir),
    # url(r'api_geoparse/$', views.api_geoparse),
)
