from django.contrib.gis.db import models
from django.contrib.auth.models import User

import utils

import datetime, time

VISITOR_ROLE = 'visitor'

class UserLogin(models.Model):
    user = models.ForeignKey(User)
    timestamp = models.DateTimeField()

class Forum(models.Model):
    full_name = models.CharField(max_length=500)  # shown on top page/selection page
    short_name = models.CharField(max_length=500)  # used elsewhere
    url = models.CharField(max_length=100)  # used in url
    description = models.TextField(null=True, blank=True)
    ACCESS_CHOICES = (
        ('open', 'Open access'),
        ('panelist', 'Accessible only to the panel'),
        ('private', 'Visible only to the panel'),
    )
    PHASE_CHOICES = (
        ('paused', 'Paused'),
        ('not_started', 'Not started'),
        ('tagging', 'Tagging'),
        ('nugget', 'Nugget extraction'), # phase 1
        ('extract', 'Claim construction'), # phase 2
        ('categorize', 'Claim categorization'), # phase 3
        ('theming', 'Claim theme identification'), 
        ('improve', 'Claim refinement'), # phase 4
        ('finished', 'Finished') # phase 5 statements
    )
    access_level = models.CharField(max_length=100, choices=ACCESS_CHOICES, default='private')
    phase = models.CharField(max_length=100, choices=PHASE_CHOICES, default='not_started')
    contextmap = models.TextField(null=True, blank=True)
    forum_logo = models.ImageField(upload_to='forum_logos', null=True, blank=True, default='forum_logos/default.jpg')
    stmt_preamble = models.TextField(null=True, blank=True)

    def __unicode__(self):  # used for admin site
        return self.full_name + '(' + self.url + ')'

    def getAttr(self):
        attr = {}
        attr['id'] = self.id
        attr['full_name'] = self.full_name
        attr['short_name'] = self.short_name
        attr['url'] = self.url
        attr['full_description'] = self.description
        attr['short_description'] = self.description[:400] + '...'
        attr['phase'] = self.phase
        if self.access_level == 'open':
            attr['access_level'] = 'Open access'
        elif self.access_level == 'panelist':
            attr['access_level'] = 'Accessible only to the panel'
        elif self.access_level == 'private':
            attr['access_level'] = 'Visible only to the panel'
        else:
            attr['access_level'] = self.access_level
        attr['logo_url'] = self.forum_logo.url
        return attr


class Role(models.Model):
    ROLE_CHOICES = (
        ('panelist', 'Panelist'),
        ('expert', 'Subject Matter Expert'),
        ('facilitator', 'Facilitator'),
        ('analyst', 'Analyst'),
        ('visitor', 'Visitor'),
    )
    user = models.ForeignKey(User, related_name="role")
    forum = models.ForeignKey(Forum, related_name="members")
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

    def __str__(self):  # used for admin site
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
    delegator = models.ForeignKey(User, null=True, blank=True, related_name='delegated_entries')
    content = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()
    category = models.ForeignKey(EntryCategory, related_name='entries', null=True, blank=True)
    is_deleted = models.BooleanField(default=False)
    collective = models.BooleanField(default=False)

    def __unicode__(self):
        return self.content

    def getAttr(self, forum):
        attr = {}
        try:
            attr['author_role'] = Role.objects.get(user=self.author, forum=forum).role
        except:
            attr['author_role'] = VISITOR_ROLE
        attr['id'] = self.id
        attr['author_id'] = self.author.id
        attr['author_name'] = self.author.get_full_name()
        try:
            attr['author_initial'] = str.upper(str(self.author.first_name[0]) + str(self.author.last_name[0]))
        except:
            attr['author_initial'] = ''
        attr['content'] = self.content
        attr['created_at_full'] = self.created_at  # for sorting
        attr['updated_at'] = utils.pretty_date(self.updated_at)
        attr['updated_at_full'] = self.updated_at
        attr['is_deleted'] = self.is_deleted
        attr['collective'] = self.collective
        return attr


class Doc(models.Model):
    forum = models.ForeignKey(Forum)
    title = models.TextField()
    description = models.TextField(null=True, blank=True)
    folder = models.ForeignKey(EntryCategory, related_name='doc_entries', null=True, blank=True)
    order = models.TextField(null=True, blank=True)

    def __str__(self):  # used for admin site
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

    def __str__(self):  # used for admin site
        return str(self.id) + ' ' + self.title

    def getAttrAdmin(self):
        attr = {}
        attr['id'] = self.id
        attr['title'] = self.title
        attr['author_name'] = self.author.get_full_name()
        attr['content'] = self.content
        attr['updated_at'] = utils.pretty_date(self.updated_at)
        attr['updated_at_full'] = self.updated_at
        attr['order'] = self.order
        return attr
    def getAttr(self, forum):
        attr = {}
        attr['id'] = self.id
        attr['title'] = self.title
        attr['segmented_text'] = utils.segment_text(self.content)
        attr['updated_at'] = utils.pretty_date(self.updated_at)
        attr['updated_at_full'] = self.updated_at
        return attr

