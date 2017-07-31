# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations
from django.conf import settings
import mptt.fields


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Context',
            fields=[
                ('id', models.AutoField(verbose_name='ID', primary_key=True, serialize=False, auto_created=True)),
                ('name', models.CharField(max_length=100)),
                ('owner', models.ForeignKey(blank=True, null=True, to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name='FocusArea',
            fields=[
                ('id', models.AutoField(verbose_name='ID', primary_key=True, serialize=False, auto_created=True)),
                ('public', models.BooleanField(default=False)),
                ('display', models.CharField(max_length=50)),
                ('name', models.CharField(max_length=50)),
                ('is_visible', models.BooleanField(default=True)),
                ('owner', models.ForeignKey(blank=True, null=True, to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name='Node',
            fields=[
                ('id', models.AutoField(verbose_name='ID', primary_key=True, serialize=False, auto_created=True)),
                ('title', models.TextField(blank=True)),
                ('slug', models.SlugField()),
                ('archived', models.BooleanField(default=False)),
                ('text', models.TextField(blank=True)),
                ('scheduled_time', models.TimeField(blank=True, null=True)),
                ('scheduled_date', models.DateField(blank=True, null=True)),
                ('end_time', models.TimeField(blank=True, null=True)),
                ('end_date', models.DateField(blank=True, null=True)),
                ('deadline_time', models.TimeField(blank=True, null=True)),
                ('deadline_date', models.DateField(blank=True, null=True)),
                ('opened', models.DateTimeField(null=True, auto_now_add=True)),
                ('closed', models.DateTimeField(blank=True, null=True)),
                ('repeats', models.BooleanField(default=False)),
                ('repeating_number', models.IntegerField(blank=True, null=True)),
                ('repeating_unit', models.CharField(max_length=1, blank=True, null=True, choices=[('d', 'Days'), ('w', 'Weeks'), ('m', 'Months'), ('y', 'Years')])),
                ('repeats_from_completion', models.BooleanField(default=False)),
                ('priority', models.CharField(max_length=1, default='B', choices=[('A', 'A'), ('B', 'B'), ('C', 'C')])),
                ('tag_string', models.TextField(blank=True)),
                ('energy', models.CharField(max_length=2, blank=True, null=True, choices=[('High', 'HI'), ('Low', 'LO')])),
                ('time_needed', models.CharField(max_length=4, blank=True, null=True, choices=[('High', 'HI'), ('Low', 'LO')])),
                ('lft', models.PositiveIntegerField(db_index=True, editable=False)),
                ('rght', models.PositiveIntegerField(db_index=True, editable=False)),
                ('tree_id', models.PositiveIntegerField(db_index=True, editable=False)),
                ('level', models.PositiveIntegerField(db_index=True, editable=False)),
                ('focus_areas', models.ManyToManyField(blank=True, to='gtd.FocusArea')),
                ('owner', models.ForeignKey(blank=True, null=True, related_name='owned_node_set', to=settings.AUTH_USER_MODEL)),
                ('parent', mptt.fields.TreeForeignKey(blank=True, null=True, related_name='children', to='gtd.Node')),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='NodeRepetition',
            fields=[
                ('id', models.AutoField(verbose_name='ID', primary_key=True, serialize=False, auto_created=True)),
                ('timestamp', models.DateTimeField()),
            ],
        ),
        migrations.CreateModel(
            name='Priority',
            fields=[
                ('id', models.AutoField(verbose_name='ID', primary_key=True, serialize=False, auto_created=True)),
                ('priority_value', models.IntegerField(default=50)),
                ('owner', models.ForeignKey(to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name='Tag',
            fields=[
                ('id', models.AutoField(verbose_name='ID', primary_key=True, serialize=False, auto_created=True)),
                ('display', models.CharField(max_length=100)),
                ('tag_string', models.CharField(max_length=10, unique=True)),
                ('public', models.BooleanField(default=True)),
            ],
        ),
        migrations.CreateModel(
            name='TodoState',
            fields=[
                ('id', models.AutoField(verbose_name='ID', primary_key=True, serialize=False, auto_created=True)),
                ('class_size', models.IntegerField(default=0)),
                ('abbreviation', models.CharField(max_length=10, unique=True)),
                ('display_text', models.CharField(max_length=30)),
                ('actionable', models.BooleanField(default=True)),
                ('closed', models.BooleanField(default=False)),
                ('order', models.IntegerField(default=50)),
                ('_color_rgb', models.IntegerField(default=0)),
                ('_color_alpha', models.FloatField(default=0)),
                ('owner', models.ForeignKey(blank=True, null=True, to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['order'],
            },
        ),
        migrations.CreateModel(
            name='Contact',
            fields=[
                ('tag_ptr', models.OneToOneField(primary_key=True, serialize=False, auto_created=True, parent_link=True, to='gtd.Tag')),
                ('f_name', models.CharField(max_length=50)),
                ('l_name', models.CharField(max_length=50)),
                ('user', models.ForeignKey(blank=True, null=True, to=settings.AUTH_USER_MODEL)),
            ],
            bases=('gtd.tag',),
        ),
        migrations.CreateModel(
            name='Location',
            fields=[
                ('tag_ptr', models.OneToOneField(primary_key=True, serialize=False, auto_created=True, parent_link=True, to='gtd.Tag')),
            ],
            bases=('gtd.tag',),
        ),
        migrations.CreateModel(
            name='Tool',
            fields=[
                ('tag_ptr', models.OneToOneField(primary_key=True, serialize=False, auto_created=True, parent_link=True, to='gtd.Tag')),
            ],
            bases=('gtd.tag',),
        ),
        migrations.AddField(
            model_name='tag',
            name='owner',
            field=models.ForeignKey(blank=True, null=True, to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name='noderepetition',
            name='new_todo_state',
            field=models.ForeignKey(blank=True, null=True, related_name='repetitions_new_set', to='gtd.TodoState'),
        ),
        migrations.AddField(
            model_name='noderepetition',
            name='node',
            field=models.ForeignKey(to='gtd.Node'),
        ),
        migrations.AddField(
            model_name='noderepetition',
            name='original_todo_state',
            field=models.ForeignKey(blank=True, null=True, related_name='repetitions_original_set', to='gtd.TodoState'),
        ),
        migrations.AddField(
            model_name='node',
            name='todo_state',
            field=models.ForeignKey(blank=True, null=True, to='gtd.TodoState'),
        ),
        migrations.AddField(
            model_name='node',
            name='users',
            field=models.ManyToManyField(blank=True, to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name='node',
            name='assigned',
            field=models.ForeignKey(blank=True, null=True, related_name='assigned_node_set', to='gtd.Contact'),
        ),
        migrations.AddField(
            model_name='location',
            name='tools_available',
            field=models.ManyToManyField(blank=True, related_name='including_locations_set', to='gtd.Tool'),
        ),
        migrations.AddField(
            model_name='context',
            name='locations_available',
            field=models.ManyToManyField(blank=True, related_name='including_contexts_set', to='gtd.Location'),
        ),
        migrations.AddField(
            model_name='context',
            name='people_required',
            field=models.ManyToManyField(blank=True, related_name='including_contexts_set', to='gtd.Contact'),
        ),
        migrations.AddField(
            model_name='context',
            name='tools_available',
            field=models.ManyToManyField(blank=True, related_name='including_contexts_set', to='gtd.Tool'),
        ),
    ]
