from django.db import models

from mptt.models import MPTTModel, TreeForeignKey
from cir.models import Forum, User, Role, UserInfo
from cir.utils import pretty_date

# Create your models here.

class StatementCategory(models.Model):
    CATEGORY_CHOICES = (
        ('pro', 'Proponent'),
        ('con', 'Opponent'),
        ('finding', 'Key Finding')
    )
    name = models.CharField(max_length=10, choices=CATEGORY_CHOICES)
    description = models.TextField()
    created_at = models.DateTimeField(auto_now=True)
    forum = models.ForeignKey(Forum, on_delete=models.CASCADE)

    def __str__(self):
        return "%s (%s)" % (self.description, self.name)

class StatementGroup(models.Model):
    description = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now=True)
    category = models.ForeignKey(StatementCategory, on_delete=models.CASCADE)
    forum = models.ForeignKey(Forum, on_delete=models.CASCADE)

    def __unicode__(self):
        if len(self.description) > 50:
            short_desc = self.description[:50]
        else:
            short_desc = self.description
        return "(%s) %s" % (self.category.name, short_desc)

class StatementItem(models.Model):
    content = models.TextField()
    created_at = models.DateTimeField(auto_now=True)
    updated_at = models.DateTimeField(auto_now_add=True)
    group = models.ForeignKey(StatementGroup, related_name='items', on_delete=models.CASCADE)

class Highlight(models.Model):
    start_pos = models.IntegerField()
    end_pos = models.IntegerField()
    context = models.ForeignKey(StatementItem)
    created_at = models.DateTimeField(auto_now=True)

class Post(MPTTModel):
    forum = models.ForeignKey(Forum)
    author = models.ForeignKey(User)
    content = models.TextField()
    parent = TreeForeignKey('self', null=True, blank=True, related_name='children', db_index=True)
    created_at = models.DateTimeField(auto_now=True)
    updated_at = models.DateTimeField(auto_now_add=True)
    title = models.TextField(null=True, blank=True)

    # the highlight to which this post is attached
    highlight = models.ForeignKey(Highlight, related_name='posts_of_highlight', null=True, blank=True)
    CONTENT_CHOICES = (
        ('question', 'Question'),
        ('comment', 'Comment'),
        ('opinion', 'Opinion'),
    )
    content_type = models.CharField(max_length=10, choices=CONTENT_CHOICES)

    def getAttr(self, forum):
        attr = {}
        try:
            attr['author_role'] = Role.objects.get(user=self.author, forum=forum).role
        except:
            attr['author_role'] = 'visitor'
        attr['id'] = self.id
        attr['author_id'] = self.author.id
        attr['author_name'] = self.author.get_full_name()
        try:
            attr['author_initial'] = str.upper(str(self.author.first_name[0]) + str(self.author.last_name[0]))
        except:
            attr['author_initial'] = ''
        attr['content'] = self.content
        attr['created_at_full'] = self.created_at  # for sorting
        attr['updated_at'] = pretty_date(self.updated_at)
        attr['updated_at_full'] = self.updated_at
        attr['entry_type'] = self.content_type
        attr['author_intro'] = UserInfo.objects.get(user=self.author).description
        if self.parent:
            attr['parent_name'] = self.parent.author.get_full_name()
            attr['parent_id'] = self.parent.id
        return attr