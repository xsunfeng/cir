# Django settings for cir project.
import os
DEBUG = True
TEMPLATE_DEBUG = DEBUG

ADMINS = (
    ('Ye Tian', 'yxt157@ist.psu.edu'),
)

MANAGERS = ADMINS

DATABASES = {
    'default': {
        'ENGINE': 'django.contrib.gis.db.backends.postgis', # Add 'postgresql_psycopg2', 'mysql', 'sqlite3' or 'oracle'.
        'NAME': 'cir',                      # Or path to database file if using sqlite3.
        # The following settings are not used with sqlite3:
        'USER': 'postgres',
        'PASSWORD': 'asdf1234',
        'HOST': '130.203.136.141',                      # Empty for localhost through domain sockets or '127.0.0.1' for localhost through TCP.
        'PORT': '',                      # Set to empty string for default.
    }
}

PROJECT_PATH = os.path.abspath(os.path.join(os.path.dirname( __file__ ), '..'))
PROJECT_ROOT = os.path.dirname(os.path.realpath(__file__))
POSTGIS_VERSION = (2, 0, 3)
# Hosts/domain names that are valid for this site; required if DEBUG is False
# See https://docs.djangoproject.com/en/1.5/ref/settings/#allowed-hosts
ALLOWED_HOSTS = []

# Local time zone for this installation. Choices can be found here:
# http://en.wikipedia.org/wiki/List_of_tz_zones_by_name
# although not all choices may be available on all operating systems.
# In a Windows environment this must be set to your system time zone.
TIME_ZONE = 'America/New_York'

# Language code for this installation. All choices can be found here:
# http://www.i18nguy.com/unicode/language-identifiers.html
LANGUAGE_CODE = 'en-us'

SITE_ID = 1

# If you set this to False, Django will make some optimizations so as not
# to load the internationalization machinery.
USE_I18N = True

# If you set this to False, Django will not format dates, numbers and
# calendars according to the current locale.
USE_L10N = True

# If you set this to False, Django will not use timezone-aware datetimes.
USE_TZ = True

# Absolute filesystem path to the directory that will hold user-uploaded files.
# Example: "/var/www/example.com/media/"
MEDIA_ROOT = os.path.join(PROJECT_PATH, 'media/').replace('\\','/')

# URL that handles the media served from MEDIA_ROOT. Make sure to use a
# trailing slash.
# Examples: "http://example.com/media/", "http://media.example.com/"
MEDIA_URL = '/media/'

# Absolute path to the directory static files should be collected to.
# Don't put anything in this directory yourself; store your static files
# in apps' "static/" subdirectories and in STATICFILES_DIRS.
# Example: "/var/www/example.com/static/"
STATIC_ROOT = '../cir-static/'

# URL prefix for static files.
# Example: "http://example.com/static/", "http://static.example.com/"
STATIC_URL = '/static/'

# Additional locations of static files
STATICFILES_DIRS = (
    # Put strings here, like "/home/html/static" or "C:/www/django/static".
    # Always use forward slashes, even on Windows.
    # Don't forget to use absolute paths, not relative paths.
    os.path.join(PROJECT_PATH, 'static'),
)

STATICFILES_STORAGE = 'pipeline.storage.PipelineStorage'
PIPELINE_EMBED_MAX_IMAGE_SIZE = 120000
PIPELINE_EMBED_PATH = r'[/]?static/embed/'
PIPELINE_CSS = {
    'cir': {
        'source_filenames': (
          'css/widget.css',
          'css/claims.css',
          'css/parallel.css',
          'css/page_body.css',
        ),
        'output_filename': 'css/cir.css',
        'variant': 'datauri',
    },
    'cir_libs': {
        'source_filenames': (
            'lib/jquery-layout-1.4.0/jquery.layout.css',
            'lib/jquery-ui-1.11.2.custom/jquery-ui.css',
            'lib/bootstrap-notify/css/bootstrap-notify.css',
            'lib/DataTables-1.10.2/css/jquery.dataTables.css', 
            'lib/jcm/jquery.contextMenu.css',
            'lib/jQuery-Tags-Input/jquery.tagsinput.css',
            'lib/bootstrap-multiselect/dist/css/bootstrap-multiselect.css',
        ),
        'output_filename': 'css/cir_libs.css',
    },
}