class ClaimTheme(models.Model):
    forum = models.ForeignKey(Forum)
    name = models.CharField(max_length=100)
    description = models.TextField()

    def getAttr(self):
        attr = {}
        attr['id'] = self.id
        attr['name'] = self.name
        attr['description'] = self.description
        return attr

    def __unicode__(self):
        return self.name

class Highlight(models.Model):
    upper_bound = models.FloatField(null=True, blank=True)
    lower_bound = models.FloatField(null=True, blank=True)
    start_pos = models.IntegerField()
    end_pos = models.IntegerField()
    context = models.ForeignKey(Entry, related_name='highlights')
    author = models.ForeignKey(User)
    theme = models.ForeignKey(ClaimTheme, null=True, blank=True)
    is_nugget = models.BooleanField(default=True)
    text = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField()

    def getAttr(self):
        attr = {}
        attr['created_at'] = time.mktime(self.created_at.timetuple())
        attr['created_at_pretty'] = utils.pretty_date(self.created_at)
        attr['id'] = self.id
        attr['start'] = self.start_pos
        attr['end'] = self.end_pos
        attr['author_id'] = self.author.id
        attr['context_id'] = self.context.id
        attr['text'] = self.text
        attr['is_nugget'] = self.is_nugget
        attr['is_used'] = HighlightClaim.objects.filter(highlight_id = self.id).count() > 0
        attr['author_name'] = self.author.first_name + " " + self.author.last_name
        attr['theme'] = self.theme.name
        try:
            tag = Tag.objects.get(highlight_ptr=self)
            attr['content'] = tag.content
            attr['type'] = 'tag'
        except:
            # type of the first entry under this highlight
            # claim has priority
            if self.posts_of_highlight.exists():
                attr['type'] = self.posts_of_highlight.order_by('updated_at')[0].content_type
            else:
                # ghost highlight with no entries attached
                attr['type'] = 'claim'
        return attr


class ClaimVersion(Entry):
    claim = models.ForeignKey('Claim', related_name='versions')
    is_adopted = models.BooleanField(default=True)

    def getAttr(self, forum):
        attr = super(ClaimVersion, self).getAttr(forum)
        attr['version_id'] = attr['id']
        attr['entry_type'] = 'claim version'
        attr['is_adopted'] = self.is_adopted
        return attr

    # get id, author and time only
    def getAttrSimple(self):
        return {
            'id': self.id,
            'entry_type': 'Claim',
            'created_at': self.created_at.isoformat(),
        }

    # for claim navigator
    def getExcerpt(self, forum):
        attr = {}  # for efficiency, don't inherit at all
        attr['version_id'] = self.id
        attr['updated_at_full'] = self.updated_at
        attr['updated_at'] = utils.pretty_date(self.updated_at)
        attr['excerpt'] = self.content[:50] + '...'
        return attr

class Claim(Entry):
    title = models.TextField(null=True, blank=True)
    published = models.BooleanField(default=True)
    stmt_order = models.IntegerField(null=True, blank=True)
    CATEGORY_CHOICES = (
        ('pro', 'Pro'),
        ('con', 'Con'),
        ('finding', 'finding'),
        ('opinion', 'Opinion'),
        ('discarded', 'Discarded'),
    )
    claim_category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, null=True, blank=True)
    theme = models.ForeignKey(ClaimTheme, null=True, blank=True)
    # the highlight from which this claim is extracted
    # source_highlight = models.ForeignKey(Highlight, null=True, blank=True, related_name='claims_of_highlight')
    source_highlights = models.ManyToManyField(Highlight, through='HighlightClaim')

    def __unicode__(self):
        return self.adopted_version().content

    def adopted_version(self):
        return self.versions.get(is_adopted=True)

    def adopted_versions(self):
        return self.versions.filter(is_adopted=True)

    # get id, author and time only
    def getAttrSimple(self):
        return {
            'id': self.id,
            'entry_type': 'Claim',
            'created_at': self.created_at.isoformat(),
        }
    def getAttr(self, forum):
        attr = self.adopted_version().getAttr(forum)
        attr['id'] = self.id
        attr['entry_type'] = 'claim'
        attr['category'] = self.claim_category
        if self.theme:
            attr['theme'] = self.theme.name
        if self.newer_versions.filter(refer_type='merge').exists():
            # is outdated!
            attr['is_merged'] = '.'.join([str(claimref.to_claim.id) for claimref in self.newer_versions.filter(refer_type='merge')])
        if self.older_versions.filter(refer_type='merge').exists():
            # is generated by merging other claims!
            attr['merge_of'] = '.'.join([str(claimref.from_claim.id) for claimref in self.older_versions.filter(refer_type='merge')])
        if self.newer_versions.filter(refer_type='stmt').exists():
            # is used in statement
            attr['is_stmt'] = True
        return attr

    def getAttrSlot(self, forum):
        attr = super(Claim, self).getAttr(forum)
        attr['slot_title'] = self.title
        attr['category'] = self.claim_category
        attr['claims'] = []
        attr['adopted_versions'] = []
        for adopted_version in self.adopted_versions().all():
            attr['adopted_versions'].append({
                'id': adopted_version.id,
                'content': adopted_version.content,
                'author': adopted_version.author.get_full_name()
            })
        for claimref in self.older_versions.filter(refer_type='stmt'):
            attr['claims'].append({
                'id': claimref.from_claim.id,
                'content': claimref.from_claim.adopted_version().content,
                'theme': claimref.from_claim.theme.name
            })
        return attr

    def getAttrStmt(self):
        attr = {}
        attr['id'] = self.id
        attr['content'] = self.adopted_version().content
        if self.theme:
            attr['theme'] = self.theme.name
        return attr

    def getExcerpt(self, forum):  # used for claim navigator
        attr = self.adopted_version().getExcerpt(forum)
        attr['id'] = self.id
        return attr

