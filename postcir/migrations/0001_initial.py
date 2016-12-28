# -*- coding: utf-8 -*-
from south.utils import datetime_utils as datetime
from south.db import db
from south.v2 import SchemaMigration
from django.db import models


class Migration(SchemaMigration):

    def forwards(self, orm):
        # Adding model 'StatementCategory'
        db.create_table(u'postcir_statementcategory', (
            (u'id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('name', self.gf('django.db.models.fields.CharField')(max_length=10)),
            ('description', self.gf('django.db.models.fields.TextField')()),
            ('created_at', self.gf('django.db.models.fields.DateTimeField')(auto_now=True, blank=True)),
            ('forum', self.gf('django.db.models.fields.related.ForeignKey')(to=orm['cir.Forum'])),
        ))
        db.send_create_signal(u'postcir', ['StatementCategory'])

        # Adding model 'StatementGroup'
        db.create_table(u'postcir_statementgroup', (
            (u'id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('description', self.gf('django.db.models.fields.TextField')(null=True, blank=True)),
            ('created_at', self.gf('django.db.models.fields.DateTimeField')(auto_now=True, blank=True)),
            ('forum', self.gf('django.db.models.fields.related.ForeignKey')(to=orm['cir.Forum'])),
        ))
        db.send_create_signal(u'postcir', ['StatementGroup'])

        # Adding model 'StatementItem'
        db.create_table(u'postcir_statementitem', (
            (u'id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('content', self.gf('django.db.models.fields.TextField')()),
            ('created_at', self.gf('django.db.models.fields.DateTimeField')(auto_now=True, blank=True)),
            ('updated_at', self.gf('django.db.models.fields.DateTimeField')(auto_now_add=True, blank=True)),
            ('group', self.gf('django.db.models.fields.related.ForeignKey')(related_name='items', to=orm['postcir.StatementGroup'])),
        ))
        db.send_create_signal(u'postcir', ['StatementItem'])


    def backwards(self, orm):
        # Deleting model 'StatementCategory'
        db.delete_table(u'postcir_statementcategory')

        # Deleting model 'StatementGroup'
        db.delete_table(u'postcir_statementgroup')

        # Deleting model 'StatementItem'
        db.delete_table(u'postcir_statementitem')


    models = {
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
        u'postcir.statementcategory': {
            'Meta': {'object_name': 'StatementCategory'},
            'created_at': ('django.db.models.fields.DateTimeField', [], {'auto_now': 'True', 'blank': 'True'}),
            'description': ('django.db.models.fields.TextField', [], {}),
            'forum': ('django.db.models.fields.related.ForeignKey', [], {'to': u"orm['cir.Forum']"}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'name': ('django.db.models.fields.CharField', [], {'max_length': '10'})
        },
        u'postcir.statementgroup': {
            'Meta': {'object_name': 'StatementGroup'},
            'created_at': ('django.db.models.fields.DateTimeField', [], {'auto_now': 'True', 'blank': 'True'}),
            'description': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            'forum': ('django.db.models.fields.related.ForeignKey', [], {'to': u"orm['cir.Forum']"}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'})
        },
        u'postcir.statementitem': {
            'Meta': {'object_name': 'StatementItem'},
            'content': ('django.db.models.fields.TextField', [], {}),
            'created_at': ('django.db.models.fields.DateTimeField', [], {'auto_now': 'True', 'blank': 'True'}),
            'group': ('django.db.models.fields.related.ForeignKey', [], {'related_name': "'items'", 'to': u"orm['postcir.StatementGroup']"}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'updated_at': ('django.db.models.fields.DateTimeField', [], {'auto_now_add': 'True', 'blank': 'True'})
        }
    }

    complete_apps = ['postcir']