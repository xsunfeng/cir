from django.contrib import admin

from models import *

class ForumAdmin(admin.ModelAdmin):
    pass
class DocAdmin(admin.ModelAdmin):
    pass
class DocSectionAdmin(admin.ModelAdmin):
    pass
class EntryCategoryAdmin(admin.ModelAdmin):
    pass

admin.site.register(Forum, ForumAdmin)
admin.site.register(Doc, DocAdmin)
admin.site.register(DocSection, DocSectionAdmin)
admin.site.register(EntryCategory, EntryCategoryAdmin)