class ClaimReference(models.Model):
    TYPE_CHOICES = (
        ('merge', 'Merge'),
        ('stmt', 'Referenced by statement slot')
    )
    refer_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    from_claim = models.ForeignKey(Claim, related_name='newer_versions')
    to_claim = models.ForeignKey(Claim, related_name='older_versions')


class Event(models.Model):  # the behavior of a user on an entry
    forum = models.ForeignKey(Forum)
    user = models.ForeignKey(User)
    delegator = models.ForeignKey(User, null=True, blank=True, related_name='delegated_events')
    entry = models.ForeignKey(Entry, related_name='events')
    created_at = models.DateTimeField()
    collective = models.BooleanField(default=False)

    def getAttr(self, forum):
        attr = {}
        attr['id'] = self.id
        attr['user_id'] = self.user.id
        attr['user_name'] = self.user.get_full_name()
        try:
            attr['author_role'] = Role.objects.get(user=self.user, forum=forum).role
        except:
            attr['author_role'] = VISITOR_ROLE
        try:
            attr['author_initial'] = str.upper(str(self.user.first_name[0]) + str(self.user.last_name[0]))
        except:
            attr['author_initial'] = ''
        attr['created_at_full'] = self.created_at  # for sorting
        attr['created_at'] = utils.pretty_date(self.created_at)
        attr['collective'] = self.collective
        return attr

class SlotAssignment(Event):
    EVENT_CHOICES = (
        ('add', 'Add to slot'),
        ('remove', 'Remove from slot'),
    )
    slot = models.ForeignKey(Claim)
    event_type = models.CharField(max_length=20, choices=EVENT_CHOICES)
    def getAttr(self, forum):
        attr = super(SlotAssignment, self).getAttr(forum)
        attr['entry_type'] = 'slotassignment'
        attr['action'] = self.event_type
        attr['claim_id'] = self.entry.id
        return attr

class Vote(Event):
    VOTE_CHOICES = (
        ('pro', 'Pro'),
        ('con', 'Con'),
        ('finding', 'Key Finding'),
        ('discarded', 'Discarded'),
        ('prioritize', 'Prioritize'),
        ('like', 'Like a version'),  # not shown in activity feed
        ('reword', 'Needs rewording'),
        ('merge', 'Needs merging'),
    )
    vote_type = models.CharField(max_length=20, choices=VOTE_CHOICES)
    reason = models.CharField(max_length=2010, null=True, blank=True)

    def getEntryType(self):
        if self.vote_type == 'reword' or self.vote_type == 'merge':
            return 'improve'
        if self.vote_type == 'pro' or self.vote_type == 'con' or self.vote_type == 'finding' or self.vote_type == 'discarded':
            return 'categorize'
        if self.vote_type == 'prioritize' or self.vote_type == 'like':
            return 'prioritize'
        return '(unknown)'

    # get id, author and time only
    def getAttrSimple(self):
        return {
            'id': self.id,
            'entry_type': 'Vote - ' + self.getEntryType(),
            'created_at': self.created_at.isoformat(),
        }
    def getAttr(self, forum):
        attr = super(Vote, self).getAttr(forum)
        attr['entry_type'] = self.getEntryType()
        attr['vote_type'] = self.vote_type
        attr['vote_type_full'] = self.get_vote_type_display()
        if self.reason:
            attr['reason'] = self.reason
        return attr

