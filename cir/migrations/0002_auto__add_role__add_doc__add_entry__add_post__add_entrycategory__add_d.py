# -*- coding: utf-8 -*-
from south.utils import datetime_utils as datetime
from south.db import db
from south.v2 import SchemaMigration
from django.db import models


class Migration(SchemaMigration):

    def forwards(self, orm):
        # Adding model 'Role'
        db.create_table(u'cir_role', (
            (u'id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('user', self.gf('django.db.models.fields.related.ForeignKey')(related_name='role', to=orm['auth.User'])),
            ('forum', self.gf('django.db.models.fields.related.ForeignKey')(to=orm['cir.Forum'])),
            ('role', self.gf('django.db.models.fields.CharField')(max_length=20)),
        ))
        db.send_create_signal(u'cir', ['Role'])

        # Adding model 'Doc'
        db.create_table(u'cir_doc', (
            (u'id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('title', self.gf('django.db.models.fields.TextField')()),
            ('folder', self.gf('django.db.models.fields.related.ForeignKey')(related_name='entries', null=True, to=orm['cir.EntryCategory'])),
        ))
        db.send_create_signal(u'cir', ['Doc'])

        # Adding model 'Entry'
        db.create_table(u'cir_entry', (
            (u'id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('content', self.gf('django.db.models.fields.TextField')()),
            ('created_at', self.gf('django.db.models.fields.DateTimeField')()),
            ('updated_at', self.gf('django.db.models.fields.DateTimeField')()),
            ('category', self.gf('django.db.models.fields.related.ForeignKey')(related_name='doc_entries', null=True, to=orm['cir.EntryCategory'])),
        ))
        db.send_create_signal(u'cir', ['Entry'])

        # Adding model 'Post'
        db.create_table(u'cir_post', (
            (u'entry_ptr', self.gf('django.db.models.fields.related.OneToOneField')(to=orm['cir.Entry'], unique=True, primary_key=True)),
            ('title', self.gf('django.db.models.fields.TextField')(null=True)),
        ))
        db.send_create_signal(u'cir', ['Post'])

        # Adding model 'EntryCategory'
        db.create_table(u'cir_entrycategory', (
            (u'id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('name', self.gf('django.db.models.fields.CharField')(max_length=100, null=True)),
            ('category_type', self.gf('django.db.models.fields.TextField')(max_length=100)),
            ('forum', self.gf('django.db.models.fields.related.ForeignKey')(to=orm['cir.Forum'])),
            ('visible', self.gf('django.db.models.fields.BooleanField')(default=False)),
            ('can_create', self.gf('django.db.models.fields.BooleanField')(default=False)),
            ('can_edit', self.gf('django.db.models.fields.BooleanField')(default=False)),
            ('can_delete', self.gf('django.db.models.fields.BooleanField')(default=False)),
            ('can_extract', self.gf('django.db.models.fields.BooleanField')(default=False)),
            ('can_prioritize', self.gf('django.db.models.fields.BooleanField')(default=False)),
            ('instructions', self.gf('django.db.models.fields.TextField')(null=True)),
        ))
        db.send_create_signal(u'cir', ['EntryCategory'])

        # Adding model 'DocSection'
        db.create_table(u'cir_docsection', (
            (u'entry_ptr', self.gf('django.db.models.fields.related.OneToOneField')(to=orm['cir.Entry'], unique=True, primary_key=True)),
            ('title', self.gf('django.db.models.fields.TextField')(null=True)),
            ('order', self.gf('django.db.models.fields.IntegerField')(null=True)),
            ('section', self.gf('django.db.models.fields.related.ForeignKey')(to=orm['cir.Doc'])),
        ))
        db.send_create_signal(u'cir', ['DocSection'])


    def backwards(self, orm):
        # Deleting model 'Role'
        db.delete_table(u'cir_role')

        # Deleting model 'Doc'
        db.delete_table(u'cir_doc')

        # Deleting model 'Entry'
        db.delete_table(u'cir_entry')

        # Deleting model 'Post'
        db.delete_table(u'cir_post')

        # Deleting model 'EntryCategory'
        db.delete_table(u'cir_entrycategory')

        # Deleting model 'DocSection'
        db.delete_table(u'cir_docsection')


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
            'folder': ('django.db.models.fields.related.ForeignKey', [], {'related_name': "'entries'", 'null': 'True', 'to': u"orm['cir.EntryCategory']"}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'title': ('django.db.models.fields.TextField', [], {})
        },
        u'cir.docsection': {
            'Meta': {'object_name': 'DocSection', '_ormbases': [u'cir.Entry']},
            u'entry_ptr': ('django.db.models.fields.related.OneToOneField', [], {'to': u"orm['cir.Entry']", 'unique': 'True', 'primary_key': 'True'}),
            'order': ('django.db.models.fields.IntegerField', [], {'null': 'True'}),
            'section': ('django.db.models.fields.related.ForeignKey', [], {'to': u"orm['cir.Doc']"}),
            'title': ('django.db.models.fields.TextField', [], {'null': 'True'})
        },
        u'cir.entry': {
            'Meta': {'object_name': 'Entry'},
            'category': ('django.db.models.fields.related.ForeignKey', [], {'related_name': "'doc_entries'", 'null': 'True', 'to': u"orm['cir.EntryCategory']"}),
            'content': ('django.db.models.fields.TextField', [], {}),
            'created_at': ('django.db.models.fields.DateTimeField', [], {}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
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