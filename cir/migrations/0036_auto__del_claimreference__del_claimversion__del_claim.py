# -*- coding: utf-8 -*-
from south.utils import datetime_utils as datetime
from south.db import db
from south.v2 import SchemaMigration
from django.db import models


class Migration(SchemaMigration):

    def forwards(self, orm):
        # Deleting model 'ClaimReference'
        db.delete_table(u'cir_claimreference')

        # Deleting model 'ClaimVersion'
        db.delete_table(u'cir_claimversion')

        # Deleting model 'Claim'
        db.delete_table(u'cir_claim')


    def backwards(self, orm):
        # Adding model 'ClaimReference'
        db.create_table(u'cir_claimreference', (
            ('refer_type', self.gf('django.db.models.fields.CharField')(max_length=20)),
            ('to_claim', self.gf('django.db.models.fields.related.ForeignKey')(related_name='older_versions', to=orm['cir.Claim'])),
            (u'id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('from_claim', self.gf('django.db.models.fields.related.ForeignKey')(related_name='newer_versions', to=orm['cir.Claim'])),
        ))
        db.send_create_signal(u'cir', ['ClaimReference'])

        # Adding model 'ClaimVersion'
        db.create_table(u'cir_claimversion', (
            ('claim', self.gf('django.db.models.fields.related.ForeignKey')(related_name='versions', to=orm['cir.Claim'])),
            ('is_adopted', self.gf('django.db.models.fields.BooleanField')(default=True)),
            (u'entry_ptr', self.gf('django.db.models.fields.related.OneToOneField')(to=orm['cir.Entry'], unique=True, primary_key=True)),
        ))
        db.send_create_signal(u'cir', ['ClaimVersion'])

        # Adding model 'Claim'
        db.create_table(u'cir_claim', (
            ('theme', self.gf('django.db.models.fields.related.ForeignKey')(to=orm['cir.ClaimTheme'], null=True, blank=True)),
            ('is_deleted', self.gf('django.db.models.fields.BooleanField')(default=False)),
            ('source_highlight', self.gf('django.db.models.fields.related.ForeignKey')(related_name='claims_of_highlight', null=True, to=orm['cir.Highlight'], blank=True)),
            ('forum', self.gf('django.db.models.fields.related.ForeignKey')(to=orm['cir.Forum'])),
            ('published', self.gf('django.db.models.fields.BooleanField')(default=True)),
            ('claim_category', self.gf('django.db.models.fields.CharField')(max_length=20, null=True, blank=True)),
            (u'id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
        ))
        db.send_create_signal(u'cir', ['Claim'])


    models = {
        u'auth.group': {
            'Meta': {'object_name': 'Group'},
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'name': ('django.db.models.fields.CharField', [], {'unique': 'True', 'max_length': '80'}),
            'permissions': ('django.db.models.fields.related.ManyToManyField', [], {'to': u"orm['auth.Permission']", 'symmetrical': 'False', 'blank': 'True'})
        },
        u'auth.permission': {
            'Meta': {'ordering': "(u'codename',)", 'unique_together': "((u'content_type', u'codename'),)", 'object_name': 'Permission'},
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
        u'cir.claimtheme': {
            'Meta': {'object_name': 'ClaimTheme'},
            'created_at': ('django.db.models.fields.DateTimeField', [], {}),
            'forum': ('django.db.models.fields.related.ForeignKey', [], {'to': u"orm['cir.Forum']"}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'name': ('django.db.models.fields.CharField', [], {'max_length': '100'}),
            'proposer': ('django.db.models.fields.related.ForeignKey', [], {'to': u"orm['auth.User']"}),
            'published': ('django.db.models.fields.BooleanField', [], {'default': 'True'})
        },
        u'cir.doc': {
            'Meta': {'object_name': 'Doc'},
            'description': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            'folder': ('django.db.models.fields.related.ForeignKey', [], {'blank': 'True', 'related_name': "'doc_entries'", 'null': 'True', 'to': u"orm['cir.EntryCategory']"}),
            'forum': ('django.db.models.fields.related.ForeignKey', [], {'to': u"orm['cir.Forum']"}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
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
            'content': ('django.db.models.fields.TextField', [], {}),
            'created_at': ('django.db.models.fields.DateTimeField', [], {}),
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
            'created_at': ('django.db.models.fields.DateTimeField', [], {}),
            'entry': ('django.db.models.fields.related.ForeignKey', [], {'related_name': "'events'", 'to': u"orm['cir.Entry']"}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'user': ('django.db.models.fields.related.ForeignKey', [], {'to': u"orm['auth.User']"})
        },
        u'cir.forum': {
            'Meta': {'object_name': 'Forum'},
            'access_level': ('django.db.models.fields.CharField', [], {'default': "'open'", 'max_length': '100'}),
            'contextmap': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            'description': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            'forum_logo': ('django.db.models.fields.files.ImageField', [], {'default': "'forum_logos/default.jpg'", 'max_length': '100', 'null': 'True', 'blank': 'True'}),
            'full_name': ('django.db.models.fields.CharField', [], {'max_length': '500'}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'short_name': ('django.db.models.fields.CharField', [], {'max_length': '500'}),
            'url': ('django.db.models.fields.CharField', [], {'max_length': '100'})
        },
        u'cir.highlight': {
            'Meta': {'object_name': 'Highlight'},
            'context': ('django.db.models.fields.related.ForeignKey', [], {'related_name': "'highlights'", 'to': u"orm['cir.Entry']"}),
            'end_pos': ('django.db.models.fields.IntegerField', [], {}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'start_pos': ('django.db.models.fields.IntegerField', [], {})
        },
        u'cir.post': {
            'Meta': {'object_name': 'Post', '_ormbases': [u'cir.Entry']},
            'content_type': ('django.db.models.fields.CharField', [], {'max_length': '10'}),
            u'entry_ptr': ('django.db.models.fields.related.OneToOneField', [], {'to': u"orm['cir.Entry']", 'unique': 'True', 'primary_key': 'True'}),
            'highlight': ('django.db.models.fields.related.ForeignKey', [], {'related_name': "'posts_of_highlight'", 'to': u"orm['cir.Highlight']"}),
            'parent': ('django.db.models.fields.related.ForeignKey', [], {'blank': 'True', 'related_name': "'children'", 'null': 'True', 'to': u"orm['cir.Post']"}),
            'target': ('django.db.models.fields.related.ForeignKey', [], {'blank': 'True', 'related_name': "'get_comments'", 'null': 'True', 'to': u"orm['cir.Entry']"}),
            'title': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'})
        },
        u'cir.role': {
            'Meta': {'object_name': 'Role'},
            'forum': ('django.db.models.fields.related.ForeignKey', [], {'to': u"orm['cir.Forum']"}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'role': ('django.db.models.fields.CharField', [], {'max_length': '20'}),
            'user': ('django.db.models.fields.related.ForeignKey', [], {'related_name': "'role'", 'to': u"orm['auth.User']"})
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