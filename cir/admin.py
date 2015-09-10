from functools import partial

from django.contrib import admin
from django.forms import MediaDefiningClass

from models import *


class ForumAdmin(admin.ModelAdmin):
    list_display = ('full_name', 'url', 'access_level', 'phase')


class RoleAdmin(admin.ModelAdmin):
    def author_name(obj):
        return ("%s %s" % (obj.user.first_name, obj.user.last_name))

    list_display = (author_name, 'forum', 'role')
    list_filter = ('forum', )

class HighlightAdmin(admin.ModelAdmin):
    def highlight_type(self):
        try:
            Tag.objects.get(highlight_ptr=self)
            return 'tag'
        except:
            # type of the first entry under this highlight
            # claim has priority
            if self.claims_of_highlight.count():
                return 'claim'
            else:
                if self.posts_of_highlight.exists():
                    return self.posts_of_highlight.order_by('-updated_at')[0].content_type
                else:
                    return 'unknown'

    def context_type(self):
        try:
            DocSection.objects.get(id=self.context.id)
            return 'DocSection'
        except:
            return 'Post'
    def context_content(self):
        try:
            return DocSection.objects.get(id=self.context.id).title
        except:
            return self.context.content[:100]
    def forum(self):
        return self.context.forum
    list_display = (forum, context_type, highlight_type, 'author', context_content, 'start_pos', 'end_pos')
    # list_filter = (forum, highlight_type)

class DocAdmin(admin.ModelAdmin):
    pass

class TagAdmin(admin.ModelAdmin):
    list_display = ('content', 'author', 'claimTheme')

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
admin.site.register(Highlight, HighlightAdmin)
admin.site.register(Tag, TagAdmin)