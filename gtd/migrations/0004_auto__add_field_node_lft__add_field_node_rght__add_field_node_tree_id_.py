# -*- coding: utf-8 -*-
import datetime
from south.db import db
from south.v2 import SchemaMigration
from django.db import models


class Migration(SchemaMigration):

    def forwards(self, orm):
        # Adding field 'Node.lft'
        db.add_column(u'gtd_node', 'lft',
                      self.gf('django.db.models.fields.PositiveIntegerField')(default=0, db_index=True),
                      keep_default=False)

        # Adding field 'Node.rght'
        db.add_column(u'gtd_node', 'rght',
                      self.gf('django.db.models.fields.PositiveIntegerField')(default=0, db_index=True),
                      keep_default=False)

        # Adding field 'Node.tree_id'
        db.add_column(u'gtd_node', 'tree_id',
                      self.gf('django.db.models.fields.PositiveIntegerField')(default=0, db_index=True),
                      keep_default=False)

        # Adding field 'Node.level'
        db.add_column(u'gtd_node', 'level',
                      self.gf('django.db.models.fields.PositiveIntegerField')(default=0, db_index=True),
                      keep_default=False)


        # Changing field 'Node.parent'
        db.alter_column(u'gtd_node', 'parent_id', self.gf('mptt.fields.TreeForeignKey')(null=True, to=orm['gtd.Node']))

    def backwards(self, orm):
        # Deleting field 'Node.lft'
        db.delete_column(u'gtd_node', 'lft')

        # Deleting field 'Node.rght'
        db.delete_column(u'gtd_node', 'rght')

        # Deleting field 'Node.tree_id'
        db.delete_column(u'gtd_node', 'tree_id')

        # Deleting field 'Node.level'
        db.delete_column(u'gtd_node', 'level')


        # Changing field 'Node.parent'
        db.alter_column(u'gtd_node', 'parent_id', self.gf('django.db.models.fields.related.ForeignKey')(null=True, to=orm['gtd.Node']))

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
        u'contenttypes.contenttype': {
            'Meta': {'ordering': "('name',)", 'unique_together': "(('app_label', 'model'),)", 'object_name': 'ContentType', 'db_table': "'django_content_type'"},
            'app_label': ('django.db.models.fields.CharField', [], {'max_length': '100'}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'model': ('django.db.models.fields.CharField', [], {'max_length': '100'}),
            'name': ('django.db.models.fields.CharField', [], {'max_length': '100'})
        },
        u'gtd.contact': {
            'Meta': {'object_name': 'Contact', '_ormbases': [u'gtd.Tag']},
            'f_name': ('django.db.models.fields.CharField', [], {'max_length': '50'}),
            'l_name': ('django.db.models.fields.CharField', [], {'max_length': '50'}),
            u'tag_ptr': ('django.db.models.fields.related.OneToOneField', [], {'to': u"orm['gtd.Tag']", 'unique': 'True', 'primary_key': 'True'}),
            'user': ('django.db.models.fields.related.ForeignKey', [], {'to': u"orm['orgwolf.OrgWolfUser']", 'null': 'True', 'blank': 'True'})
        },
        u'gtd.context': {
            'Meta': {'object_name': 'Context'},
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'locations_available': ('django.db.models.fields.related.ManyToManyField', [], {'symmetrical': 'False', 'related_name': "u'including_contexts_set'", 'blank': 'True', 'to': u"orm['gtd.Location']"}),
            'name': ('django.db.models.fields.CharField', [], {'max_length': '100'}),
            'owner': ('django.db.models.fields.related.ForeignKey', [], {'to': u"orm['orgwolf.OrgWolfUser']", 'null': 'True', 'blank': 'True'}),
            'people_required': ('django.db.models.fields.related.ManyToManyField', [], {'symmetrical': 'False', 'related_name': "u'including_contexts_set'", 'blank': 'True', 'to': u"orm['gtd.Contact']"}),
            'tools_available': ('django.db.models.fields.related.ManyToManyField', [], {'symmetrical': 'False', 'related_name': "u'including_contexts_set'", 'blank': 'True', 'to': u"orm['gtd.Tool']"})
        },
        u'gtd.location': {
            'Meta': {'object_name': 'Location', '_ormbases': [u'gtd.Tag']},
            u'tag_ptr': ('django.db.models.fields.related.OneToOneField', [], {'to': u"orm['gtd.Tag']", 'unique': 'True', 'primary_key': 'True'}),
            'tools_available': ('django.db.models.fields.related.ManyToManyField', [], {'symmetrical': 'False', 'related_name': "u'including_locations_set'", 'blank': 'True', 'to': u"orm['gtd.Tool']"})
        },
        u'gtd.node': {
            'Meta': {'ordering': "[u'order']", 'unique_together': "((u'parent', u'order'),)", 'object_name': 'Node'},
            'archived': ('django.db.models.fields.BooleanField', [], {'default': 'False'}),
            'assigned': ('django.db.models.fields.related.ManyToManyField', [], {'symmetrical': 'False', 'related_name': "u'assigned_nodes'", 'blank': 'True', 'to': u"orm['gtd.Contact']"}),
            'closed': ('django.db.models.fields.DateTimeField', [], {'null': 'True', 'blank': 'True'}),
            'deadline': ('django.db.models.fields.DateTimeField', [], {'null': 'True', 'blank': 'True'}),
            'deadline_time_specific': ('django.db.models.fields.BooleanField', [], {'default': 'False'}),
            'energy': ('django.db.models.fields.CharField', [], {'max_length': '2', 'null': 'True', 'blank': 'True'}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'level': ('django.db.models.fields.PositiveIntegerField', [], {'db_index': 'True'}),
            'lft': ('django.db.models.fields.PositiveIntegerField', [], {'db_index': 'True'}),
            'opened': ('django.db.models.fields.DateTimeField', [], {'auto_now_add': 'True', 'null': 'True', 'blank': 'True'}),
            'order': ('django.db.models.fields.IntegerField', [], {}),
            'owner': ('django.db.models.fields.related.ForeignKey', [], {'related_name': "u'owned_node_set'", 'to': u"orm['orgwolf.OrgWolfUser']"}),
            'parent': ('mptt.fields.TreeForeignKey', [], {'blank': 'True', 'related_name': "u'children'", 'null': 'True', 'to': u"orm['gtd.Node']"}),
            'priority': ('django.db.models.fields.CharField', [], {'max_length': '1', 'blank': 'True'}),
            'related_projects': ('django.db.models.fields.related.ManyToManyField', [], {'symmetrical': 'False', 'related_name': "u'project_set'", 'blank': 'True', 'to': u"orm['gtd.Node']"}),
            'repeating_number': ('django.db.models.fields.IntegerField', [], {'null': 'True', 'blank': 'True'}),
            'repeating_unit': ('django.db.models.fields.CharField', [], {'max_length': '1', 'null': 'True', 'blank': 'True'}),
            'repeats': ('django.db.models.fields.BooleanField', [], {'default': 'False'}),
            'repeats_from_completion': ('django.db.models.fields.NullBooleanField', [], {'default': 'False', 'null': 'True', 'blank': 'True'}),
            'rght': ('django.db.models.fields.PositiveIntegerField', [], {'db_index': 'True'}),
            'scheduled': ('django.db.models.fields.DateTimeField', [], {'null': 'True', 'blank': 'True'}),
            'scheduled_time_specific': ('django.db.models.fields.BooleanField', [], {'default': 'False'}),
            'scope': ('django.db.models.fields.related.ManyToManyField', [], {'to': u"orm['gtd.Scope']", 'symmetrical': 'False', 'blank': 'True'}),
            'tag_string': ('django.db.models.fields.TextField', [], {'blank': 'True'}),
            'text': ('django.db.models.fields.TextField', [], {'blank': 'True'}),
            'time_needed': ('django.db.models.fields.CharField', [], {'max_length': '4', 'null': 'True', 'blank': 'True'}),
            'title': ('django.db.models.fields.TextField', [], {'blank': 'True'}),
            'todo_state': ('django.db.models.fields.related.ForeignKey', [], {'to': u"orm['gtd.TodoState']", 'null': 'True', 'blank': 'True'}),
            'tree_id': ('django.db.models.fields.PositiveIntegerField', [], {'db_index': 'True'}),
            'users': ('django.db.models.fields.related.ManyToManyField', [], {'to': u"orm['orgwolf.OrgWolfUser']", 'symmetrical': 'False', 'blank': 'True'})
        },
        u'gtd.noderepetition': {
            'Meta': {'object_name': 'NodeRepetition'},
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'new_todo_state': ('django.db.models.fields.related.ForeignKey', [], {'blank': 'True', 'related_name': "u'repetitions_new_set'", 'null': 'True', 'to': u"orm['gtd.TodoState']"}),
            'node': ('django.db.models.fields.related.ForeignKey', [], {'to': u"orm['gtd.Node']"}),
            'original_todo_state': ('django.db.models.fields.related.ForeignKey', [], {'blank': 'True', 'related_name': "u'repetitions_original_set'", 'null': 'True', 'to': u"orm['gtd.TodoState']"}),
            'timestamp': ('django.db.models.fields.DateTimeField', [], {})
        },
        u'gtd.priority': {
            'Meta': {'object_name': 'Priority'},
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'owner': ('django.db.models.fields.related.ForeignKey', [], {'to': u"orm['orgwolf.OrgWolfUser']"}),
            'priority_value': ('django.db.models.fields.IntegerField', [], {'default': '50'})
        },
        u'gtd.scope': {
            'Meta': {'object_name': 'Scope'},
            'display': ('django.db.models.fields.CharField', [], {'max_length': '50'}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'name': ('django.db.models.fields.CharField', [], {'max_length': '50'}),
            'owner': ('django.db.models.fields.related.ForeignKey', [], {'to': u"orm['orgwolf.OrgWolfUser']", 'null': 'True', 'blank': 'True'}),
            'public': ('django.db.models.fields.BooleanField', [], {'default': 'False'})
        },
        u'gtd.tag': {
            'Meta': {'object_name': 'Tag'},
            'display': ('django.db.models.fields.CharField', [], {'max_length': '100'}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'owner': ('django.db.models.fields.related.ForeignKey', [], {'to': u"orm['orgwolf.OrgWolfUser']", 'null': 'True', 'blank': 'True'}),
            'public': ('django.db.models.fields.BooleanField', [], {'default': 'True'}),
            'tag_string': ('django.db.models.fields.CharField', [], {'max_length': '10'})
        },
        u'gtd.todostate': {
            'Meta': {'ordering': "[u'order']", 'object_name': 'TodoState'},
            '_color_alpha': ('django.db.models.fields.FloatField', [], {'default': '0'}),
            '_color_rgb': ('django.db.models.fields.IntegerField', [], {'default': '0'}),
            'abbreviation': ('django.db.models.fields.CharField', [], {'unique': 'True', 'max_length': '10'}),
            'actionable': ('django.db.models.fields.BooleanField', [], {'default': 'True'}),
            'class_size': ('django.db.models.fields.IntegerField', [], {'default': '0'}),
            'closed': ('django.db.models.fields.BooleanField', [], {'default': 'False'}),
            'display_text': ('django.db.models.fields.CharField', [], {'max_length': '30'}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'order': ('django.db.models.fields.IntegerField', [], {'default': '50'}),
            'owner': ('django.db.models.fields.related.ForeignKey', [], {'to': u"orm['orgwolf.OrgWolfUser']", 'null': 'True', 'blank': 'True'})
        },
        u'gtd.tool': {
            'Meta': {'object_name': 'Tool', '_ormbases': [u'gtd.Tag']},
            u'tag_ptr': ('django.db.models.fields.related.OneToOneField', [], {'to': u"orm['gtd.Tag']", 'unique': 'True', 'primary_key': 'True'})
        },
        u'orgwolf.orgwolfuser': {
            'Meta': {'object_name': 'OrgWolfUser'},
            'date_joined': ('django.db.models.fields.DateTimeField', [], {'default': 'datetime.datetime.now'}),
            'email': ('django.db.models.fields.EmailField', [], {'max_length': '75', 'blank': 'True'}),
            'first_name': ('django.db.models.fields.CharField', [], {'max_length': '30', 'blank': 'True'}),
            'groups': ('django.db.models.fields.related.ManyToManyField', [], {'to': u"orm['auth.Group']", 'symmetrical': 'False', 'blank': 'True'}),
            'home': ('django.db.models.fields.CharField', [], {'max_length': '100'}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'is_active': ('django.db.models.fields.BooleanField', [], {'default': 'True'}),
            'is_staff': ('django.db.models.fields.BooleanField', [], {'default': 'False'}),
            'is_superuser': ('django.db.models.fields.BooleanField', [], {'default': 'False'}),
            'last_login': ('django.db.models.fields.DateTimeField', [], {'default': 'datetime.datetime.now'}),
            'last_name': ('django.db.models.fields.CharField', [], {'max_length': '30', 'blank': 'True'}),
            'password': ('django.db.models.fields.CharField', [], {'max_length': '128'}),
            'preferred_timezone': ('django.db.models.fields.CharField', [], {'max_length': '25', 'blank': 'True'}),
            'user_permissions': ('django.db.models.fields.related.ManyToManyField', [], {'to': u"orm['auth.Permission']", 'symmetrical': 'False', 'blank': 'True'}),
            'username': ('django.db.models.fields.CharField', [], {'unique': 'True', 'max_length': '30'})
        }
    }

    complete_apps = ['gtd']