class Tag(Highlight):
    content = models.TextField()
    claimTheme = models.ForeignKey(ClaimTheme, related_name="tags", null=True, blank=True)
    def getAttr(self):
        attr = super(Tag, self).getAttr()
        attr['content'] = self.content
        if self.claimTheme:
            attr['claimTheme'] = self.claimTheme.name
        return attr

class ThemeAssignment(Event):
    theme = models.ForeignKey(ClaimTheme)

    def getAttr(self, forum):
        attr = super(ThemeAssignment, self).getAttr(forum)
        attr['entry_type'] = 'themeassignment'
        attr['theme_name'] = self.theme.name
        return attr


class Post(Entry):  # in discussion
    title = models.TextField(null=True, blank=True)
    target_entry = models.ForeignKey(Entry, related_name='comments_of_entry', null=True,
                                     blank=True)  # for comments of a claim
    target_event = models.ForeignKey(Event, related_name='comments_of_event', null=True,
                                     blank=True)  # for comments of an event
    # the highlight to which this post is attached
    highlight = models.ForeignKey(Highlight, related_name='posts_of_highlight', null=True, blank=True)
    CONTENT_CHOICES = (
        ('question', 'Question'),
        ('comment', 'Comment'),
    )
    content_type = models.CharField(max_length=10, choices=CONTENT_CHOICES)

    def getTree(self, exclude_root):
        nodes = []
        if not exclude_root and not self.is_deleted:
            nodes = [self]
        for comment in self.comments_of_entry.all():
            nodes.extend(comment.getTree(exclude_root=False))
        return nodes

    # get id, author and time only
    def getAttrSimple(self):
        return {
            'id': self.id,
            'entry_type': self.content_type,
            'created_at': self.created_at.isoformat()
        }
    def getAttr(self, forum):
        attr = super(Post, self).getAttr(forum)
        attr['entry_type'] = self.content_type
        if self.target_entry:
            try:
                order = self.target_entry.stmt_order # see if it's a slot
            except:
                attr['parent_name'] = self.target_entry.author.get_full_name()
                attr['parent_id'] = self.target_entry.id
        if self.target_event:
            attr['parent_name'] = self.target_event.user.get_full_name()
            attr['parent_id'] = self.target_event.id
        return attr

class ChatMessage(models.Model):
    source = models.ForeignKey(User, related_name='get_source')
    target = models.ForeignKey(User, null=True, blank=True)
    reply_target = models.ForeignKey('self', related_name='replies', null=True, blank=True)
    content = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField()
    forum = models.ForeignKey(Forum, null=True, blank=True)

    def __unicode__(self):
        return self.content

    def getAttr(self):
        attr = {}
        try:
            attr['role'] = Role.objects.get(user=self.source, forum=self.forum).role
        except:
            attr['role'] = VISITOR_ROLE
        attr['id'] = self.id
        attr['user_id'] = self.source.id
        attr['user_name'] = self.source.get_full_name()
        attr['content'] = self.content
        attr['created_at'] = utils.pretty_date(self.created_at)
        return attr

class HighlightClaim(models.Model):
    claim = models.ForeignKey(Claim)
    highlight = models.ForeignKey(Highlight)

class NuggetComment(models.Model):
    forum = models.ForeignKey(Forum)
    author = models.ForeignKey(User)
    theme = models.ForeignKey(ClaimTheme, null=True, blank=True)
    content = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField()

class SankeyWorkbench(models.Model):
    forum = models.ForeignKey(Forum)
    author = models.ForeignKey(User)
    content = models.TextField(null=True, blank=True)

class SankeyScreenshot(models.Model):
    content = models.TextField(null=True, blank=True)

class ViewLog(models.Model):
    heatmap = models.TextField(null=True, blank=True)
    doc = models.ForeignKey(Doc, related_name='viewlogs') 
    author = models.ForeignKey(User, related_name='viewlogs')
    created_at = models.DateTimeField(null=True, blank=True)

class NuggetMap(models.Model):
    distribution = models.TextField(null=True, blank=True)
    doc = models.ForeignKey(Doc, related_name='nuggetmaps') 
    author = models.ForeignKey(User, related_name='nuggetmaps')
    theme = models.ForeignKey(ClaimTheme, related_name='nuggetmaps')
    created_at = models.DateTimeField(null=True, blank=True)

class NuggetLensInteraction(models.Model):
    author = models.ForeignKey(User)
    created_at = models.DateTimeField(null=True, blank=True)
    is_open = models.BooleanField(default=False)
    forum = models.ForeignKey(Forum, null=True, blank=True)