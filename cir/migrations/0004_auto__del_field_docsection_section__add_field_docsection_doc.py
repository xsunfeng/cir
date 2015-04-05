# -*- coding: utf-8 -*-
from south.utils import datetime_utils as datetime
from south.db import db
from south.v2 import SchemaMigration
from django.db import models


class Migration(SchemaMigration):

    def forwards(self, orm):
        # Deleting field 'DocSection.section'
        db.delete_column(u'cir_docsection', 'section_id')

        # Adding field 'DocSection.doc'
        db.add_column(u'cir_docsection', 'doc',
                      self.gf('django.db.models.fields.related.ForeignKey')(default=1, to=orm['cir.Doc']),
                      keep_default=False)


    def backwards(self, orm):
        # Adding field 'DocSection.section'
        db.add_column(u'cir_docsection', 'section',
                      self.gf('django.db.models.fields.related.ForeignKey')(default=1, to=orm['cir.Doc']),
                      keep_default=False)

        # Deleting field 'DocSection.doc'
        db.delete_column(u'cir_docsection', 'doc_id')


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
        u'cir.doc': {
            'Meta': {'object_name': 'Doc'},
            'folder': ('django.db.models.fields.related.ForeignKey', [], {'related_name': "'doc_entries'", 'null': 'True', 'to': u"orm['cir.EntryCategory']"}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'title': ('django.db.models.fields.TextField', [], {})
        },
        u'cir.docsection': {
            'Meta': {'object_name': 'DocSection', '_ormbases': [u'cir.Entry']},
            'doc': ('django.db.models.fields.related.ForeignKey', [], {'to': u"orm['cir.Doc']"}),
            u'entry_ptr': ('django.db.models.fields.related.OneToOneField', [], {'to': u"orm['cir.Entry']", 'unique': 'True', 'primary_key': 'True'}),
            'order': ('django.db.models.fields.IntegerField', [], {'null': 'True'}),
            'title': ('django.db.models.fields.TextField', [], {'null': 'True'})
        },
        u'cir.entry': {
            'Meta': {'object_name': 'Entry'},
            'category': ('django.db.models.fields.related.ForeignKey', [], {'related_name': "'entries'", 'null': 'True', 'to': u"orm['cir.EntryCategory']"}),
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
            'category_type': ('django.db.models.fields.TextField', [], {'max_length': '100'}),
            'forum': ('django.db.models.fields.related.ForeignKey', [], {'to': u"orm['cir.Forum']"}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'instructions': ('django.db.models.fields.TextField', [], {'null': 'True'}),
            'name': ('django.db.models.fields.CharField', [], {'max_length': '100', 'null': 'True'}),
            'visible': ('django.db.models.fields.BooleanField', [], {'default': 'False'})
        },
        u'cir.forum': {
            'Meta': {'object_name': 'Forum'},
            'access_level': ('django.db.models.fields.CharField', [], {'default': "'open'", 'max_length': '100'}),
            'contextmap': ('django.db.models.fields.TextField', [], {'null': 'True'}),
            'description': ('django.db.models.fields.TextField', [], {'null': 'True'}),
            'forum_logo': ('django.db.models.fields.files.ImageField', [], {'default': "'forum_logos/default.jpg'", 'max_length': '100', 'null': 'True'}),
            'full_name': ('django.db.models.fields.CharField', [], {'max_length': '500'}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'short_name': ('django.db.models.fields.CharField', [], {'max_length': '500'}),
            'url': ('django.db.models.fields.CharField', [], {'max_length': '100'})
        },
        u'cir.post': {
            'Meta': {'object_name': 'Post', '_ormbases': [u'cir.Entry']},
            u'entry_ptr': ('django.db.models.fields.related.OneToOneField', [], {'to': u"orm['cir.Entry']", 'unique': 'True', 'primary_key': 'True'}),
            'title': ('django.db.models.fields.TextField', [], {'null': 'True'})
        },
        u'cir.role': {
            'Meta': {'object_name': 'Role'},
            'forum': ('django.db.models.fields.related.ForeignKey', [], {'to': u"orm['cir.Forum']"}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'role': ('django.db.models.fields.CharField', [], {'max_length': '20'}),
            'user': ('django.db.models.fields.related.ForeignKey', [], {'related_name': "'role'", 'to': u"orm['auth.User']"})
        },
        u'cir.userinfo': {
            'Meta': {'object_name': 'UserInfo'},
            'description': ('django.db.models.fields.TextField', [], {'null': 'True'}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'last_visited_forum': ('django.db.models.fields.related.ForeignKey', [], {'to': u"orm['cir.Forum']", 'null': 'True'}),
            'user': ('django.db.models.fields.related.OneToOneField', [], {'related_name': "'info'", 'unique': 'True', 'to': u"orm['auth.User']"})
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