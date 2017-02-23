from django.db import models

from mptt.models import MPTTModel, TreeForeignKey
from cir.models import Forum, User, Role, UserInfo
from cir.utils import pretty_date

# Create your models here.

class UserEvent(models.Model):
    user = models.ForeignKey(User, null=True, blank=True)
    EVENT_CHOICES = (
        ('phase.enter', 'User entered a phase'),
        ('phase.enter.visitor', 'Visitor entered a phase'),
        ('phase.complete', 'User completed a phase'),
    )
    event = models.CharField(max_length=20, choices=EVENT_CHOICES)
    extra_data = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now=True)

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
    extra_description = models.TextField(null=True, blank=True)
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
    vote = models.IntegerField(null=True, blank=True)
    stmt_group = models.ForeignKey(StatementGroup, related_name='comments', null=True, blank=True)

    CONTEXT_CHOICES = (
        ('issue', 'Initial voting in Phase 1'),
        ('statement', 'Vote revision in Phase 2'),
        ('deliberation', 'Issue forum in Phase 3'),
        ('stmt_group', 'Statement Question forum in Phase 3')
    )
    context = models.CharField(null=True, blank=True, max_length=15, choices=CONTEXT_CHOICES)

    # the highlight to which this post is attached
    highlight = models.ForeignKey(Highlight, related_name='posts_of_highlight', null=True, blank=True)
    CONTENT_CHOICES = (
        ('question', 'Question'),
        ('comment', 'Comment'),
        ('opinion', 'Opinion'),
    )
    content_type = models.CharField(max_length=10, choices=CONTENT_CHOICES)

    @property
    def author_initial(self):
        try:
            return str.upper(str(self.author.first_name[0]) + str(self.author.last_name[0]))
        except:
            return ''

    @property
    def updated_at_pretty(self):
        return pretty_date(self.updated_at)
