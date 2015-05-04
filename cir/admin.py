from functools import partial

from django.contrib import admin
from django.forms import MediaDefiningClass

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


class ClaimVersionAdmin(admin.ModelAdmin):
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
        return '<a href="../claimversion/%d">%s</a>' % (obj.adopted_version().id, obj.adopted_version().content)

    def version_author(obj):
        return ("%s %s" % (obj.adopted_version().author.first_name, obj.adopted_version().author.last_name))

    author_name.short_description = 'Author of claim'
    claim_content.short_description = 'Content of adopted version'
    claim_content.allow_tags = True
    version_author.short_description = 'Author of adopted version'
    list_display = (author_name, version_author, claim_content, 'claim_category', 'theme')
    list_filter = ('forum', 'claim_category', 'theme')
    ordering = ('created_at', )


admin.site.register(Forum, ForumAdmin)
admin.site.register(Role, RoleAdmin)
admin.site.register(Doc, DocAdmin)
admin.site.register(DocSection, DocSectionAdmin)
admin.site.register(ClaimTheme, ClaimThemeAdmin)
admin.site.register(Claim, ClaimAdmin)
admin.site.register(Post, PostAdmin)
admin.site.register(ClaimVersion, ClaimVersionAdmin)
