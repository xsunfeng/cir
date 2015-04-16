from django.contrib import admin

from models import *

class ForumAdmin(admin.ModelAdmin):
    pass
class RoleAdmin(admin.ModelAdmin):
    def author_name(obj):
        return ("%s %s" % (obj.user.first_name, obj.user.last_name))
    list_display = (author_name, 'forum', 'role')
    list_filter = ('forum', )
    pass
class DocAdmin(admin.ModelAdmin):
    pass
class DocSectionAdmin(admin.ModelAdmin):
    pass
class EntryCategoryAdmin(admin.ModelAdmin):
    pass
class ClaimThemeAdmin(admin.ModelAdmin):
    pass

class PostAdmin(admin.ModelAdmin):
    def author_name(obj):
        return ("%s %s" % (obj.author.first_name, obj.author.last_name))
    list_display = ('content', author_name, 'content_type', 'highlight')
    list_filter = ('forum', 'content_type')
class ClaimAdmin(admin.ModelAdmin):
    def author_name(obj):
        return ("%s %s" % (obj.author.first_name, obj.author.last_name))
    def claim_content(obj):
        return (obj.adopted_version().content)
    claim_content.short_description = 'Content'
    list_display = (author_name, claim_content, 'claim_category', 'theme')
    list_filter = ('forum', 'claim_category', 'theme')
    ordering = ('created_at', )
admin.site.register(Forum, ForumAdmin)
admin.site.register(Role, RoleAdmin)
admin.site.register(Doc, DocAdmin)
admin.site.register(DocSection, DocSectionAdmin)
admin.site.register(ClaimTheme, ClaimThemeAdmin)
admin.site.register(Claim, ClaimAdmin)
admin.site.register(Post, PostAdmin)