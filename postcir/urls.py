from django.conf.urls import patterns, url
import views

urlpatterns = patterns('',
    url(r'api_postcir/$', views.api_postcir),
    url(r'api_stmt_quiz/$', views.api_stmt_quiz),
    url(r'api_stmt_vote/$', views.api_stmt_vote),
    url(r'api_stmt_question/$', views.api_stmt_question),
    url(r'api_questionnaire/$', views.api_questionnaire)
)
