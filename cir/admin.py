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
class ClaimThemeAdmin(admin.ModelAdmin):
    pass
class ClaimAdmin(admin.ModelAdmin):
    def author_name(obj):
        return ("%s %s" % (obj.author.first_name, obj.author.last_name)).upper()
    def claim_content(obj):
        return (obj.content)
    claim_content.short_description = 'Content'
    list_display = (author_name, claim_content, 'claim_category', 'theme')
admin.site.register(Forum, ForumAdmin)
admin.site.register(Doc, DocAdmin)
admin.site.register(DocSection, DocSectionAdmin)
admin.site.register(ClaimTheme, ClaimThemeAdmin)
admin.site.register(Claim, ClaimAdmin)