# -*- coding: utf-8 -*-
from south.utils import datetime_utils as datetime
from south.db import db
from south.v2 import DataMigration
from django.db import models

class Migration(DataMigration):

    def forwards(self, orm):
        """Move existing Scope instances into new FocusArea instances."""
        # Note: Don't use "from appname.models import ModelName".
        # Use orm.ModelName to refer to models in this application,
        # and orm['appname.ModelName'] for models in other applications.
        for scope in orm.Scope.objects.all():
            # Create a new FocusArea from Scope details
            fa = orm.FocusArea(
                owner=scope.owner,
                public=scope.public,
                display=scope.display,
                name=scope.name
            )
            fa.save()
            # Add this FocusArea to the relevant Nodes
            for node in scope.node_set.all():
                node.focus_areas.add(fa)

    def backwards(self, orm):
        """Move existing FocusArea instances into new Scope instances."""
        for fa in orm.FocusArea.objects.all():
            # Create a new Scope from FocusArea details
            scope = orm.Scope(
                owner=fa.owner,
                public=fa.public,
                display=fa.display,
                name=fa.name
            )
            scope.save()
            # Add the new Scope to the relevant Nodes
            for node in fa.node_set.all():
                node.scope.add(scope)

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
        u'gtd.focusarea': {
            'Meta': {'object_name': 'FocusArea'},
            'display': ('django.db.models.fields.CharField', [], {'max_length': '50'}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'name': ('django.db.models.fields.CharField', [], {'max_length': '50'}),
            'owner': ('django.db.models.fields.related.ForeignKey', [], {'to': u"orm['orgwolf.OrgWolfUser']", 'null': 'True', 'blank': 'True'}),
            'public': ('django.db.models.fields.BooleanField', [], {'default': 'False'})
        },
        u'gtd.location': {
            'Meta': {'object_name': 'Location', '_ormbases': [u'gtd.Tag']},
            u'tag_ptr': ('django.db.models.fields.related.OneToOneField', [], {'to': u"orm['gtd.Tag']", 'unique': 'True', 'primary_key': 'True'}),
            'tools_available': ('django.db.models.fields.related.ManyToManyField', [], {'symmetrical': 'False', 'related_name': "u'including_locations_set'", 'blank': 'True', 'to': u"orm['gtd.Tool']"})
        },
        u'gtd.node': {
            'Meta': {'object_name': 'Node'},
            'archived': ('django.db.models.fields.BooleanField', [], {'default': 'False'}),
            'assigned': ('django.db.models.fields.related.ForeignKey', [], {'blank': 'True', 'related_name': "u'assigned_node_set'", 'null': 'True', 'to': u"orm['gtd.Contact']"}),
            'closed': ('django.db.models.fields.DateTimeField', [], {'null': 'True', 'blank': 'True'}),
            'deadline_date': ('django.db.models.fields.DateField', [], {'null': 'True', 'blank': 'True'}),
            'deadline_time': ('django.db.models.fields.TimeField', [], {'null': 'True', 'blank': 'True'}),
            'end_date': ('django.db.models.fields.DateField', [], {'null': 'True', 'blank': 'True'}),
            'end_time': ('django.db.models.fields.TimeField', [], {'null': 'True', 'blank': 'True'}),
            'energy': ('django.db.models.fields.CharField', [], {'max_length': '2', 'null': 'True', 'blank': 'True'}),
            'focus_areas': ('django.db.models.fields.related.ManyToManyField', [], {'to': u"orm['gtd.FocusArea']", 'symmetrical': 'False', 'blank': 'True'}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            u'level': ('django.db.models.fields.PositiveIntegerField', [], {'db_index': 'True'}),
            u'lft': ('django.db.models.fields.PositiveIntegerField', [], {'db_index': 'True'}),
            'opened': ('django.db.models.fields.DateTimeField', [], {'auto_now_add': 'True', 'null': 'True', 'blank': 'True'}),
            'owner': ('django.db.models.fields.related.ForeignKey', [], {'blank': 'True', 'related_name': "u'owned_node_set'", 'null': 'True', 'to': u"orm['orgwolf.OrgWolfUser']"}),
            'parent': ('mptt.fields.TreeForeignKey', [], {'blank': 'True', 'related_name': "u'children'", 'null': 'True', 'to': u"orm['gtd.Node']"}),
            'priority': ('django.db.models.fields.CharField', [], {'default': "u'B'", 'max_length': '1'}),
            'repeating_number': ('django.db.models.fields.IntegerField', [], {'null': 'True', 'blank': 'True'}),
            'repeating_unit': ('django.db.models.fields.CharField', [], {'max_length': '1', 'null': 'True', 'blank': 'True'}),
            'repeats': ('django.db.models.fields.BooleanField', [], {'default': 'False'}),
            'repeats_from_completion': ('django.db.models.fields.BooleanField', [], {'default': 'False'}),
            u'rght': ('django.db.models.fields.PositiveIntegerField', [], {'db_index': 'True'}),
            'scheduled_date': ('django.db.models.fields.DateField', [], {'null': 'True', 'blank': 'True'}),
            'scheduled_time': ('django.db.models.fields.TimeField', [], {'null': 'True', 'blank': 'True'}),
            'scope': ('django.db.models.fields.related.ManyToManyField', [], {'to': u"orm['gtd.Scope']", 'symmetrical': 'False', 'blank': 'True'}),
            'slug': ('django.db.models.fields.SlugField', [], {'max_length': '50'}),
            'tag_string': ('django.db.models.fields.TextField', [], {'blank': 'True'}),
            'text': ('django.db.models.fields.TextField', [], {'blank': 'True'}),
            'time_needed': ('django.db.models.fields.CharField', [], {'max_length': '4', 'null': 'True', 'blank': 'True'}),
            'title': ('django.db.models.fields.TextField', [], {'blank': 'True'}),
            'todo_state': ('django.db.models.fields.related.ForeignKey', [], {'to': u"orm['gtd.TodoState']", 'null': 'True', 'blank': 'True'}),
            u'tree_id': ('django.db.models.fields.PositiveIntegerField', [], {'db_index': 'True'}),
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
            'tag_string': ('django.db.models.fields.CharField', [], {'unique': 'True', 'max_length': '10'})
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
            'groups': ('django.db.models.fields.related.ManyToManyField', [], {'symmetrical': 'False', 'related_name': "u'user_set'", 'blank': 'True', 'to': u"orm['auth.Group']"}),
            'home': ('django.db.models.fields.CharField', [], {'default': "'list_display'", 'max_length': '100'}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'is_active': ('django.db.models.fields.BooleanField', [], {'default': 'True'}),
            'is_staff': ('django.db.models.fields.BooleanField', [], {'default': 'False'}),
            'is_superuser': ('django.db.models.fields.BooleanField', [], {'default': 'False'}),
            'last_login': ('django.db.models.fields.DateTimeField', [], {'default': 'datetime.datetime.now'}),
            'last_name': ('django.db.models.fields.CharField', [], {'max_length': '30', 'blank': 'True'}),
            'password': ('django.db.models.fields.CharField', [], {'max_length': '128'}),
            'preferred_timezone': ('django.db.models.fields.CharField', [], {'max_length': '25', 'blank': 'True'}),
            'user_permissions': ('django.db.models.fields.related.ManyToManyField', [], {'symmetrical': 'False', 'related_name': "u'user_set'", 'blank': 'True', 'to': u"orm['auth.Permission']"}),
            'username': ('django.db.models.fields.CharField', [], {'unique': 'True', 'max_length': '30'})
        }
    }

    complete_apps = ['gtd']
    symmetrical = True
