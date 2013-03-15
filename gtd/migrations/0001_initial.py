# -*- coding: utf-8 -*-
import datetime
from south.db import db
from south.v2 import SchemaMigration
from django.db import models


class Migration(SchemaMigration):

    def forwards(self, orm):
        # Adding model 'TodoState'
        db.create_table(u'gtd_todostate', (
            (u'id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('abbreviation', self.gf('django.db.models.fields.CharField')(unique=True, max_length=10)),
            ('display_text', self.gf('django.db.models.fields.CharField')(max_length=30)),
            ('actionable', self.gf('django.db.models.fields.BooleanField')(default=True)),
            ('closed', self.gf('django.db.models.fields.BooleanField')(default=False)),
            ('owner', self.gf('django.db.models.fields.related.ForeignKey')(to=orm['orgwolf.OrgWolfUser'], null=True, blank=True)),
            ('order', self.gf('django.db.models.fields.IntegerField')(default=50)),
            ('_color_rgb', self.gf('django.db.models.fields.IntegerField')(default=0)),
            ('_color_alpha', self.gf('django.db.models.fields.FloatField')(default=0)),
        ))
        db.send_create_signal(u'gtd', ['TodoState'])

        # Adding model 'Tag'
        db.create_table(u'gtd_tag', (
            (u'id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('display', self.gf('django.db.models.fields.CharField')(max_length=100)),
            ('tag_string', self.gf('django.db.models.fields.CharField')(max_length=10)),
            ('owner', self.gf('django.db.models.fields.related.ForeignKey')(to=orm['orgwolf.OrgWolfUser'], null=True, blank=True)),
            ('public', self.gf('django.db.models.fields.BooleanField')(default=True)),
        ))
        db.send_create_signal(u'gtd', ['Tag'])

        # Adding model 'Tool'
        db.create_table(u'gtd_tool', (
            (u'tag_ptr', self.gf('django.db.models.fields.related.OneToOneField')(to=orm['gtd.Tag'], unique=True, primary_key=True)),
        ))
        db.send_create_signal(u'gtd', ['Tool'])

        # Adding model 'Location'
        db.create_table(u'gtd_location', (
            (u'tag_ptr', self.gf('django.db.models.fields.related.OneToOneField')(to=orm['gtd.Tag'], unique=True, primary_key=True)),
        ))
        db.send_create_signal(u'gtd', ['Location'])

        # Adding M2M table for field tools_available on 'Location'
        db.create_table(u'gtd_location_tools_available', (
            ('id', models.AutoField(verbose_name='ID', primary_key=True, auto_created=True)),
            ('location', models.ForeignKey(orm[u'gtd.location'], null=False)),
            ('tool', models.ForeignKey(orm[u'gtd.tool'], null=False))
        ))
        db.create_unique(u'gtd_location_tools_available', ['location_id', 'tool_id'])

        # Adding model 'Contact'
        db.create_table(u'gtd_contact', (
            (u'tag_ptr', self.gf('django.db.models.fields.related.OneToOneField')(to=orm['gtd.Tag'], unique=True, primary_key=True)),
            ('f_name', self.gf('django.db.models.fields.CharField')(max_length=50)),
            ('l_name', self.gf('django.db.models.fields.CharField')(max_length=50)),
            ('user', self.gf('django.db.models.fields.related.ForeignKey')(to=orm['orgwolf.OrgWolfUser'], null=True, blank=True)),
        ))
        db.send_create_signal(u'gtd', ['Contact'])

        # Adding model 'Context'
        db.create_table(u'gtd_context', (
            (u'id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('name', self.gf('django.db.models.fields.CharField')(max_length=100)),
        ))
        db.send_create_signal(u'gtd', ['Context'])

        # Adding M2M table for field tools_available on 'Context'
        db.create_table(u'gtd_context_tools_available', (
            ('id', models.AutoField(verbose_name='ID', primary_key=True, auto_created=True)),
            ('context', models.ForeignKey(orm[u'gtd.context'], null=False)),
            ('tool', models.ForeignKey(orm[u'gtd.tool'], null=False))
        ))
        db.create_unique(u'gtd_context_tools_available', ['context_id', 'tool_id'])

        # Adding M2M table for field locations_available on 'Context'
        db.create_table(u'gtd_context_locations_available', (
            ('id', models.AutoField(verbose_name='ID', primary_key=True, auto_created=True)),
            ('context', models.ForeignKey(orm[u'gtd.context'], null=False)),
            ('location', models.ForeignKey(orm[u'gtd.location'], null=False))
        ))
        db.create_unique(u'gtd_context_locations_available', ['context_id', 'location_id'])

        # Adding M2M table for field people_required on 'Context'
        db.create_table(u'gtd_context_people_required', (
            ('id', models.AutoField(verbose_name='ID', primary_key=True, auto_created=True)),
            ('context', models.ForeignKey(orm[u'gtd.context'], null=False)),
            ('contact', models.ForeignKey(orm[u'gtd.contact'], null=False))
        ))
        db.create_unique(u'gtd_context_people_required', ['context_id', 'contact_id'])

        # Adding model 'Priority'
        db.create_table(u'gtd_priority', (
            (u'id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('priority_value', self.gf('django.db.models.fields.IntegerField')(default=50)),
            ('owner', self.gf('django.db.models.fields.related.ForeignKey')(to=orm['orgwolf.OrgWolfUser'])),
        ))
        db.send_create_signal(u'gtd', ['Priority'])

        # Adding model 'Scope'
        db.create_table(u'gtd_scope', (
            (u'id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('owner', self.gf('django.db.models.fields.related.ForeignKey')(to=orm['orgwolf.OrgWolfUser'], null=True, blank=True)),
            ('public', self.gf('django.db.models.fields.BooleanField')(default=False)),
            ('display', self.gf('django.db.models.fields.CharField')(max_length=50)),
            ('name', self.gf('django.db.models.fields.CharField')(max_length=50)),
        ))
        db.send_create_signal(u'gtd', ['Scope'])

        # Adding model 'Node'
        db.create_table(u'gtd_node', (
            (u'id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('owner', self.gf('django.db.models.fields.related.ForeignKey')(related_name=u'owned_node_set', to=orm['orgwolf.OrgWolfUser'])),
            ('order', self.gf('django.db.models.fields.IntegerField')()),
            ('title', self.gf('django.db.models.fields.TextField')(blank=True)),
            ('todo_state', self.gf('django.db.models.fields.related.ForeignKey')(to=orm['gtd.TodoState'], null=True, blank=True)),
            ('archived', self.gf('django.db.models.fields.BooleanField')(default=False)),
            ('text', self.gf('django.db.models.fields.TextField')(blank=True)),
            ('parent', self.gf('django.db.models.fields.related.ForeignKey')(blank=True, related_name=u'child_heading_set', null=True, to=orm['gtd.Node'])),
            ('scheduled', self.gf('django.db.models.fields.DateTimeField')(null=True, blank=True)),
            ('scheduled_time_specific', self.gf('django.db.models.fields.BooleanField')(default=False)),
            ('deadline', self.gf('django.db.models.fields.DateTimeField')(null=True, blank=True)),
            ('deadline_time_specific', self.gf('django.db.models.fields.BooleanField')(default=False)),
            ('opened', self.gf('django.db.models.fields.DateTimeField')(auto_now_add=True, null=True, blank=True)),
            ('closed', self.gf('django.db.models.fields.DateTimeField')(null=True, blank=True)),
            ('repeats', self.gf('django.db.models.fields.BooleanField')(default=False)),
            ('repeating_number', self.gf('django.db.models.fields.IntegerField')(null=True, blank=True)),
            ('repeating_unit', self.gf('django.db.models.fields.CharField')(max_length=1, null=True, blank=True)),
            ('repeats_from_completion', self.gf('django.db.models.fields.NullBooleanField')(default=False, null=True, blank=True)),
            ('priority', self.gf('django.db.models.fields.CharField')(max_length=1, blank=True)),
            ('tag_string', self.gf('django.db.models.fields.TextField')(blank=True)),
            ('energy', self.gf('django.db.models.fields.CharField')(max_length=2, null=True, blank=True)),
            ('time_needed', self.gf('django.db.models.fields.CharField')(max_length=4, null=True, blank=True)),
        ))
        db.send_create_signal(u'gtd', ['Node'])

        # Adding unique constraint on 'Node', fields ['parent', 'order']
        db.create_unique(u'gtd_node', ['parent_id', 'order'])

        # Adding M2M table for field users on 'Node'
        db.create_table(u'gtd_node_users', (
            ('id', models.AutoField(verbose_name='ID', primary_key=True, auto_created=True)),
            ('node', models.ForeignKey(orm[u'gtd.node'], null=False)),
            ('orgwolfuser', models.ForeignKey(orm[u'orgwolf.orgwolfuser'], null=False))
        ))
        db.create_unique(u'gtd_node_users', ['node_id', 'orgwolfuser_id'])

        # Adding M2M table for field related_projects on 'Node'
        db.create_table(u'gtd_node_related_projects', (
            ('id', models.AutoField(verbose_name='ID', primary_key=True, auto_created=True)),
            ('from_node', models.ForeignKey(orm[u'gtd.node'], null=False)),
            ('to_node', models.ForeignKey(orm[u'gtd.node'], null=False))
        ))
        db.create_unique(u'gtd_node_related_projects', ['from_node_id', 'to_node_id'])

        # Adding M2M table for field assigned on 'Node'
        db.create_table(u'gtd_node_assigned', (
            ('id', models.AutoField(verbose_name='ID', primary_key=True, auto_created=True)),
            ('node', models.ForeignKey(orm[u'gtd.node'], null=False)),
            ('contact', models.ForeignKey(orm[u'gtd.contact'], null=False))
        ))
        db.create_unique(u'gtd_node_assigned', ['node_id', 'contact_id'])

        # Adding M2M table for field scope on 'Node'
        db.create_table(u'gtd_node_scope', (
            ('id', models.AutoField(verbose_name='ID', primary_key=True, auto_created=True)),
            ('node', models.ForeignKey(orm[u'gtd.node'], null=False)),
            ('scope', models.ForeignKey(orm[u'gtd.scope'], null=False))
        ))
        db.create_unique(u'gtd_node_scope', ['node_id', 'scope_id'])

        # Adding model 'NodeRepetition'
        db.create_table(u'gtd_noderepetition', (
            (u'id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('node', self.gf('django.db.models.fields.related.ForeignKey')(to=orm['gtd.Node'])),
            ('original_todo_state', self.gf('django.db.models.fields.related.ForeignKey')(related_name=u'repetitions_original_set', blank=True, to=orm['gtd.TodoState'])),
            ('new_todo_state', self.gf('django.db.models.fields.related.ForeignKey')(related_name=u'repetitions_new_set', blank=True, to=orm['gtd.TodoState'])),
            ('timestamp', self.gf('django.db.models.fields.DateTimeField')()),
        ))
        db.send_create_signal(u'gtd', ['NodeRepetition'])


    def backwards(self, orm):
        # Removing unique constraint on 'Node', fields ['parent', 'order']
        db.delete_unique(u'gtd_node', ['parent_id', 'order'])

        # Deleting model 'TodoState'
        db.delete_table(u'gtd_todostate')

        # Deleting model 'Tag'
        db.delete_table(u'gtd_tag')

        # Deleting model 'Tool'
        db.delete_table(u'gtd_tool')

        # Deleting model 'Location'
        db.delete_table(u'gtd_location')

        # Removing M2M table for field tools_available on 'Location'
        db.delete_table('gtd_location_tools_available')

        # Deleting model 'Contact'
        db.delete_table(u'gtd_contact')

        # Deleting model 'Context'
        db.delete_table(u'gtd_context')

        # Removing M2M table for field tools_available on 'Context'
        db.delete_table('gtd_context_tools_available')

        # Removing M2M table for field locations_available on 'Context'
        db.delete_table('gtd_context_locations_available')

        # Removing M2M table for field people_required on 'Context'
        db.delete_table('gtd_context_people_required')

        # Deleting model 'Priority'
        db.delete_table(u'gtd_priority')

        # Deleting model 'Scope'
        db.delete_table(u'gtd_scope')

        # Deleting model 'Node'
        db.delete_table(u'gtd_node')

        # Removing M2M table for field users on 'Node'
        db.delete_table('gtd_node_users')

        # Removing M2M table for field related_projects on 'Node'
        db.delete_table('gtd_node_related_projects')

        # Removing M2M table for field assigned on 'Node'
        db.delete_table('gtd_node_assigned')

        # Removing M2M table for field scope on 'Node'
        db.delete_table('gtd_node_scope')

        # Deleting model 'NodeRepetition'
        db.delete_table(u'gtd_noderepetition')


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
            'people_required': ('django.db.models.fields.related.ManyToManyField', [], {'symmetrical': 'False', 'related_name': "u'including_contexts_set'", 'blank': 'True', 'to': u"orm['gtd.Contact']"}),
            'tools_available': ('django.db.models.fields.related.ManyToManyField', [], {'symmetrical': 'False', 'related_name': "u'including_contexts_set'", 'blank': 'True', 'to': u"orm['gtd.Tool']"})
        },
        u'gtd.location': {
            'Meta': {'object_name': 'Location', '_ormbases': [u'gtd.Tag']},
            u'tag_ptr': ('django.db.models.fields.related.OneToOneField', [], {'to': u"orm['gtd.Tag']", 'unique': 'True', 'primary_key': 'True'}),
            'tools_available': ('django.db.models.fields.related.ManyToManyField', [], {'symmetrical': 'False', 'related_name': "u'including_locations_set'", 'blank': 'True', 'to': u"orm['gtd.Tool']"})
        },
        u'gtd.node': {
            'Meta': {'ordering': "[u'order']", 'object_name': 'Node'},
            'archived': ('django.db.models.fields.BooleanField', [], {'default': 'False'}),
            'assigned': ('django.db.models.fields.related.ManyToManyField', [], {'symmetrical': 'False', 'related_name': "u'assigned_nodes'", 'blank': 'True', 'to': u"orm['gtd.Contact']"}),
            'closed': ('django.db.models.fields.DateTimeField', [], {'null': 'True', 'blank': 'True'}),
            'deadline': ('django.db.models.fields.DateTimeField', [], {'null': 'True', 'blank': 'True'}),
            'deadline_time_specific': ('django.db.models.fields.BooleanField', [], {'default': 'False'}),
            'energy': ('django.db.models.fields.CharField', [], {'max_length': '2', 'null': 'True', 'blank': 'True'}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'opened': ('django.db.models.fields.DateTimeField', [], {'auto_now_add': 'True', 'null': 'True', 'blank': 'True'}),
            'order': ('django.db.models.fields.IntegerField', [], {}),
            'owner': ('django.db.models.fields.related.ForeignKey', [], {'related_name': "u'owned_node_set'", 'to': u"orm['orgwolf.OrgWolfUser']"}),
            'parent': ('django.db.models.fields.related.ForeignKey', [], {'blank': 'True', 'related_name': "u'child_heading_set'", 'null': 'True', 'to': u"orm['gtd.Node']"}),
            'priority': ('django.db.models.fields.CharField', [], {'max_length': '1', 'blank': 'True'}),
            'related_projects': ('django.db.models.fields.related.ManyToManyField', [], {'symmetrical': 'False', 'related_name': "u'project_set'", 'blank': 'True', 'to': u"orm['gtd.Node']"}),
            'repeating_number': ('django.db.models.fields.IntegerField', [], {'null': 'True', 'blank': 'True'}),
            'repeating_unit': ('django.db.models.fields.CharField', [], {'max_length': '1', 'null': 'True', 'blank': 'True'}),
            'repeats': ('django.db.models.fields.BooleanField', [], {'default': 'False'}),
            'repeats_from_completion': ('django.db.models.fields.NullBooleanField', [], {'default': 'False', 'null': 'True', 'blank': 'True'}),
            'scheduled': ('django.db.models.fields.DateTimeField', [], {'null': 'True', 'blank': 'True'}),
            'scheduled_time_specific': ('django.db.models.fields.BooleanField', [], {'default': 'False'}),
            'scope': ('django.db.models.fields.related.ManyToManyField', [], {'to': u"orm['gtd.Scope']", 'symmetrical': 'False', 'blank': 'True'}),
            'tag_string': ('django.db.models.fields.TextField', [], {'blank': 'True'}),
            'text': ('django.db.models.fields.TextField', [], {'blank': 'True'}),
            'time_needed': ('django.db.models.fields.CharField', [], {'max_length': '4', 'null': 'True', 'blank': 'True'}),
            'title': ('django.db.models.fields.TextField', [], {'blank': 'True'}),
            'todo_state': ('django.db.models.fields.related.ForeignKey', [], {'to': u"orm['gtd.TodoState']", 'null': 'True', 'blank': 'True'}),
            'users': ('django.db.models.fields.related.ManyToManyField', [], {'to': u"orm['orgwolf.OrgWolfUser']", 'symmetrical': 'False', 'blank': 'True'})
        },
        u'gtd.noderepetition': {
            'Meta': {'object_name': 'NodeRepetition'},
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'new_todo_state': ('django.db.models.fields.related.ForeignKey', [], {'related_name': "u'repetitions_new_set'", 'blank': 'True', 'to': u"orm['gtd.TodoState']"}),
            'node': ('django.db.models.fields.related.ForeignKey', [], {'to': u"orm['gtd.Node']"}),
            'original_todo_state': ('django.db.models.fields.related.ForeignKey', [], {'related_name': "u'repetitions_original_set'", 'blank': 'True', 'to': u"orm['gtd.TodoState']"}),
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