PIPELINE_JS = {
    'cir': {
        'source_filenames': (
            'js/d3.legend.js',
            'js/dispatcher.js', 
            'js/layout.js', 
            'js/citationbar.js',
            'js/utils.js',
            'js/layout_utils.js',
            'js/posts.js',
            'js/documents.js',
            'js/forum_intro.js',
            'js/claims.js',
            'js/codes.js',
            'js/parallel.js',
            'js/content-visual.js',
            'js/claim-comments.js',
        ),
        'output_filename': 'js/cir.js',
    }
}

# List of finder classes that know how to find static files in
# various locations.
STATICFILES_FINDERS = (
    'django.contrib.staticfiles.finders.FileSystemFinder',
    'django.contrib.staticfiles.finders.AppDirectoriesFinder',
#    'django.contrib.staticfiles.finders.DefaultStorageFinder',
)

# Make this unique, and don't share it with anybody.
SECRET_KEY = 'cj6k998fi&=fesrf39*2g07jcuf!%)=xfnvji8z2f==d7yb_-d'

# List of callables that know how to import templates from various sources.
TEMPLATE_LOADERS = (
    'django.template.loaders.filesystem.Loader',
    'django.template.loaders.app_directories.Loader',
#     'django.template.loaders.eggs.Loader',
)

MIDDLEWARE_CLASSES = (
    'django.middleware.common.CommonMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    # 'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.transaction.TransactionMiddleware',
    # Uncomment the next line for simple clickjacking protection:
    # 'django.middleware.clickjacking.XFrameOptionsMiddleware',
)

ROOT_URLCONF = 'cir.urls'

# Python dotted path to the WSGI application used by Django's runserver.
WSGI_APPLICATION = 'cir.wsgi.application'

BASE_DIR = os.path.dirname(os.path.dirname(__file__))

TEMPLATE_DIRS = (
    # Put strings here, like "/home/html/django_templates" or "C:/www/django/templates".
    # Always use forward slashes, even on Windows.
    # Don't forget to use absolute paths, not relative paths.
    os.path.join(BASE_DIR, 'templates'),
)

INSTALLED_APPS = (
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.sites',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.admin',
    'django.contrib.admindocs',
    'south',
    'cir',
    'password_reset',
)

SESSION_SERIALIZER = 'django.contrib.sessions.serializers.JSONSerializer'
SESSION_ENGINE = 'django.contrib.sessions.backends.signed_cookies'
# A sample logging configuration. The only tangible logging
# performed by this configuration is to send an email to
# the site admins on every HTTP 500 error when DEBUG=False.
# See http://docs.djangoproject.com/en/dev/topics/logging for
# more details on how to customize your logging configuration.
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'filters': {
        'require_debug_false': {
            '()': 'django.utils.log.RequireDebugFalse'
        }
    },
    'handlers': {
        'mail_admins': {
            'level': 'ERROR',
            'filters': ['require_debug_false'],
            'class': 'django.utils.log.AdminEmailHandler'
        }
    },
    'loggers': {
        'django.request': {
            'handlers': ['mail_admins'],
            'level': 'ERROR',
            'propagate': True,
        },
    }
}

EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_USE_TLS = True
EMAIL_HOST = 'smtp.gmail.com'
EMAIL_HOST_USER = 'community.forum.cir@gmail.com'
DEFAULT_FROM_EMAIL = EMAIL_HOST_USER
EMAIL_HOST_PASSWORD = 'geodeliberation'
EMAIL_PORT = 587

# CIR app settings