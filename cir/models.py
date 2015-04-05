from django.contrib.gis.db import models
from django.contrib.auth.models import User

import utils

VISITOR_ROLE = 'visitor'

class Forum(models.Model):
    full_name = models.CharField(max_length=500) # shown on top page/selection page
    short_name = models.CharField(max_length=500) # used elsewhere
    url = models.CharField(max_length=100) # used in url
    description = models.TextField(null=True, blank=True)
    access_level = models.CharField(max_length=100, default='open')
    contextmap = models.TextField(null=True, blank=True)
    forum_logo = models.ImageField(upload_to='forum_logos', null=True, blank=True, default='forum_logos/default.jpg')
    def __unicode__(self): # used for admin site
        return self.full_name
    def getAttr(self):
        attr = {}
        attr['id'] = self.id
        attr['full_name'] = self.full_name
        attr['short_name'] = self.short_name
        attr['url'] = self.url
        attr['full_description'] = self.description
        attr['short_description'] = self.description[:400] + '...'
        if self.access_level == 'open':
            attr['access_level'] = 'Open access'
        elif self.access_level == 'panelist':
            attr['access_level'] = 'Panel only'
        elif self.access_level == 'private':
            attr['access_level'] = 'Private'
        else:
            attr['access_level'] = self.access_level
        attr['logo_url'] = self.forum_logo.url
        return attr

class Role(models.Model):
    ROLE_CHOICES = (
        ('panelist', 'Panelist'),
        ('expert', 'Subject Matter Expert'),
        ('facilitator', 'Facilitator'),
    )
    user = models.ForeignKey(User, related_name="role")
    forum = models.ForeignKey(Forum)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES) 

class UserInfo(models.Model):
    user = models.OneToOneField(User, related_name='info')
    description = models.TextField(null=True, blank=True)
    last_visited_forum = models.ForeignKey(Forum, null=True, blank=True)

class EntryCategory(models.Model):
    CONTENT_CHOICES = (
        ('doc', 'Document'),
        ('post', 'Post'),
    )
    name = models.CharField(max_length=200, null=True, blank=True)
    category_type = models.CharField(max_length=10, choices=CONTENT_CHOICES)
    forum = models.ForeignKey(Forum)
    visible = models.BooleanField(default=False)
    can_create = models.BooleanField(default=False)
    can_edit = models.BooleanField(default=False)
    can_delete = models.BooleanField(default=False)
    can_extract = models.BooleanField(default=False)
    can_prioritize = models.BooleanField(default=False)
    instructions = models.TextField(null=True, blank=True)
    def __str__(self): # used for admin site
        return self.name
    def getAttr(self):
        attr = {}
        attr['id'] = self.id
        attr['name'] = self.name
        attr['instructions'] = self.instructions
        return attr
    def getPrivileges(self):
        priv = {}
        priv['visible'] = self.visible
        priv['can_create'] = self.can_create
        priv['can_edit'] = self.can_edit
        priv['can_delete'] = self.can_delete
        priv['can_extract'] = self.can_extract
        priv['can_prioritize'] = self.can_prioritize
        return priv

class Entry(models.Model):
    forum = models.ForeignKey(Forum)
    author = models.ForeignKey(User)
    content = models.TextField()
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()
    category = models.ForeignKey(EntryCategory, related_name='entries', null=True, blank=True)
    is_deleted = models.BooleanField(default=False)
    def getAttr(self, forum):
        attr = {}
        try:
            attr['author_role'] = Role.objects.get(user=self.author, forum=forum).role
        except:
            attr['author_role'] = VISITOR_ROLE
        attr['id'] = self.id
        attr['author_id'] = self.author.id
        attr['author_name'] = self.author.get_full_name()
        attr['content'] = self.content
        attr['created_at_full'] = self.created_at # for sorting
        attr['updated_at'] = utils.pretty_date(self.updated_at)
        attr['updated_at_full'] = self.updated_at
        attr['is_deleted'] = self.is_deleted
        return attr

class Doc(models.Model):
    forum = models.ForeignKey(Forum)
    title = models.TextField()
    description = models.TextField(null=True, blank=True)
    folder = models.ForeignKey(EntryCategory, related_name='doc_entries', null=True, blank=True)
    def __str__(self): # used for admin site
        return self.title
    def getAttr(self):
        attr = {}
        attr['id'] = self.id
        attr['title'] = self.title
        attr['description'] = self.description
        attr['num_sections'] = self.sections.count()
        try:
            # update time is the latest updated section in it
            update_time = self.sections.order_by('-updated_at')[0].updated_at
            attr['updated_at'] = utils.pretty_date(update_time)
            attr['updated_at_full'] = update_time
        except:
            pass
        return attr

class DocSection(Entry):
    title = models.TextField(null=True, blank=True)
    order = models.IntegerField(null=True, blank=True)
    doc = models.ForeignKey(Doc, related_name='sections')
    def __str__(self): # used for admin site
        return str(self.id) + ' ' + self.title
    def getAttr(self):
        attr = {}
        attr['id'] = self.id
        attr['title'] = self.title
        attr['segmented_text'] = utils.segment_text(self.content)
        attr['updated_at'] = utils.pretty_date(self.updated_at)
        attr['updated_at_full'] = self.updated_at
        return attr

