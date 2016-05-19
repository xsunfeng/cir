# -*- coding: utf-8 -*-
from south.utils import datetime_utils as datetime
from south.db import db
from south.v2 import SchemaMigration
from django.db import models


class Migration(SchemaMigration):

    def forwards(self, orm):
        # Adding model 'UserLogin'
        db.create_table(u'cir_userlogin', (
            (u'id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('user', self.gf('django.db.models.fields.related.ForeignKey')(to=orm['auth.User'])),
            ('timestamp', self.gf('django.db.models.fields.DateTimeField')()),
        ))
        db.send_create_signal(u'cir', ['UserLogin'])

        # Adding model 'Forum'
        db.create_table(u'cir_forum', (
            (u'id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('full_name', self.gf('django.db.models.fields.CharField')(max_length=500)),
            ('short_name', self.gf('django.db.models.fields.CharField')(max_length=500)),
            ('url', self.gf('django.db.models.fields.CharField')(max_length=100)),
            ('description', self.gf('django.db.models.fields.TextField')(null=True, blank=True)),
            ('access_level', self.gf('django.db.models.fields.CharField')(default='private', max_length=100)),
            ('phase', self.gf('django.db.models.fields.CharField')(default='not_started', max_length=100)),
            ('contextmap', self.gf('django.db.models.fields.TextField')(null=True, blank=True)),
            ('forum_logo', self.gf('django.db.models.fields.files.ImageField')(default='forum_logos/default.jpg', max_length=100, null=True, blank=True)),
            ('stmt_preamble', self.gf('django.db.models.fields.TextField')(null=True, blank=True)),
        ))
        db.send_create_signal(u'cir', ['Forum'])

        # Adding model 'Role'
        db.create_table(u'cir_role', (
            (u'id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('user', self.gf('django.db.models.fields.related.ForeignKey')(related_name='role', to=orm['auth.User'])),
            ('forum', self.gf('django.db.models.fields.related.ForeignKey')(related_name='members', to=orm['cir.Forum'])),
            ('role', self.gf('django.db.models.fields.CharField')(max_length=20)),
        ))
        db.send_create_signal(u'cir', ['Role'])

        # Adding model 'UserInfo'
        db.create_table(u'cir_userinfo', (
            (u'id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('user', self.gf('django.db.models.fields.related.OneToOneField')(related_name='info', unique=True, to=orm['auth.User'])),
            ('description', self.gf('django.db.models.fields.TextField')(null=True, blank=True)),
            ('last_visited_forum', self.gf('django.db.models.fields.related.ForeignKey')(to=orm['cir.Forum'], null=True, blank=True)),
        ))
        db.send_create_signal(u'cir', ['UserInfo'])

        # Adding model 'EntryCategory'
        db.create_table(u'cir_entrycategory', (
            (u'id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('name', self.gf('django.db.models.fields.CharField')(max_length=200, null=True, blank=True)),
            ('category_type', self.gf('django.db.models.fields.CharField')(max_length=10)),
            ('forum', self.gf('django.db.models.fields.related.ForeignKey')(to=orm['cir.Forum'])),
            ('visible', self.gf('django.db.models.fields.BooleanField')(default=False)),
            ('can_create', self.gf('django.db.models.fields.BooleanField')(default=False)),
            ('can_edit', self.gf('django.db.models.fields.BooleanField')(default=False)),
            ('can_delete', self.gf('django.db.models.fields.BooleanField')(default=False)),
            ('can_extract', self.gf('django.db.models.fields.BooleanField')(default=False)),
            ('can_prioritize', self.gf('django.db.models.fields.BooleanField')(default=False)),
            ('instructions', self.gf('django.db.models.fields.TextField')(null=True, blank=True)),
        ))
        db.send_create_signal(u'cir', ['EntryCategory'])

        # Adding model 'Entry'
        db.create_table(u'cir_entry', (
            (u'id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('forum', self.gf('django.db.models.fields.related.ForeignKey')(to=orm['cir.Forum'])),
            ('author', self.gf('django.db.models.fields.related.ForeignKey')(to=orm['auth.User'])),
            ('delegator', self.gf('django.db.models.fields.related.ForeignKey')(blank=True, related_name='delegated_entries', null=True, to=orm['auth.User'])),
            ('content', self.gf('django.db.models.fields.TextField')(null=True, blank=True)),
            ('created_at', self.gf('django.db.models.fields.DateTimeField')()),
            ('updated_at', self.gf('django.db.models.fields.DateTimeField')()),
            ('category', self.gf('django.db.models.fields.related.ForeignKey')(blank=True, related_name='entries', null=True, to=orm['cir.EntryCategory'])),
            ('is_deleted', self.gf('django.db.models.fields.BooleanField')(default=False)),
            ('collective', self.gf('django.db.models.fields.BooleanField')(default=False)),
        ))
        db.send_create_signal(u'cir', ['Entry'])

        # Adding model 'Doc'
        db.create_table(u'cir_doc', (
            (u'id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('forum', self.gf('django.db.models.fields.related.ForeignKey')(to=orm['cir.Forum'])),
            ('title', self.gf('django.db.models.fields.TextField')()),
            ('description', self.gf('django.db.models.fields.TextField')(null=True, blank=True)),
            ('folder', self.gf('django.db.models.fields.related.ForeignKey')(blank=True, related_name='doc_entries', null=True, to=orm['cir.EntryCategory'])),
            ('order', self.gf('django.db.models.fields.TextField')(null=True, blank=True)),
        ))
        db.send_create_signal(u'cir', ['Doc'])

        # Adding model 'DocSection'
        db.create_table(u'cir_docsection', (
            (u'entry_ptr', self.gf('django.db.models.fields.related.OneToOneField')(to=orm['cir.Entry'], unique=True, primary_key=True)),
            ('title', self.gf('django.db.models.fields.TextField')(null=True, blank=True)),
            ('order', self.gf('django.db.models.fields.IntegerField')(null=True, blank=True)),
            ('doc', self.gf('django.db.models.fields.related.ForeignKey')(related_name='sections', to=orm['cir.Doc'])),
        ))
        db.send_create_signal(u'cir', ['DocSection'])

        # Adding model 'ClaimTheme'
        db.create_table(u'cir_claimtheme', (
            (u'id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('forum', self.gf('django.db.models.fields.related.ForeignKey')(to=orm['cir.Forum'])),
            ('name', self.gf('django.db.models.fields.CharField')(max_length=100)),
            ('description', self.gf('django.db.models.fields.TextField')()),
        ))
        db.send_create_signal(u'cir', ['ClaimTheme'])

        # Adding model 'Highlight'
        db.create_table(u'cir_highlight', (
            (u'id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('upper_bound', self.gf('django.db.models.fields.FloatField')(null=True, blank=True)),
            ('lower_bound', self.gf('django.db.models.fields.FloatField')(null=True, blank=True)),
            ('start_pos', self.gf('django.db.models.fields.IntegerField')()),
            ('end_pos', self.gf('django.db.models.fields.IntegerField')()),
            ('context', self.gf('django.db.models.fields.related.ForeignKey')(related_name='highlights', to=orm['cir.Entry'])),
            ('author', self.gf('django.db.models.fields.related.ForeignKey')(to=orm['auth.User'])),
            ('theme', self.gf('django.db.models.fields.related.ForeignKey')(to=orm['cir.ClaimTheme'], null=True, blank=True)),
            ('is_nugget', self.gf('django.db.models.fields.BooleanField')(default=True)),
            ('text', self.gf('django.db.models.fields.TextField')(null=True, blank=True)),
            ('created_at', self.gf('django.db.models.fields.DateTimeField')()),
        ))
        db.send_create_signal(u'cir', ['Highlight'])

        # Adding model 'ClaimVersion'
        db.create_table(u'cir_claimversion', (
            (u'entry_ptr', self.gf('django.db.models.fields.related.OneToOneField')(to=orm['cir.Entry'], unique=True, primary_key=True)),
            ('claim', self.gf('django.db.models.fields.related.ForeignKey')(related_name='versions', to=orm['cir.Claim'])),
            ('is_adopted', self.gf('django.db.models.fields.BooleanField')(default=True)),
        ))
        db.send_create_signal(u'cir', ['ClaimVersion'])

        # Adding model 'Claim'
        db.create_table(u'cir_claim', (
            (u'entry_ptr', self.gf('django.db.models.fields.related.OneToOneField')(to=orm['cir.Entry'], unique=True, primary_key=True)),
            ('published', self.gf('django.db.models.fields.BooleanField')(default=True)),
            ('stmt_order', self.gf('django.db.models.fields.IntegerField')(null=True, blank=True)),
            ('claim_category', self.gf('django.db.models.fields.CharField')(max_length=20, null=True, blank=True)),
            ('theme', self.gf('django.db.models.fields.related.ForeignKey')(to=orm['cir.ClaimTheme'], null=True, blank=True)),
        ))
        db.send_create_signal(u'cir', ['Claim'])

        # Adding model 'ClaimReference'
        db.create_table(u'cir_claimreference', (
            (u'id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('refer_type', self.gf('django.db.models.fields.CharField')(max_length=20)),
            ('from_claim', self.gf('django.db.models.fields.related.ForeignKey')(related_name='newer_versions', to=orm['cir.Claim'])),
            ('to_claim', self.gf('django.db.models.fields.related.ForeignKey')(related_name='older_versions', to=orm['cir.Claim'])),
        ))
        db.send_create_signal(u'cir', ['ClaimReference'])

        # Adding model 'Event'
        db.create_table(u'cir_event', (
            (u'id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('forum', self.gf('django.db.models.fields.related.ForeignKey')(to=orm['cir.Forum'])),
            ('user', self.gf('django.db.models.fields.related.ForeignKey')(to=orm['auth.User'])),
            ('delegator', self.gf('django.db.models.fields.related.ForeignKey')(blank=True, related_name='delegated_events', null=True, to=orm['auth.User'])),
            ('entry', self.gf('django.db.models.fields.related.ForeignKey')(related_name='events', to=orm['cir.Entry'])),
            ('created_at', self.gf('django.db.models.fields.DateTimeField')()),
            ('collective', self.gf('django.db.models.fields.BooleanField')(default=False)),
        ))
        db.send_create_signal(u'cir', ['Event'])

        # Adding model 'Vote'
        db.create_table(u'cir_vote', (
            (u'event_ptr', self.gf('django.db.models.fields.related.OneToOneField')(to=orm['cir.Event'], unique=True, primary_key=True)),
            ('vote_type', self.gf('django.db.models.fields.CharField')(max_length=20)),
            ('reason', self.gf('django.db.models.fields.CharField')(max_length=2010, null=True, blank=True)),
        ))
        db.send_create_signal(u'cir', ['Vote'])

        # Adding model 'Tag'
        db.create_table(u'cir_tag', (
            (u'highlight_ptr', self.gf('django.db.models.fields.related.OneToOneField')(to=orm['cir.Highlight'], unique=True, primary_key=True)),
            ('content', self.gf('django.db.models.fields.TextField')()),
            ('claimTheme', self.gf('django.db.models.fields.related.ForeignKey')(blank=True, related_name='tags', null=True, to=orm['cir.ClaimTheme'])),
        ))
        db.send_create_signal(u'cir', ['Tag'])

        # Adding model 'ThemeAssignment'
        db.create_table(u'cir_themeassignment', (
            (u'event_ptr', self.gf('django.db.models.fields.related.OneToOneField')(to=orm['cir.Event'], unique=True, primary_key=True)),
            ('theme', self.gf('django.db.models.fields.related.ForeignKey')(to=orm['cir.ClaimTheme'])),
        ))
        db.send_create_signal(u'cir', ['ThemeAssignment'])

        # Adding model 'Post'
        db.create_table(u'cir_post', (
            (u'entry_ptr', self.gf('django.db.models.fields.related.OneToOneField')(to=orm['cir.Entry'], unique=True, primary_key=True)),
            ('title', self.gf('django.db.models.fields.TextField')(null=True, blank=True)),
            ('target_entry', self.gf('django.db.models.fields.related.ForeignKey')(blank=True, related_name='comments_of_entry', null=True, to=orm['cir.Entry'])),
            ('target_event', self.gf('django.db.models.fields.related.ForeignKey')(blank=True, related_name='comments_of_event', null=True, to=orm['cir.Event'])),
            ('highlight', self.gf('django.db.models.fields.related.ForeignKey')(blank=True, related_name='posts_of_highlight', null=True, to=orm['cir.Highlight'])),
            ('content_type', self.gf('django.db.models.fields.CharField')(max_length=10)),
        ))
        db.send_create_signal(u'cir', ['Post'])

        # Adding model 'ChatMessage'
        db.create_table(u'cir_chatmessage', (
            (u'id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('source', self.gf('django.db.models.fields.related.ForeignKey')(related_name='get_source', to=orm['auth.User'])),
            ('target', self.gf('django.db.models.fields.related.ForeignKey')(to=orm['auth.User'], null=True, blank=True)),
            ('reply_target', self.gf('django.db.models.fields.related.ForeignKey')(blank=True, related_name='replies', null=True, to=orm['cir.ChatMessage'])),
            ('content', self.gf('django.db.models.fields.TextField')(null=True, blank=True)),
            ('created_at', self.gf('django.db.models.fields.DateTimeField')()),
            ('forum', self.gf('django.db.models.fields.related.ForeignKey')(to=orm['cir.Forum'], null=True, blank=True)),
        ))
        db.send_create_signal(u'cir', ['ChatMessage'])

        # Adding model 'HighlightClaim'
        db.create_table(u'cir_highlightclaim', (
            (u'id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('claim', self.gf('django.db.models.fields.related.ForeignKey')(to=orm['cir.Claim'])),
            ('highlight', self.gf('django.db.models.fields.related.ForeignKey')(to=orm['cir.Highlight'])),
        ))
        db.send_create_signal(u'cir', ['HighlightClaim'])

        # Adding model 'NuggetComment'
        db.create_table(u'cir_nuggetcomment', (
            (u'id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('forum', self.gf('django.db.models.fields.related.ForeignKey')(to=orm['cir.Forum'])),
            ('author', self.gf('django.db.models.fields.related.ForeignKey')(to=orm['auth.User'])),
            ('theme', self.gf('django.db.models.fields.related.ForeignKey')(to=orm['cir.ClaimTheme'], null=True, blank=True)),
            ('content', self.gf('django.db.models.fields.TextField')(null=True, blank=True)),
            ('created_at', self.gf('django.db.models.fields.DateTimeField')()),
        ))
        db.send_create_signal(u'cir', ['NuggetComment'])

        # Adding model 'SankeyWorkbench'
        db.create_table(u'cir_sankeyworkbench', (
            (u'id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('forum', self.gf('django.db.models.fields.related.ForeignKey')(to=orm['cir.Forum'])),
            ('author', self.gf('django.db.models.fields.related.ForeignKey')(to=orm['auth.User'])),
            ('content', self.gf('django.db.models.fields.TextField')(null=True, blank=True)),
        ))
        db.send_create_signal(u'cir', ['SankeyWorkbench'])

        # Adding model 'SankeyScreenshot'
        db.create_table(u'cir_sankeyscreenshot', (
            (u'id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('content', self.gf('django.db.models.fields.TextField')(null=True, blank=True)),
        ))
        db.send_create_signal(u'cir', ['SankeyScreenshot'])

        # Adding model 'ViewLog'
        db.create_table(u'cir_viewlog', (
            (u'id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('heatmap', self.gf('django.db.models.fields.TextField')(null=True, blank=True)),
            ('doc', self.gf('django.db.models.fields.related.ForeignKey')(related_name='viewlogs', to=orm['cir.Doc'])),
            ('author', self.gf('django.db.models.fields.related.ForeignKey')(related_name='viewlogs', to=orm['auth.User'])),
            ('created_at', self.gf('django.db.models.fields.DateTimeField')(null=True, blank=True)),
        ))
        db.send_create_signal(u'cir', ['ViewLog'])

        # Adding model 'NuggetMap'
        db.create_table(u'cir_nuggetmap', (
            (u'id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('distribution', self.gf('django.db.models.fields.TextField')(null=True, blank=True)),
            ('doc', self.gf('django.db.models.fields.related.ForeignKey')(related_name='nuggetmaps', to=orm['cir.Doc'])),
            ('author', self.gf('django.db.models.fields.related.ForeignKey')(related_name='nuggetmaps', to=orm['auth.User'])),
            ('theme', self.gf('django.db.models.fields.related.ForeignKey')(related_name='nuggetmaps', to=orm['cir.ClaimTheme'])),
            ('created_at', self.gf('django.db.models.fields.DateTimeField')(null=True, blank=True)),
        ))
        db.send_create_signal(u'cir', ['NuggetMap'])

        # Adding model 'NuggetLensInteraction'
        db.create_table(u'cir_nuggetlensinteraction', (
            (u'id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('author', self.gf('django.db.models.fields.related.ForeignKey')(to=orm['auth.User'])),
            ('created_at', self.gf('django.db.models.fields.DateTimeField')(null=True, blank=True)),
            ('is_open', self.gf('django.db.models.fields.BooleanField')(default=False)),
            ('forum', self.gf('django.db.models.fields.related.ForeignKey')(to=orm['cir.Forum'], null=True, blank=True)),
        ))
        db.send_create_signal(u'cir', ['NuggetLensInteraction'])


    def backwards(self, orm):
        # Deleting model 'UserLogin'
        db.delete_table(u'cir_userlogin')

        # Deleting model 'Forum'
        db.delete_table(u'cir_forum')

        # Deleting model 'Role'
        db.delete_table(u'cir_role')

        # Deleting model 'UserInfo'
        db.delete_table(u'cir_userinfo')

        # Deleting model 'EntryCategory'
        db.delete_table(u'cir_entrycategory')

        # Deleting model 'Entry'
        db.delete_table(u'cir_entry')

        # Deleting model 'Doc'
        db.delete_table(u'cir_doc')

        # Deleting model 'DocSection'
        db.delete_table(u'cir_docsection')

        # Deleting model 'ClaimTheme'
        db.delete_table(u'cir_claimtheme')

        # Deleting model 'Highlight'
        db.delete_table(u'cir_highlight')

        # Deleting model 'ClaimVersion'
        db.delete_table(u'cir_claimversion')

        # Deleting model 'Claim'
        db.delete_table(u'cir_claim')

        # Deleting model 'ClaimReference'
        db.delete_table(u'cir_claimreference')

        # Deleting model 'Event'
        db.delete_table(u'cir_event')

        # Deleting model 'Vote'
        db.delete_table(u'cir_vote')

        # Deleting model 'Tag'
        db.delete_table(u'cir_tag')

        # Deleting model 'ThemeAssignment'
        db.delete_table(u'cir_themeassignment')

        # Deleting model 'Post'
        db.delete_table(u'cir_post')

        # Deleting model 'ChatMessage'
        db.delete_table(u'cir_chatmessage')

        # Deleting model 'HighlightClaim'
        db.delete_table(u'cir_highlightclaim')

        # Deleting model 'NuggetComment'
        db.delete_table(u'cir_nuggetcomment')

        # Deleting model 'SankeyWorkbench'
        db.delete_table(u'cir_sankeyworkbench')

        # Deleting model 'SankeyScreenshot'
        db.delete_table(u'cir_sankeyscreenshot')

        # Deleting model 'ViewLog'
        db.delete_table(u'cir_viewlog')

        # Deleting model 'NuggetMap'
        db.delete_table(u'cir_nuggetmap')

        # Deleting model 'NuggetLensInteraction'
        db.delete_table(u'cir_nuggetlensinteraction')


    models = {
        u'auth.group': {
            'Meta': {'object_name': 'Group'},
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'name': ('django.db.models.fields.CharField', [], {'unique': 'True', 'max_length': '80'}),
            'permissions': ('django.db.models.fields.related.ManyToManyField', [], {'to': u"orm['auth.Permission']", 'symmetrical': 'False', 'blank': 'True'})
        },
        u'auth.permission': {
            'Meta': {'ordering': "(u'content_type__app_label', u'content_type__model', u'codename')", 'unique_together': "((u'content_type', u'codename'),)", 'object_name': 'Permission'},
            'codename': ('django.db.models.fields.CharField', [], {'max_length': '100'}),
            'content_type': ('django.db.models.fields.related.ForeignKey', [], {'to': u"orm['contenttypes.ContentType']"}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'name': ('django.db.models.fields.CharField', [], {'max_length': '50'})
        },
        u'auth.user': {
            'Meta': {'object_name': 'User'},
            'date_joined': ('django.db.models.fields.DateTimeField', [], {'default': 'datetime.datetime.now'}),
            'email': ('django.db.models.fields.EmailField', [], {'max_length': '75', 'blank': 'True'}),
            'first_name': ('django.db.models.fields.CharField', [], {'max_length': '30', 'blank': 'True'}),
            'groups': ('django.db.models.fields.related.ManyToManyField', [], {'to': u"orm['auth.Group']", 'symmetrical': 'False', 'blank': 'True'}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'is_active': ('django.db.models.fields.BooleanField', [], {'default': 'True'}),
            'is_staff': ('django.db.models.fields.BooleanField', [], {'default': 'False'}),
            'is_superuser': ('django.db.models.fields.BooleanField', [], {'default': 'False'}),
            'last_login': ('django.db.models.fields.DateTimeField', [], {'default': 'datetime.datetime.now'}),
            'last_name': ('django.db.models.fields.CharField', [], {'max_length': '30', 'blank': 'True'}),
            'password': ('django.db.models.fields.CharField', [], {'max_length': '128'}),
            'user_permissions': ('django.db.models.fields.related.ManyToManyField', [], {'to': u"orm['auth.Permission']", 'symmetrical': 'False', 'blank': 'True'}),
            'username': ('django.db.models.fields.CharField', [], {'unique': 'True', 'max_length': '30'})
        },
        u'cir.chatmessage': {
            'Meta': {'object_name': 'ChatMessage'},
            'content': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            'created_at': ('django.db.models.fields.DateTimeField', [], {}),
            'forum': ('django.db.models.fields.related.ForeignKey', [], {'to': u"orm['cir.Forum']", 'null': 'True', 'blank': 'True'}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'reply_target': ('django.db.models.fields.related.ForeignKey', [], {'blank': 'True', 'related_name': "'replies'", 'null': 'True', 'to': u"orm['cir.ChatMessage']"}),
            'source': ('django.db.models.fields.related.ForeignKey', [], {'related_name': "'get_source'", 'to': u"orm['auth.User']"}),
            'target': ('django.db.models.fields.related.ForeignKey', [], {'to': u"orm['auth.User']", 'null': 'True', 'blank': 'True'})
        },
        u'cir.claim': {
            'Meta': {'object_name': 'Claim', '_ormbases': [u'cir.Entry']},
            'claim_category': ('django.db.models.fields.CharField', [], {'max_length': '20', 'null': 'True', 'blank': 'True'}),
            u'entry_ptr': ('django.db.models.fields.related.OneToOneField', [], {'to': u"orm['cir.Entry']", 'unique': 'True', 'primary_key': 'True'}),
            'published': ('django.db.models.fields.BooleanField', [], {'default': 'True'}),
            'source_highlights': ('django.db.models.fields.related.ManyToManyField', [], {'to': u"orm['cir.Highlight']", 'through': u"orm['cir.HighlightClaim']", 'symmetrical': 'False'}),
            'stmt_order': ('django.db.models.fields.IntegerField', [], {'null': 'True', 'blank': 'True'}),
            'theme': ('django.db.models.fields.related.ForeignKey', [], {'to': u"orm['cir.ClaimTheme']", 'null': 'True', 'blank': 'True'})
        },
        u'cir.claimreference': {
            'Meta': {'object_name': 'ClaimReference'},
            'from_claim': ('django.db.models.fields.related.ForeignKey', [], {'related_name': "'newer_versions'", 'to': u"orm['cir.Claim']"}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'refer_type': ('django.db.models.fields.CharField', [], {'max_length': '20'}),
            'to_claim': ('django.db.models.fields.related.ForeignKey', [], {'related_name': "'older_versions'", 'to': u"orm['cir.Claim']"})
        },
        u'cir.claimtheme': {
            'Meta': {'object_name': 'ClaimTheme'},
            'description': ('django.db.models.fields.TextField', [], {}),
            'forum': ('django.db.models.fields.related.ForeignKey', [], {'to': u"orm['cir.Forum']"}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'name': ('django.db.models.fields.CharField', [], {'max_length': '100'})
        },
        u'cir.claimversion': {
            'Meta': {'object_name': 'ClaimVersion', '_ormbases': [u'cir.Entry']},
            'claim': ('django.db.models.fields.related.ForeignKey', [], {'related_name': "'versions'", 'to': u"orm['cir.Claim']"}),
            u'entry_ptr': ('django.db.models.fields.related.OneToOneField', [], {'to': u"orm['cir.Entry']", 'unique': 'True', 'primary_key': 'True'}),
            'is_adopted': ('django.db.models.fields.BooleanField', [], {'default': 'True'})
        },
        u'cir.doc': {
            'Meta': {'object_name': 'Doc'},
            'description': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            'folder': ('django.db.models.fields.related.ForeignKey', [], {'blank': 'True', 'related_name': "'doc_entries'", 'null': 'True', 'to': u"orm['cir.EntryCategory']"}),
            'forum': ('django.db.models.fields.related.ForeignKey', [], {'to': u"orm['cir.Forum']"}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'order': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            'title': ('django.db.models.fields.TextField', [], {})
        },
        u'cir.docsection': {
            'Meta': {'object_name': 'DocSection', '_ormbases': [u'cir.Entry']},
            'doc': ('django.db.models.fields.related.ForeignKey', [], {'related_name': "'sections'", 'to': u"orm['cir.Doc']"}),
            u'entry_ptr': ('django.db.models.fields.related.OneToOneField', [], {'to': u"orm['cir.Entry']", 'unique': 'True', 'primary_key': 'True'}),
            'order': ('django.db.models.fields.IntegerField', [], {'null': 'True', 'blank': 'True'}),
            'title': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'})
        },
        u'cir.entry': {
            'Meta': {'object_name': 'Entry'},
            'author': ('django.db.models.fields.related.ForeignKey', [], {'to': u"orm['auth.User']"}),
            'category': ('django.db.models.fields.related.ForeignKey', [], {'blank': 'True', 'related_name': "'entries'", 'null': 'True', 'to': u"orm['cir.EntryCategory']"}),
            'collective': ('django.db.models.fields.BooleanField', [], {'default': 'False'}),
            'content': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            'created_at': ('django.db.models.fields.DateTimeField', [], {}),
            'delegator': ('django.db.models.fields.related.ForeignKey', [], {'blank': 'True', 'related_name': "'delegated_entries'", 'null': 'True', 'to': u"orm['auth.User']"}),
            'forum': ('django.db.models.fields.related.ForeignKey', [], {'to': u"orm['cir.Forum']"}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'is_deleted': ('django.db.models.fields.BooleanField', [], {'default': 'False'}),
            'updated_at': ('django.db.models.fields.DateTimeField', [], {})
        },
        u'cir.entrycategory': {
            'Meta': {'object_name': 'EntryCategory'},
            'can_create': ('django.db.models.fields.BooleanField', [], {'default': 'False'}),
            'can_delete': ('django.db.models.fields.BooleanField', [], {'default': 'False'}),
            'can_edit': ('django.db.models.fields.BooleanField', [], {'default': 'False'}),
            'can_extract': ('django.db.models.fields.BooleanField', [], {'default': 'False'}),
            'can_prioritize': ('django.db.models.fields.BooleanField', [], {'default': 'False'}),
            'category_type': ('django.db.models.fields.CharField', [], {'max_length': '10'}),
            'forum': ('django.db.models.fields.related.ForeignKey', [], {'to': u"orm['cir.Forum']"}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'instructions': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            'name': ('django.db.models.fields.CharField', [], {'max_length': '200', 'null': 'True', 'blank': 'True'}),
            'visible': ('django.db.models.fields.BooleanField', [], {'default': 'False'})
        },
        u'cir.event': {
            'Meta': {'object_name': 'Event'},
            'collective': ('django.db.models.fields.BooleanField', [], {'default': 'False'}),
            'created_at': ('django.db.models.fields.DateTimeField', [], {}),
            'delegator': ('django.db.models.fields.related.ForeignKey', [], {'blank': 'True', 'related_name': "'delegated_events'", 'null': 'True', 'to': u"orm['auth.User']"}),
            'entry': ('django.db.models.fields.related.ForeignKey', [], {'related_name': "'events'", 'to': u"orm['cir.Entry']"}),
            'forum': ('django.db.models.fields.related.ForeignKey', [], {'to': u"orm['cir.Forum']"}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'user': ('django.db.models.fields.related.ForeignKey', [], {'to': u"orm['auth.User']"})
        },
        u'cir.forum': {
            'Meta': {'object_name': 'Forum'},
            'access_level': ('django.db.models.fields.CharField', [], {'default': "'private'", 'max_length': '100'}),
            'contextmap': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            'description': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            'forum_logo': ('django.db.models.fields.files.ImageField', [], {'default': "'forum_logos/default.jpg'", 'max_length': '100', 'null': 'True', 'blank': 'True'}),
            'full_name': ('django.db.models.fields.CharField', [], {'max_length': '500'}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'phase': ('django.db.models.fields.CharField', [], {'default': "'not_started'", 'max_length': '100'}),
            'short_name': ('django.db.models.fields.CharField', [], {'max_length': '500'}),
            'stmt_preamble': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            'url': ('django.db.models.fields.CharField', [], {'max_length': '100'})
        },
        u'cir.highlight': {
            'Meta': {'object_name': 'Highlight'},
            'author': ('django.db.models.fields.related.ForeignKey', [], {'to': u"orm['auth.User']"}),
            'context': ('django.db.models.fields.related.ForeignKey', [], {'related_name': "'highlights'", 'to': u"orm['cir.Entry']"}),
            'created_at': ('django.db.models.fields.DateTimeField', [], {}),
            'end_pos': ('django.db.models.fields.IntegerField', [], {}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'is_nugget': ('django.db.models.fields.BooleanField', [], {'default': 'True'}),
            'lower_bound': ('django.db.models.fields.FloatField', [], {'null': 'True', 'blank': 'True'}),
            'start_pos': ('django.db.models.fields.IntegerField', [], {}),
            'text': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            'theme': ('django.db.models.fields.related.ForeignKey', [], {'to': u"orm['cir.ClaimTheme']", 'null': 'True', 'blank': 'True'}),
            'upper_bound': ('django.db.models.fields.FloatField', [], {'null': 'True', 'blank': 'True'})
        },
        u'cir.highlightclaim': {
            'Meta': {'object_name': 'HighlightClaim'},
            'claim': ('django.db.models.fields.related.ForeignKey', [], {'to': u"orm['cir.Claim']"}),
            'highlight': ('django.db.models.fields.related.ForeignKey', [], {'to': u"orm['cir.Highlight']"}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'})
        },
        u'cir.nuggetcomment': {
            'Meta': {'object_name': 'NuggetComment'},
            'author': ('django.db.models.fields.related.ForeignKey', [], {'to': u"orm['auth.User']"}),
            'content': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            'created_at': ('django.db.models.fields.DateTimeField', [], {}),
            'forum': ('django.db.models.fields.related.ForeignKey', [], {'to': u"orm['cir.Forum']"}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'theme': ('django.db.models.fields.related.ForeignKey', [], {'to': u"orm['cir.ClaimTheme']", 'null': 'True', 'blank': 'True'})
        },
        u'cir.nuggetlensinteraction': {
            'Meta': {'object_name': 'NuggetLensInteraction'},
            'author': ('django.db.models.fields.related.ForeignKey', [], {'to': u"orm['auth.User']"}),
            'created_at': ('django.db.models.fields.DateTimeField', [], {'null': 'True', 'blank': 'True'}),
            'forum': ('django.db.models.fields.related.ForeignKey', [], {'to': u"orm['cir.Forum']", 'null': 'True', 'blank': 'True'}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'is_open': ('django.db.models.fields.BooleanField', [], {'default': 'False'})
        },
        u'cir.nuggetmap': {
            'Meta': {'object_name': 'NuggetMap'},
            'author': ('django.db.models.fields.related.ForeignKey', [], {'related_name': "'nuggetmaps'", 'to': u"orm['auth.User']"}),
            'created_at': ('django.db.models.fields.DateTimeField', [], {'null': 'True', 'blank': 'True'}),
            'distribution': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            'doc': ('django.db.models.fields.related.ForeignKey', [], {'related_name': "'nuggetmaps'", 'to': u"orm['cir.Doc']"}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'theme': ('django.db.models.fields.related.ForeignKey', [], {'related_name': "'nuggetmaps'", 'to': u"orm['cir.ClaimTheme']"})
        },
        u'cir.post': {
            'Meta': {'object_name': 'Post', '_ormbases': [u'cir.Entry']},
            'content_type': ('django.db.models.fields.CharField', [], {'max_length': '10'}),
            u'entry_ptr': ('django.db.models.fields.related.OneToOneField', [], {'to': u"orm['cir.Entry']", 'unique': 'True', 'primary_key': 'True'}),
            'highlight': ('django.db.models.fields.related.ForeignKey', [], {'blank': 'True', 'related_name': "'posts_of_highlight'", 'null': 'True', 'to': u"orm['cir.Highlight']"}),
            'target_entry': ('django.db.models.fields.related.ForeignKey', [], {'blank': 'True', 'related_name': "'comments_of_entry'", 'null': 'True', 'to': u"orm['cir.Entry']"}),
            'target_event': ('django.db.models.fields.related.ForeignKey', [], {'blank': 'True', 'related_name': "'comments_of_event'", 'null': 'True', 'to': u"orm['cir.Event']"}),
            'title': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'})
        },
        u'cir.role': {
            'Meta': {'object_name': 'Role'},
            'forum': ('django.db.models.fields.related.ForeignKey', [], {'related_name': "'members'", 'to': u"orm['cir.Forum']"}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'role': ('django.db.models.fields.CharField', [], {'max_length': '20'}),
            'user': ('django.db.models.fields.related.ForeignKey', [], {'related_name': "'role'", 'to': u"orm['auth.User']"})
        },
        u'cir.sankeyscreenshot': {
            'Meta': {'object_name': 'SankeyScreenshot'},
            'content': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'})
        },
        u'cir.sankeyworkbench': {
            'Meta': {'object_name': 'SankeyWorkbench'},
            'author': ('django.db.models.fields.related.ForeignKey', [], {'to': u"orm['auth.User']"}),
            'content': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            'forum': ('django.db.models.fields.related.ForeignKey', [], {'to': u"orm['cir.Forum']"}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'})
        },
        u'cir.tag': {
            'Meta': {'object_name': 'Tag', '_ormbases': [u'cir.Highlight']},
            'claimTheme': ('django.db.models.fields.related.ForeignKey', [], {'blank': 'True', 'related_name': "'tags'", 'null': 'True', 'to': u"orm['cir.ClaimTheme']"}),
            'content': ('django.db.models.fields.TextField', [], {}),
            u'highlight_ptr': ('django.db.models.fields.related.OneToOneField', [], {'to': u"orm['cir.Highlight']", 'unique': 'True', 'primary_key': 'True'})
        },
        u'cir.themeassignment': {
            'Meta': {'object_name': 'ThemeAssignment', '_ormbases': [u'cir.Event']},
            u'event_ptr': ('django.db.models.fields.related.OneToOneField', [], {'to': u"orm['cir.Event']", 'unique': 'True', 'primary_key': 'True'}),
            'theme': ('django.db.models.fields.related.ForeignKey', [], {'to': u"orm['cir.ClaimTheme']"})
        },
        u'cir.userinfo': {
            'Meta': {'object_name': 'UserInfo'},
            'description': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'last_visited_forum': ('django.db.models.fields.related.ForeignKey', [], {'to': u"orm['cir.Forum']", 'null': 'True', 'blank': 'True'}),
            'user': ('django.db.models.fields.related.OneToOneField', [], {'related_name': "'info'", 'unique': 'True', 'to': u"orm['auth.User']"})
        },
        u'cir.userlogin': {
            'Meta': {'object_name': 'UserLogin'},
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'timestamp': ('django.db.models.fields.DateTimeField', [], {}),
            'user': ('django.db.models.fields.related.ForeignKey', [], {'to': u"orm['auth.User']"})
        },
        u'cir.viewlog': {
            'Meta': {'object_name': 'ViewLog'},
            'author': ('django.db.models.fields.related.ForeignKey', [], {'related_name': "'viewlogs'", 'to': u"orm['auth.User']"}),
            'created_at': ('django.db.models.fields.DateTimeField', [], {'null': 'True', 'blank': 'True'}),
            'doc': ('django.db.models.fields.related.ForeignKey', [], {'related_name': "'viewlogs'", 'to': u"orm['cir.Doc']"}),
            'heatmap': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'})
        },
        u'cir.vote': {
            'Meta': {'object_name': 'Vote', '_ormbases': [u'cir.Event']},
            u'event_ptr': ('django.db.models.fields.related.OneToOneField', [], {'to': u"orm['cir.Event']", 'unique': 'True', 'primary_key': 'True'}),
            'reason': ('django.db.models.fields.CharField', [], {'max_length': '2010', 'null': 'True', 'blank': 'True'}),
            'vote_type': ('django.db.models.fields.CharField', [], {'max_length': '20'})
        },
        u'contenttypes.contenttype': {
            'Meta': {'ordering': "('name',)", 'unique_together': "(('app_label', 'model'),)", 'object_name': 'ContentType', 'db_table': "'django_content_type'"},
            'app_label': ('django.db.models.fields.CharField', [], {'max_length': '100'}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'model': ('django.db.models.fields.CharField', [], {'max_length': '100'}),
            'name': ('django.db.models.fields.CharField', [], {'max_length': '100'})
        }
    }

    complete_apps = ['cir']