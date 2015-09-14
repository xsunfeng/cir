from django.contrib import admin

from models import *

def user_unicode(self):
    return  u'%s %s (%s)' % (self.first_name, self.last_name, self.email)
User.__unicode__ = user_unicode

class ForumAdmin(admin.ModelAdmin):
    list_display = ('full_name', 'url', 'access_level', 'phase')


class RoleAdmin(admin.ModelAdmin):
    def author_name(self):
        return "%s %s" % (self.user.first_name, self.user.last_name)

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
            if self.claims_of_highlight.exists():
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
    list_filter = ('forum', )
    pass


class ClaimVersionAdmin(admin.ModelAdmin):
    pass


class PostAdmin(admin.ModelAdmin):
    def author_name(self):
        return "%s %s" % (self.author.first_name, self.author.last_name)

    list_display = ('content', author_name, 'content_type', 'highlight')
    list_filter = ('forum', 'content_type')


class ClaimAdmin(admin.ModelAdmin):
    def author_name(self):
        return "%s %s" % (self.author.first_name, self.author.last_name)

    def claim_content(self):
        return '<a href="../claimversion/%d">%s</a>' % (self.adopted_version().id, self.adopted_version().content)

    def version_author(self):
        return "%s %s" % (self.adopted_version().author.first_name, self.adopted_version().author.last_name)

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