class Highlight(models.Model):
    start_pos = models.IntegerField()
    end_pos = models.IntegerField()
    context = models.ForeignKey(Entry, related_name='highlights')
    def getAttr(self):
        attr = {}
        attr['id'] = self.id
        attr['start'] = self.start_pos
        attr['end'] = self.end_pos
        attr['context_id'] = self.context.id
        # type of the first entry under this highlight
        # claim has priority
        if self.claims_of_highlight.count():
            attr['type'] = 'claim' 
        else:
            attr['type'] = self.posts_of_highlight.order_by('-updated_at')[0].content_type
        return attr

class ClaimTheme(models.Model):
    forum = models.ForeignKey(Forum)
    name = models.CharField(max_length=100)
    proposer = models.ForeignKey(User)
    created_at = models.DateTimeField()
    def getAttr(self):
        attr = {}
        attr['id'] = self.id
        attr['name'] = self.name
        return attr
    def __unicode__(self):
           return self.name

class Claim(Entry):
    # for a Claim, its EntryCategory is not used for now -- for further extension of phases
    published = models.BooleanField(default=True)
    CATEGORY_CHOICES = (
        ('pro', 'Pro'),
        ('con', 'Con'),
        ('finding', 'Finding'),
        ('discarded', 'Discarded'),
    )
    claim_category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, null=True, blank=True)
    theme = models.ForeignKey(ClaimTheme, null=True, blank=True)
    # the highlight from which this claim is extracted
    source_highlight = models.ForeignKey(Highlight, null=True, blank=True, related_name='claims_of_highlight')
    new_versions = models.ManyToManyField('self', through='ClaimReference', symmetrical=False, blank=True)
    def getAttr(self, forum):
        attr = super(Claim, self).getAttr(forum)
        attr['entry_type'] = 'claim'
        attr['published'] = self.published
        return attr
    def getExcerpt(self, forum): # used for claim navigator
        attr = {}
        attr['id'] = self.id
        attr['published'] = self.published
        attr['excerpt'] = self.content[:50] + '...'
        attr['updated_at'] = utils.pretty_date(self.updated_at)
        attr['updated_at_full'] = self.updated_at
        return attr

class ClaimReference(models.Model):
    TYPE_CHOICES = (
        ('reword', 'Reword'),
        ('merge', 'Merge'),
    )
    is_adopted = models.BooleanField(default=False)
    refer_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    from_claim = models.ForeignKey(Claim, related_name='older_claims')
    to_claim = models.ForeignKey(Claim, related_name='newer_claims')

class Event(models.Model): # the behavior of a user on an entry
    user = models.ForeignKey(User)
    entry = models.ForeignKey(Entry, related_name='events')
    created_at = models.DateTimeField()
    def getAttr(self):
        attr = {}
        attr['id'] = self.id
        attr['user_id'] = self.user.id
        attr['user_name'] = self.user.get_full_name()
        attr['created_at_full'] = self.created_at # for sorting
        attr['created_at'] = utils.pretty_date(self.created_at)
        return attr

class Vote(Event):
    VOTE_CHOICES = (
        ('pro', 'Pro'),
        ('con', 'Con'),
        ('finding', 'Finding'),
        ('discarded', 'Discarded'),
        ('prioritize', 'Prioritize'),
    )
    vote_type = models.CharField(max_length=20, choices=VOTE_CHOICES)

class ThemeAssignment(Event):
    theme = models.ForeignKey(ClaimTheme)

class Flag(Event):
    FLAG_CHOICES = (
        ('reword', 'Needs rewording'),
        ('merge', 'Needs merging'),
    )
    flag_type = models.CharField(max_length=20, choices=FLAG_CHOICES)
    reason = models.CharField(max_length=2010, null=True, blank=True)
    def getAttr(self):
        attr = super(Flag, self).getAttr()
        attr['entry_type'] = 'flag'
        attr['flag_type'] = self.flag_type
        if self.reason:
            attr['reason'] = self.reason
        return attr

class Post(Entry): # in discussion
    title = models.TextField(null=True, blank=True)
    target = models.ForeignKey(Entry, related_name='get_comments', null=True, blank=True) # for comments of a claim
    # the highlight to which this post is attached
    highlight = models.ForeignKey(Highlight, related_name='posts_of_highlight')
    parent = models.ForeignKey('self', null=True, blank=True, related_name='children')
    CONTENT_CHOICES = (
        ('question', 'Question'),
        ('comment', 'Comment'),
    )
    content_type = models.CharField(max_length=10, choices=CONTENT_CHOICES)
    def getAttr(self, forum):
        attr = super(Post, self).getAttr(forum)
        attr['entry_type'] = self.content_type
        if self.parent:
            attr['parent_name'] = self.parent.author.get_full_name()
            attr['parent_id'] = self.parent.id
        return attr