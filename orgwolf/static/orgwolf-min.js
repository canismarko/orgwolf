/*!
 * jQuery Cookie Plugin v1.3
 * https://github.com/carhartl/jquery-cookie
 *
 * Copyright 2011, Klaus Hartl
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * http://www.opensource.org/licenses/mit-license.php
 * http://www.opensource.org/licenses/GPL-2.0
 */
(function(f,b,g){var a=/\+/g;function e(h){return h}function c(h){return decodeURIComponent(h.replace(a," "))}var d=f.cookie=function(p,o,u){if(o!==g){u=f.extend({},d.defaults,u);if(o===null){u.expires=-1}if(typeof u.expires==="number"){var q=u.expires,s=u.expires=new Date();s.setDate(s.getDate()+q)}o=d.json?JSON.stringify(o):String(o);return(b.cookie=[encodeURIComponent(p),"=",d.raw?o:encodeURIComponent(o),u.expires?"; expires="+u.expires.toUTCString():"",u.path?"; path="+u.path:"",u.domain?"; domain="+u.domain:"",u.secure?"; secure":""].join(""))}var h=d.raw?e:c;var r=b.cookie.split("; ");for(var n=0,k=r.length;n<k;n++){var m=r[n].split("=");if(h(m.shift())===p){var j=h(m.join("="));return d.json?JSON.parse(j):j}}return null};d.defaults={};f.removeCookie=function(i,h){if(f.cookie(i)!==null){f.cookie(i,null,h);return true}return false}})(jQuery,document);"use strict";var GtdHeading,HeadingManager;GtdHeading=function(b){var c,d,a;if(!b){b={}}this.fields={archived:false,priority:"B",scope:[],text:"",title:"",todo_state:null,tree_id:null,};this.pk=0;this.workspace={};this.archived=false;this.populated=false;this.expandable="lazy";this.rank=1;this.state="closed";this.visible=false;this.children=new HeadingManager(b.workspace);this.set_fields(b);this.parent_obj=this.get_parent();if(this.workspace){if(this.parent_obj){this.rank=this.parent_obj.rank+1}}};GtdHeading.prototype.set_fields=function(f){var g,h,e,c,b;b=$.extend({},f);e=/^\d{4}-\d{2}-\d{2}[0-9:TZ]*/;if(b.id!==undefined){this.pk=Number(b.id);delete b.id}if(b.workspace!==undefined){this.workspace=b.workspace;delete b.workspace}this.model=b.model;delete b.model;try{if(b.parent===this.pk){throw"bad parent"}}catch(a){if(a==="bad parent"){console.error("Cannot create node as a child of itself");throw a}}jQuery.extend(this.fields,b);this.update()};GtdHeading.prototype.get_todo_state=function(){var d,b,c,a;d=null;if(typeof this.workspace!=="undefined"){for(b=0;b<this.workspace.todo_states.length;b+=1){c=this.workspace.todo_states[b];if(c.pk===Number(this.todo_state)){d=c}}}if(d){a=d}else{a={pk:this.todo_state}}return a};GtdHeading.prototype.get_title=function(){var a;a=this.title;if(this.archived){a='<span class="archived-text">'+a+"</span>"}return a};GtdHeading.prototype.get_previous_sibling=function(){var b,c,a;b=null;if(this.level===0){c=this.fields.tree_id;while(c>1&&b===null){c=c-1;b=this.workspace.headings.get({tree_id:c,level:0,})}}else{a=this.fields.lft;a=a-2;while(a>1&&b===null){b=this.workspace.headings.get({tree_id:this.fields.tree_id,parent:this.fields.parent,lft:a,})}}return b};GtdHeading.prototype.get_parent=function(){var a;if(this.rank>0&&this.workspace.headings){if(this.fields.parent===null){a=this.workspace}else{a=this.workspace.headings.get({pk:this.fields.parent})}}else{a=null}return a};GtdHeading.prototype.get_children=function(){var a;if(this.rank===0){a=this.workspace.headings.filter_by({rank:1})}else{a=this.workspace.headings.filter_by({parent:this.pk}).order_by("lft")}return a};GtdHeading.prototype.refresh_tree=function(){var a,b,c,d;a="/gtd/tree/"+this.fields.tree_id+"/";c=this;$.get(a,function(e){while(typeof e==="string"){e=$.parseJSON(e)}for(b=0;b<e.length;b+=1){d=new GtdHeading(e[b]);c.workspace.headings.add(d)}})};GtdHeading.prototype.is_leaf_node=function(){var a;if(this.fields.rght-this.fields.lft===1){a=true}else{if(this.fields.rght-this.fields.lft>1){a=false}else{a=undefined}}return a};GtdHeading.prototype.is_expandable=function(){var b,a,c;b=undefined;c=/\S+/;if(c.test(this.fields.text)||c.test(this.fields.tag_string)||this.fields.scheduled_date||this.fields.deadline_date){b=true}else{if(this.populated){if(this.children.length>0){b=true}else{b=false}}}return b};GtdHeading.prototype.is_visible=function(i){var b,d,j,e,f,c,k,g,h,a;b=true;if(this.workspace.active_scope){if(this.fields.scope.indexOf(this.workspace.active_scope)===-1){b=false}}j=this.workspace.active_states;if(typeof j!=="undefined"){f=true;if(j.indexOf(this.fields.todo_state)===-1){f=false}c=this.just_modified||false;k=this.todo_state?this.todo_state.fields.closed:false;if(this.fields.deadline_date&&!k){g=7;h=g*24*60*60*1000;a=(this.due()<h)}else{a=false}if(!f&&!a&&!c){b=false}}d=this.workspace?this.workspace.show_arx:false;if(this.fields.archived&&!d){b=false}if(this.parent_obj&&!this.workspace.show_list){if(this.parent_obj.state!=="open"){b=false}}if(this.pk===-1){b=false}return b};GtdHeading.prototype.due=function(){var c,a,b;c=null;if(this.fields.deadline_date){a=new Date();b=new Date(this.fields.deadline_date);c=b-a}return c};GtdHeading.prototype.update=function(){var a;this.expandable=this.is_expandable();if(typeof this.workspace.todo_states!=="undefined"){this.todo_state=this.workspace.todo_states.get({pk:this.fields.todo_state})}if(typeof this.workspace.headings!=="undefined"){this.children=this.workspace.headings.filter_by({parent:this.pk})}this.parent_obj=this.get_parent()};GtdHeading.prototype.save=function(d){var c,h,f,e,g,b,a;g=this;if(d===undefined){d={}}e=d.auto?true:false;c="/gtd/node/";g.fields.auto_update=e;f=jQuery.extend({},g.fields,{id:g.pk});b=g.fields.deadline_date;a=g.fields.scheduled_date;if(g.pk>0){c+=g.pk+"/";h="PUT"}else{h="POST"}jQuery.ajax(c,{type:h,data:JSON.stringify(f),contentType:"application/json",success:function(k,i,j){g.workspace.$apply(function(){var m,l;g.workspace.notify("Saved!","success");if(typeof k==="string"){k=jQuery.parseJSON(k)}g.pk=k.pk;g.set_fields(k);g.update();if(g.fields.scheduled_date!==a){l='"'+g.fields.title+'" rescheduled for ';l+=g.fields.scheduled_date;g.workspace.notify(l,"info")}})},error:function(k,i,j){g.workspace.notify("Oh no! Something went wrong. If you feel this is a bug, please send us some feedback","danger");console.error(k.responseText)},})};GtdHeading.prototype.move_to=function(h,d){var g,c,b,a,f,e;g=this;b=true;if(d===undefined){d={}}if(d.position===undefined){d.position="first-child"}if(d.save===undefined){d.save=false}a=function(){var i=true;if(g.fields.tree_id===h.fields.tree_id){if(g===h){console.error("GtdHeading refusing to move relative to itself");i=false}else{if(h.fields.lft>g.fields.lft&&h.fields.rght<g.fields.rght){console.error("GtdHeading refusing to move relative to its own child");i=false}}}return i};f=function(){var i=a();if(i===true){g.fields.parent=h.pk;g.fields.tree_id=h.fields.tree_id;g.level=h.level+1;g.rank=h.rank+1}return i};e=function(){var i=a();if(i===true){g.fields.parent=h.fields.parent;g.fields.tree_id=h.fields.tree_id;g.level=h.level;g.rank=h.rank}return i};c={"first-child":function(){var i=f();if(i===true){g.fields.lft=-1}return i},"last-child":function(){var j,i;j=f();if(j===true){i=h.get_children();g.fields.lft=i[i.length-1].fields.lft+1}return j},left:function(){var i=e();if(i===true){g.fields.lft=h.fields.lft-1}return i},right:function(){var i=e();if(i===true){g.fields.lft=h.fields.lft+1}return i}};if(typeof c[d.position]==="function"){b=c[d.position]()}else{b=false}if(b===true){h.update();g.rebuild()}return b};GtdHeading.prototype.rebuild=function(){var a,b;a=this.workspace.headings.get({tree_id:this.fields.tree_id,rank:1});b=function(f,g){var e,c,d;f.fields.lft=g;e=f.get_children();c=g+1;for(d=0;d<e.length;d+=1){c=b(e[d],c)+1}f.fields.rght=c;return c};if(a.fields.lft===undefined){a.fields.lft=1}b(a,a.fields.lft)};GtdHeading.prototype.has_scope=function(b){var a;if(b===0){a=true}else{if((b===-1)&&(this.scope.length===0)){a=true}else{if(jQuery.inArray(b,this.scope)>-1){a=true}else{a=false}}}return a};GtdHeading.prototype.set_indent=function(b,c){var a=(this.icon_width+4)*c;b.css("margin-left",a+"px")};GtdHeading.prototype.populate_children=function(b){var a,c,d;if(typeof b==="undefined"){b={}}a="/gtd/node/";c=this;d=function(e){var f,g;g=c.fields.level+e.offset;f={level:g,tree_id:c.fields.tree_id,rght__lt:c.fields.rght,lft__gt:c.fields.lft,};$.getJSON(a,f,function(i,h,j){c.workspace.$apply(function(){var k,l,n,o,m;if(h==="success"){k=i;for(l=0;l<k.length;l+=1){n=k[l];n.workspace=c.workspace;o=new GtdHeading(n);m=o.get_parent();if(m||o.rank===1){o=c.workspace.headings.add(o)}if(m){m.children.add(o);if(m.state==="open"){o.visible=true}}}if(c.rank===0){c.populated=true}if(e.offset===1){c.populated=true;c.update()}else{if(e.offset===2){for(l=0;l<c.children.length;l+=1){c.children[l].populated=true;c.children[l].update()}}}if(e.callback){e.callback()}}})})};if(!this.populated){if(this.rank>0&&this.$children){this.$children.hide()}d({offset:1,callback:function(){if(!c.populated_level_2){d({offset:2});c.populated_level_2=true}}})}else{if(!this.populated_level_2){d({offset:2});this.populated_level_2=true}}};GtdHeading.prototype.toggle=function(a){this.populate_children();if(typeof a!=="undefined"){this.state=a}else{if(this.state==="open"){this.state="closed"}else{if(this.state==="closed"){this.state="open"}}}};var HeadingManager=function(a){var b=[];b.workspace=a;return b};Array.prototype.get=function(c){var b,a;a=this.filter_by(c);if(a.length===1){b=a[0]}else{if(a.length>1){console.error("HeadingManager.get():query did not produce unique result. Returning first result");console.log(c);console.log(a);b=a[0]}else{b=null}}return b};Array.prototype.filter_by=function(g){var a,c,e,f,b,d;a=[];a.workspace=this.workspace;for(c=0;c<this.length;c+=1){e=this[c];if(e.rank===0){f=false}else{f=true}for(b in g){if(g.hasOwnProperty(b)){if(typeof e.fields!=="undefined"){if(Object.keys(e.fields).indexOf(b)>-1){d=e.fields}else{d=e}}else{d=e}if(d[b] instanceof Array){if(g[b] instanceof Array){if(!(($(e.scope).not([]).length===0&&$([]).not(e.scope).length===0)&&typeof e.scope!=="undefined")){f=false}}else{if(jQuery.inArray(g[b],d[b])<0){f=false}}}else{if(d[b]!==g[b]){f=false}}}}if(f){a.push(e)}}return a};Array.prototype.order_by=function(g){var a,b,e,c,d,f;d=["opened","closed","scheduled_date","deadline_date"];a=/^(-)?(\S*)$/.exec(g);c=a[2];b=this.slice(0);if(a[1]==="-"){f=-1}else{f=1}e=function(i,h){var n,k,m,l,j;if(typeof i.fields==="undefined"||typeof h.fields==="undefined"){n=i[c];k=h[c]}else{if(i.fields.hasOwnProperty(c)&&h.fields.hasOwnProperty(c)){n=i.fields[c];k=h.fields[c]}else{n=i[c];k=h[c]}}m=Number(n);l=Number(k);if(i.pk===0){j=-1;f=1}else{if(h.pk===0){j=1;f=1}else{if(d.indexOf(c)>-1){j=new Date(n)-new Date(k)}else{if(m&&l){j=m-l}else{n=n.toUpperCase();k=k.toUpperCase();if(n<k){j=-1}else{if(n>k){j=1}else{j=0}}}}}}return j*f};b.sort(e);return b};Array.prototype.add=function(g){var d,f,c,a,e,h,b;d=this;c=["pk","populated","text","todo_state","archived","rank","scope","parent"];e=function(k){var i,j;i=[];j=function(m){var l;f=d.get({pk:m.pk});if(f){m.populated=f.populated;for(l in m.fields){if(m.fields.hasOwnProperty(l)){f.fields[l]=m.fields[l]}}a=f}else{m.workspace=d.workspace;d.push(m);a=m}a.update();i.push(a.get_parent());return a};if(k instanceof Array){for(b=0;b<k.length;b+=1){h=new GtdHeading(k[b]);j(h)}}else{a=j(k)}i=i.filter(function(n,m,l){return l.lastIndexOf(n)===m});for(b=0;b<i.length;b+=1){if(i[b]){i[b].update()}}};if(g.$resolved===false){g.$promise.then(e)}else{e(g)}return a};Array.prototype.remove=function(c){var a,b;b=false;a=this.indexOf(c);if(a>-1){this.splice(a,1);b=true}return b};Date.prototype.ow_date=function(){var a;a=this.getFullYear()+"-"+(this.getMonth()+1)+"-"+this.getDate();a=this.toISOString().slice(0,10);return a};"use strict";var HeadingFactory,UpcomingFactory,GtdListFactory;var owServices=angular.module("owServices",["ngResource"]);owServices.factory("owWaitIndicator",["$rootScope",function(a){var c,b;c={waitLists:{quick:[],medium:[],},start_wait:function(e,d){c.waitLists[e].push(d)},end_wait:function(f,e){var d,g;d=c.waitLists[f];if(d===undefined){e=f;d=[c.waitLists.quick,c.waitLists.medium]}else{d=[d]}for(g=0;g<d.length;g+=1){b(d[g],e)}},};b=function(f,d){var e;e=f.indexOf(d);while(e>-1){f.splice(e,1);e=f.indexOf(d)}};return c}]);owServices.factory("OldHeading",["$resource","$http",function(a,b){return function(c){return new GtdHeading(c)}}]);owServices.factory("Heading",["$resource","$http",HeadingFactory]);function HeadingFactory(b,c){var a=b("/gtd/node/:pk/",{pk:"@pk"},{query:{method:"GET",transformResponse:c.defaults.transformResponse.concat([function(e,d){return e}]),isArray:true},});return a}owServices.factory("Upcoming",["$resource","$http",UpcomingFactory]);function UpcomingFactory(b,c){var a=b("/gtd/node/upcoming/",{},{query:{method:"GET",transformResponse:c.defaults.transformResponse.concat([function(e,d){return e}]),isArray:true},});return a}owServices.factory("GtdList",["$resource","$http",GtdListFactory]);function GtdListFactory(b,c){var a=b("/gtd/lists/",{},{query:{method:"GET",transformResponse:c.defaults.transformResponse.concat([function(f,e){var d,g;for(d=0;d<f.length;d+=1){g=new GtdHeading(f[d]);jQuery.extend(f[d],g)}return f}]),isArray:true},});return a}"use strict";var owDirectives=angular.module("owDirectives",["ngAnimate","ngResource","owServices"]);owDirectives.directive("owSwitch",function(){function a(c,b,e,d){var g;g=b.find("input");function f(h){g.bootstrapSwitch("setState",h)}d.$formatters.push(f);g.on("switch-change",function(i,h){if(h.value!==d.$modelValue){c.$apply(function(){d.$setViewValue(h.value)})}});g.bootstrapSwitch()}return{link:a,require:"?ngModel",}});owDirectives.directive("owWaitFeedback",["owWaitIndicator",function(b){function a(d,c,e){var f;f=c.find(".mask");f.hide();c.hide();d.$watchCollection(function(){return b.waitLists.quick.length},function(g){if(g>0){c.show()}else{c.hide()}});d.$watchCollection(function(){return b.waitLists.medium.length},function(g){if(g>0){c.show();f.show()}else{c.hide();f.hide()}})}return{link:a,scope:{},}}]);owDirectives.directive("owCurrentDate",function(){function a(c,b,d){var f;f=b.find("input");c.isEditable=false;function e(g){c.dateString=g.toDateString();c.dateModel=g.ow_date();return g}c.$watch("currentDate",function(g){return e(g)},true);f.on("blur",function(){c.$apply(function(){var g;c.isEditable=false;g=new Date(c.dateModel);if(isNaN(g)){e(c.currentDate)}else{c.currentDate.setDate(g.getUTCDate());c.currentDate.setMonth(g.getUTCMonth());c.currentDate.setYear(g.getUTCFullYear())}})})}return{link:a,templateUrl:"/static/current-date.html",scope:true,}});owDirectives.directive("owEditable",["$resource","$rootScope","$timeout","owWaitIndicator",function(c,a,b,e){function d(n,g,m){var p,k,o,h,j,i,l,f;p={fields:{priority:"B",scope:[],}};n.scopes=a.scopes;n.todo_states=a.todo_states;g.addClass("ow-editable");if(n.heading.pk>0){e.start_wait("quick","editable");j=c("/gtd/node/:id/",{id:"@id"});n.fields=j.get({id:n.heading.pk});n.fields.$promise.then(function(){e.end_wait("editable")})}else{l=n.heading.get_parent();if(!l.pk){l=p}n.fields={scope:l.fields.scope,priority:l.fields.priority}}n.priorities=[{sym:"A",display:"A - high"},{sym:"B",display:"B - medium (default)"},{sym:"C",display:"C - low"}];n.time_units=[{value:"d",label:"Days"},{value:"w",label:"Weeks"},{value:"m",label:"Months"},{value:"y",label:"Years"},];n.repeat_schemes=[{value:false,label:"scheduled date"},{value:true,label:"completion date"},];k=g.find(".edit-text");h=g.find("#edit-save");$("html").animate({scrollTop:g.offset().top-27},"500");g.find("#title").focus();n.save=function(q){n.fields.text=tinyMCE.get(f).getContent();$.extend(n.heading.fields,n.fields);n.heading.update();n.heading.editable=false;n.heading.save()};n.cancel_edit=function(q){n.heading.editable=false;if(n.heading.pk===0){n.heading.pk=-1}};b(function(){f="edit-text-"+n.heading.pk;tinymce.init({plugins:"charmap fullscreen hr image link table textcolor",toolbar:"undo redo | fullscreen | styleselect | bold italic forecolor backcolor superscript subscript | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | hr link image",tools:"inserttable",mode:"exact",elements:f,});n.$watch("fields.text",function(r){var q=tinyMCE.get(f);if(r&&q){q.setContent(r)}})})}return{link:d,scope:{heading:"=owHeading",},require:"?ngModel",templateUrl:"/static/editable.html"}}]);owDirectives.directive("owScopeTabs",["$resource",function(a){function b(f,e,d){var c;e.find('[scope_id="'+f.active_scope+'"]').addClass("active");f.change_scope=function(h){var g;e.find('[scope_id="'+f.active_scope+'"]').removeClass("active");if(h){f.active_scope=h.id}else{f.active_scope=0}e.find('[scope_id="'+f.active_scope+'"]').addClass("active")}}return{link:b,templateUrl:"/static/scope-tabs.html"}}]);owDirectives.directive("owTodo",["$filter",function(b){function a(o,g,n){var h,m,f,j,d,l,p,c;c=b("style");o.heading.todo_popover=false;m=g.children("span");if(o.heading.todo_state){m.tooltip({delay:{show:1000,hide:100},title:o.heading.todo_state.fields.display_text,placement:"right"})}function e(i){g.popover("destroy")}function k(i){$("body").append('<div id="todo-popover"></div>');l='<div class="todo-option" todo_id=""';if(o.heading.fields.todo_state===null){l+=" selected"}l+=">[None]</div>\n";for(h=0;h<o.todo_states.length;h+=1){d=o.todo_states[h];p='<div class="todo-option" todo_id="'+d.pk+'"';p+='style="'+c(d)+'"';if(d.pk===o.heading.fields.todo_state){p+=" selected"}p+=">"+d.fields.abbreviation+"</div>\n";l+=p}i.popover({title:"Todo State",content:l,html:true,container:"#todo-popover"});i.popover("show");$("body").on("click.todo_state",function(q){if(!$(q.target).hasClass("todo-state")){i.popover("destroy")}});j=$(".todo-option").not("[selected]");j.on("click.todostate",function(q){o.$apply(function(){var r=$(q.target).attr("todo_id");if(r===""){o.heading.fields.todo_state=null}else{o.heading.fields.todo_state=parseInt(r,10)}o.heading.update();o.heading.just_modified=true;o.heading.save({auto:true});e(i)})})}m.on("click",function(i){k(m)})}return{link:a,templateUrl:"/static/todo-state-selector.html",}}]);owDirectives.directive("owListRow",function(){function a(f,e,d){var c,b;b=$(e);f.$watch(function(){return f.heading.fields.deadline_date},function(){var g,h;h=f.heading.due();if(h===null){g=""}else{if(h<=0){g="overdue"}else{if(h>0){g="upcoming"}}}e.addClass(g)});f.$watch("heading.fields.archived",function(g){if(g){e.addClass("archived")}});f.$watch("heading.fields.priority",function(g,h){if(h){e.removeClass("priority-"+h)}if(g){e.addClass("priority-"+g)}});f.edit=function(g){g.editable=true}}return{link:a,scope:true,}});"use strict";var owFilters=angular.module("owFilters",["ngSanitize"]);owFilters.filter("is_target",function(){return function(c,b){var a="";if(b){if(c.pk===b.id){a="yes"}else{if(c.fields.tree_id===b.tree_id&&c.fields.lft<b.lft&&c.fields.rght>b.rght){a="ancestor"}}}return a}});owFilters.filter("style",function(){return function(e){var d,f,a,b;d="";if(e===null||e===undefined){d=null}else{if(e.model==="gtd.todostate"){f={};f.RED_OFFSET=16;f.GREEN_OFFSET=8;f.BLUE_OFFSET=0;f.RED_MASK=16711680;f.GREEN_MASK=65280;f.BLUE_MASK=255;f.red=(e.fields._color_rgb&f.RED_MASK)>>f.RED_OFFSET;f.green=(e.fields._color_rgb&f.GREEN_MASK)>>f.GREEN_OFFSET;f.blue=(e.fields._color_rgb&f.BLUE_MASK)>>f.BLUE_OFFSET;d+="color: rgba("+f.red+", "+f.green+", "+f.blue;d+=", "+e.fields._color_alpha+"); ";if(e.fields.actionable){d+="font-weight: bold; "}}else{if(e.fields.level>0){a=["rgb(80, 0, 0)","rgb(0, 44, 19)","teal","slateblue","brown"];b=(e.fields.level)%a.length;d+="color: "+a[b-1]+"; "}}}return d}});owFilters.filter("asHtml",["$sce",function(a){return function(c){var b=a.trustAsHtml(c);return b}}]);owFilters.filter("order",["$sce",function(a){return function(f,e){var c,d,b;if(e==="list"){b=f.filter_by({deadline_date:null});d=$(f).not(b).get().order_by("deadline_date");c=d;c=c.concat(b.order_by("priority"))}else{c=f.order_by(e)}return c}}]);owFilters.filter("deadline_str",["$sce",function(a){return function(e){var f,c,b,d,g;f="";if(e.fields.deadline_date){f="Due ";c=new Date(e.fields.deadline_date+"T12:00:00");b=new Date();b.setHours(12,0,0,0);d=c.getTime()-b.getTime();g=Math.ceil(d/(1000*3600*24));if(g===0){f+="today"}else{if(g===-1){f+="yesterday"}else{if(g<0){f+=Math.abs(g)+" days ago"}else{if(g===1){f+="tomorrow"}else{if(g>0){f+="in "+g+" days"}}}}}}return f}}]);"use strict";var test_headings,owConfig,HeadingFactory,GtdListFactory,UpcomingFactory,outlineCtrl,listCtrl;var owMain=angular.module("owMain",["ngAnimate","ngResource","ngSanitize","ngRoute","owServices","owDirectives","owFilters"]);owMain.config(["$routeProvider","$locationProvider",function(b,a){a.html5Mode(true);b.when("/gtd/actions/:context_id?/:context_slug?",{templateUrl:"/static/actions-list.html",controller:"nextActionsList",}).when("/gtd/project/",{templateUrl:"/static/project-outline.html",controller:"nodeOutline"}).when("/",{redirectTo:"/gtd/project/"})}]);owMain.config(["$httpProvider","$locationProvider",owConfig]);function owConfig(d,b){d.defaults.headers.common["X-Request-With"]="XMLHttpRequest";d.defaults.xsrfCookieName="csrftoken";d.defaults.xsrfHeaderName="X-CSRFToken";function a(e){var j,h,g,f;j=null;if(document.cookie&&document.cookie!==""){h=document.cookie.split(";");for(g=0;g<h.length;g+=1){f=jQuery.trim(h[g]);if(f.substring(0,e.length+1)===(e+"=")){j=decodeURIComponent(f.substring(e.length+1));break}}}return j}var c=a("csrftoken");$.ajaxSetup({beforeSend:function(e){e.setRequestHeader("X-CSRFToken",c)}})}owMain.run(["$rootScope","$resource",function(c,e){var b,d,a;b=e("/gtd/todostate/");c.todo_states=b.query();d=e("/gtd/context/");c.contexts=d.query();a=e("/gtd/scope/");c.scopes=a.query()}]);owMain.run(["$rootScope",function(a){var b,c;c=1;b=4000;a.notifications=[];a.notify=function(e,d){console.log(e);a.notifications.push({pk:c,msg:e,cls:d});c=c+1;setTimeout(function(){a.$apply(function(){a.notifications.splice(0,1)})},b)}}]);owMain.run(["$rootScope","$location",function(a,b){a.$on("$routeChangeSuccess",function(){if(typeof ga!=="undefined"){ga("send","pageview",{page:b.path()})}})}]);owMain.controller("inboxCapture",["$scope","$rootScope","owWaitIndicator",function(b,a,c){b.capture=function(f){var g,d,h;d={handler_path:"plugins.quickcapture"};h=$(f.target).find("#new_inbox_item");d.subject=h.val();c.start_wait("medium","quickcapture");$.ajax("/wolfmail/message/",{type:"POST",data:d,complete:function(){b.$apply(function(){c.end_wait("quickcapture")})},success:function(){h.val("");a.$emit("refresh_messages")},error:function(j,e,i){alert("Failed!");console.log(e);console.log(i)}})}}]);owMain.controller("nodeOutline",["$scope","$http","$resource","OldHeading","Heading","$location","$anchorScroll","owWaitIndicator",outlineCtrl]);function outlineCtrl(n,r,h,i,p,f,d,k){var j,e,c,m,g,q,a,b,l,o,s;$(".ow-active").removeClass("active");$("#nav-projects").addClass("active");o=f.hash().split("-")[0];if(o){n.target_heading=h("/gtd/node/:id/").get({id:o})}s=p.query({parent_id:0,archived:false});n.headings=new HeadingManager(n);n.children=new HeadingManager(n);n.headings.add(s);n.active_scope=0;n.sort_field="title";n.sort_fields=[{key:"title",display:"Title"},{key:"-title",display:"Title (reverse)"},{key:"-opened",display:"Creation date"},{key:"opened",display:"Creation date (oldest first)"},];if(n.parent_id===""){n.parent_id=0}else{n.parent_id=parseInt(n.parent_id,10)}n.show_arx=false;n.state="open";n.rank=0;n.update=function(){n.children=n.headings.filter_by({parent:null})};if(n.parent_id){l=p.query({tree_id:a,level__lte:b+1});n.headings.add(l);l.$promise.then(function(){var u,t;u=n.headings.get({pk:n.parent_id});t=function(w){var v;w.toggle("open");w.update();v=w.get_parent();if(v.rank!==0){t(v)}};if(u.fields.archived){n.show_arx=true}t(u);u.editable=true})}m=function(w){var t,v,u;t=$(w.delegateTarget).closest(".heading");u=Number(t.attr("node_id"));v=n.headings.get({pk:u});return v};n.edit_heading=function(t){t.populate_children();t.editable=true};n.archive_heading=function(t){if(t.fields.archived){t.fields.archived=false}else{t.fields.archived=true}t.save()};n.new_heading=function(t){var u;u=new i({id:0,workspace:t.workspace,title:"",parent:t.pk,level:t.fields.level+1,scope:t.fields.scope,});u.editable=true;u.expandable="no";t.children.add(u);n.headings.add(u);t.toggle("open")};n.toggle_node=function(t){t.toggle()};n.show_all=function(u){var t;if(n.show_arx===true){n.show_arx=false}else{n.show_arx=true}if(!n.arx_cached){t=p.query({parent_id:0,archived:true});n.headings.add(t);n.headings.add(t);n.arx_cached=true}};n.add_heading=function(t){var u;u=new i({id:0,workspace:n,title:"",parent:null,level:0,});u.editable=true;n.headings.add(u);n.children.add(u)}}owMain.controller("nextActionsList",["$sce","$scope","$resource","$location","$routeParams","GtdList","Heading","Upcoming",listCtrl]);function listCtrl(l,p,q,f,n,d,k,o){var e,g,m,j,c,b,h,a;$(".ow-active").removeClass("active");$("#nav-actions").addClass("active");p.list_params={};if(typeof n.context_id!=="undefined"){p.active_context=parseInt(n.context_id,10);p.context_name=n.context_slug;p.list_params.context=p.active_context}else{p.active_context=null}p.show_list=true;p.update=function(){};h=f.search().parent;if(h){h=parseInt(h,10);p.parent_id=h;p.list_params.parent=h;p.parent=q("/gtd/node/:id/").get({id:h})}a=f.search().todo_state;if(a){if(!Array.isArray(a)){a=[a]}a=a.map(function(i){return parseInt(i,10)})}else{a=[2]}p.cached_states=a.slice(0);p.active_states=a.slice(0);p.currentDate=new Date();p.$watch("currentDate",function(){p.$emit("refresh_list")},true);p.list_params.todo_state=p.active_states;p.$on("refresh_list",function(){p.headings=new HeadingManager(p);p.headings.add(d.query(p.list_params));p.headings.add(o.query());p.scheduled=new HeadingManager(p);p.scheduled.add(k.query({field_group:"actions_list",scheduled_date__lte:p.currentDate.ow_date(),todo_state:8}))});p.show_arx=true;p.active_scope=0;p.toggle_todo_state=function(u){var s,v,t,r;v=parseInt($(u.target).attr("ow-state"),10);s=p.active_states.indexOf(v);if(s>-1){p.active_states.splice(s,1)}else{p.active_states.push(v)}if(p.cached_states.indexOf(v)===-1){p.cached_states.push(v);p.list_params.todo_state=v;p.headings.add(d.query(p.list_params))}};c=function(s){var r,i;r="/gtd/actions";if(s.active_context){r+="/"+s.active_context;r+="/"+s.context_name.toLowerCase().replace(/ /g,"-").replace(/[^\w\-]+/g,"")}f.path(r);i={};if(p.parent_id){i.parent=p.parent_id}i.todo_state=p.active_states;f.search(i)};p.change_context=function(i){p.headings=new HeadingManager(p);p.list_params.context=p.active_context;if(p.active_context){p.context_name=p.contexts.get({id:p.active_context}).name}else{delete p.context_name}p.list_params.todo_state=p.active_states;p.headings.add(d.query(p.list_params));c(p)};p.filter_parent=function(i){if(i===null){delete p.parent_id}else{p.parent_id=i.fields.root_id}c(p)}}"use strict";var Message;Message=function(a){if(a===undefined){a={}}this.fields={};this.set_fields(a)};Message.prototype.set_fields=function(a){$.extend(this.fields,a);this.pk=a.id;this.url="/wolfmail/message/"+this.pk+"/"};Message.prototype.create_node=function(d){var b,e,c,a;b=this;c={action:"create_node"};$.extend(c,d);delete c.$scope;jQuery.ajax(this.url,{type:"PUT",data:c,success:function(){d.$scope.$apply(d.$scope.success(b))},})};Message.prototype.delete_msg=function(b){var c,a;a=this;jQuery.ajax(this.url,{type:"DELETE",data:{action:"delete"},success:function(){b.$scope.$apply(b.$scope.success(a))}})};Message.prototype.archive=function(b){var c,a;a=this;jQuery.ajax(this.url,{type:"PUT",data:{action:"archive"},success:function(){b.$scope.$apply(b.$scope.success(a))}})};Message.prototype.defer=function(b){var c,a;a=this;jQuery.ajax(this.url,{type:"PUT",data:{action:"defer",target_date:b.target_date},success:function(){b.$scope.$apply(b.$scope.success(a))}})};"use strict";var MessageFactory;owMain.factory("MessageAPI",["$resource","$http",MessageFactory]);function MessageFactory(b,c){var a=b("/wolfmail/message/:id",{id:"@id"},{query:{method:"GET",transformResponse:c.defaults.transformResponse.concat([function(f,e){var d,g;for(d=0;d<f.length;d+=1){g=new Message(f[d]);f[d]=g}return f}]),isArray:true},get:{method:"GET",transformResponse:c.defaults.transformResponse.concat([function(d){return new Message(d)}])}});a.prototype.create_node=Message.prototype.create_node;a.prototype.delete_msg=Message.prototype.delete_msg;a.prototype.archive=Message.prototype.archive;a.prototype.defer=Message.prototype.defer;return a}"use strict";owMain.directive("owMessageRow",function(){function a(i,b,g){var h,j,c,k,d,f,e;h=$(b);h.find(".glyphicon").tooltip();j=h.find(".msg-task");c=h.find(".msg-project");k=h.find(".msg-complete");d=h.find(".msg-defer");f=h.find(".msg-save");e=h.find(".msg-delete");if(g.owHandler==="plugins.deferred"){c.remove();d.remove();f.remove();e.remove()}else{k.remove()}}return{link:a,}});owMain.directive("owMsgActions",["Heading",function(b){function a(f,e,d){var c;c=$(e);f.$task_modal=c.find(".modal.task");f.$delete_modal=c.find(".modal.delete");f.$defer_modal=c.find(".modal.defer");if(f.new_node===undefined){f.new_node={}}f.new_node.$scope=f;f.create_task_modal=function(g){f.new_node.title=g.fields.subject;if(g.fields.handler_path==="plugins.deferred"){g.create_node(f.new_node)}else{f.active_msg=g;f.modal_task=true;f.$task_modal.modal()}};f.open_task_modal=function(g){f.new_node.close=false;f.create_task_modal(g)};f.complete_task=function(g){f.new_node.close=true;f.create_task_modal(g)};f.create_project_modal=function(g){delete f.new_node.tree_id;delete f.new_node.parent;f.new_node.title=g.fields.subject;f.active_msg=g;f.modal_task=false;f.$task_modal.modal()};f.defer_modal=function(h){var g;g=new Date();f.active_msg=h;f.$defer_modal.modal();f.$defer_modal.find(".datepicker").datepicker({format:"yyyy-mm-dd",todayBtn:true,todayHighlight:true,startDate:g,})};f.delete_modal=function(g){f.active_msg=g;f.$delete_modal.modal()};f.archive_msg=function(g){g.archive(f.new_node)};f.change_project=function(g){f.parents=b.query({tree_id:g.tree_id,archived:false});f.parent=g};f.change_parent=function(g){f.new_node.parent=g.id};f.create_node=function(){f.$task_modal.modal("hide").one("hidden.bs.modal",function(){console.log(f.new_node);f.active_msg.create_node(f.new_node)})};f.defer_msg=function(){f.new_node.target_date=f.$defer_modal.find("#target-date").val();f.$defer_modal.modal("hide").one("hidden.bs.modal",function(){f.active_msg.defer(f.new_node)})};f.delete_node=function(){f.$delete_modal.modal("hide").one("hidden.bs.modal",function(){f.active_msg.delete_msg(f.new_node)})}}return{link:a,templateUrl:"/static/message-modals.html"}}]);"use strict";owFilters.filter("format_sender",["$sce",function(a){return function(c){var b;if(c.fields.handler_path==="plugins.deferred"){b="";b+='<span class="dfrd">DFRD</span> Node';b=a.trustAsHtml(b)}else{if(c.fields.handler_path==="plugins.quickcapture"){b="Quick capture"}else{b=c.fields.sender}}return b}}]);owFilters.filter("format_subject",["$sce",function(a){return function(c){var b;b="";if(c.fields.handler_path==="plugins.deferred"){b='<a href="/gtd/project/#';b+=c.fields.source_node+"-";b+=c.fields.node_slug+'">';b+=c.fields.subject;b+="</a>";b=a.trustAsHtml(b)}else{if(c.fields.handler_path==="plugins.quickcapture"){b=c.fields.subject}else{b='<a href="/wolfmail/inbox/'+c.pk+'/">';b+=c.fields.subject;b+="</a>"}}return b}}]);owFilters.filter("format_date",function(){return function(a){var b;b=new Date(a);return b.toDateString()}});owFilters.filter("parent_label",function(){return function(c){var b,a;b=c.title;for(a=0;a<c.level;a+=1){if(a===0){b=" "+b}b="---"+b}return b}});"use strict";var MessageFactory,owinbox,owmessage;owMain.config(["$routeProvider","$locationProvider",function(b,a){a.html5Mode(true);b.when("/wolfmail/inbox/",{templateUrl:"/static/inbox.html",controller:"owInbox"}).when("/wolfmail/inbox/:msg_id/",{templateUrl:"/static/message.html",controller:"owMessage"})}]);owMain.controller("owInbox",["$scope","$rootScope","$resource","MessageAPI","Heading","owWaitIndicator",owinbox]);function owinbox(h,e,i,d,b,g){var a,c,f;$(".ow-active").removeClass("active");$("#nav-inbox").addClass("active");h.currentDate=new Date();h.$watch("currentDate",function(k,j){h.$emit("refresh_messages")},true);h.get_messages=function(j){g.start_wait("medium","get-messages");h.messages=d.query({in_inbox:true,rcvd_date__lte:h.currentDate.ow_date(),});h.messages.$promise["finally"](function(){g.end_wait("get-messages")});h.messages.$promise["catch"](function(){h.notify("Could not get messages. Check your internet connection and try again","danger")})};e.$on("refresh_messages",h.get_messages);h.$emit("refresh_messages");h.projects=b.query({parent_id:0,archived:false});h.success=function(j){h.messages.remove(j)}}owMain.controller("owMessage",["$scope","$routeParams","$location","MessageAPI",owmessage]);function owmessage(a,d,f,c){var e,b;b=d.msg_id;a.msg=c.get({id:b});a.success=function(g){f.path("/wolfmail/inbox")}}owMain.directive("owFeedback",function(){function a(f,e,d){var b,c;b=$(e);c=b.find("#feedbackModal");f.feedback={};f.send_feedback=function(g){$.ajax("/feedback/",{type:"POST",data:{body:g.text},success:function(){f.$apply(function(){f.success=true;setTimeout(function(){f.$apply(function(){f.success=false;f.feedback={};c.modal("hide")})},1200)})},error:function(i,j,h){console.log(h)}})}}return{link:a,templateUrl:"/static/feedback-modal.html"}});"use strict";$(document).ready(function(){var b,a;a=$(".persona-button");a.bind("click.persona",function(c){navigator.id.request();$(this).attr("data-loading-text","Loading...")});$("#logout").bind("click.persona",function(c){navigator.id.logout()});navigator.id.watch({loggedInUser:persona_user,onlogin:function(c){ow_waiting("spinner");$.ajax({type:"POST",url:"/accounts/login/persona/",data:{assertion:c},success:function(e,d,f){window.location.href=e.next},error:function(f,d,e){navigator.id.logout();alert("Login failure: "+e)}})},onlogout:function(){ow_waiting("spinner");$.ajax({type:"POST",url:"/accounts/logout/persona/",success:function(d,c,e){location.reload()},error:function(e,c,d){alert("Logout failure: "+d)},complete:function(d,c){ow_waiting("clear")}})}})});