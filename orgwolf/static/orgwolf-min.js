/*!
 * jQuery Cookie Plugin v1.3
 * https://github.com/carhartl/jquery-cookie
 *
 * Copyright 2011, Klaus Hartl
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * http://www.opensource.org/licenses/mit-license.php
 * http://www.opensource.org/licenses/GPL-2.0
 */
(function(f,b,g){var a=/\+/g;function e(h){return h}function c(h){return decodeURIComponent(h.replace(a," "))}var d=f.cookie=function(p,o,u){if(o!==g){u=f.extend({},d.defaults,u);if(o===null){u.expires=-1}if(typeof u.expires==="number"){var q=u.expires,s=u.expires=new Date();s.setDate(s.getDate()+q)}o=d.json?JSON.stringify(o):String(o);return(b.cookie=[encodeURIComponent(p),"=",d.raw?o:encodeURIComponent(o),u.expires?"; expires="+u.expires.toUTCString():"",u.path?"; path="+u.path:"",u.domain?"; domain="+u.domain:"",u.secure?"; secure":""].join(""))}var h=d.raw?e:c;var r=b.cookie.split("; ");for(var n=0,k=r.length;n<k;n++){var m=r[n].split("=");if(h(m.shift())===p){var j=h(m.join("="));return d.json?JSON.parse(j):j}}return null};d.defaults={};f.removeCookie=function(i,h){if(f.cookie(i)!==null){f.cookie(i,null,h);return true}return false}})(jQuery,document);"use strict";Array.prototype.order_by=function(g){var a,b,e,c,d,f;d=["opened","closed","scheduled_date","deadline_date"];a=/^(-)?(\S*)$/.exec(g);c=a[2];b=this.slice(0);if(a[1]==="-"){f=-1}else{f=1}e=function(i,h){var n,k,m,l,j;if(typeof i.fields==="undefined"||typeof h.fields==="undefined"){n=i[c];k=h[c]}else{if(i.fields.hasOwnProperty(c)&&h.fields.hasOwnProperty(c)){n=i.fields[c];k=h.fields[c]}else{n=i[c];k=h[c]}}m=Number(n);l=Number(k);if(i.pk===0){j=-1;f=1}else{if(h.pk===0){j=1;f=1}else{if(d.indexOf(c)>-1){j=new Date(n)-new Date(k)}else{if(m&&l){j=m-l}else{n=n.toUpperCase();k=k.toUpperCase();if(n<k){j=-1}else{if(n>k){j=1}else{j=0}}}}}}return j*f};b.sort(e);return b};Date.prototype.ow_date=function(){var a;a=this.getFullYear()+"-"+(this.getMonth()+1)+"-"+this.getDate();a=this.toISOString().slice(0,10);return a};"use strict";var HeadingFactory;var owServices=angular.module("owServices",["ngResource"]);owServices.value("personaUser",null);owServices.factory("personaNavigator",["personaUser","owWaitIndicator",function(b,a){if(typeof navigator.id!=="undefined"){navigator.id.watch({loggedInUser:b,onlogin:function(c){a.start_wait("medium","persona");jQuery.ajax({type:"POST",url:"/accounts/login/persona/",data:{assertion:c},success:function(e,d,f){a.end_wait("medium","persona");window.location.reload()},error:function(f,d,e){navigator.id.logout();alert("Login failure: "+e)},})},onlogout:function(){a.start_wait("medium","persona");jQuery.ajax({type:"POST",url:"/accounts/logout/persona/",success:function(d,c,e){window.location.reload()},error:function(e,c,d){alert("Logout failure: "+d)},complete:function(){a.start_wait("medium","persona")}})}})}return navigator}]);owServices.factory("owWaitIndicator",["$rootScope",function(a){var c,b;c={waitLists:{quick:[],medium:[],},start_wait:function(e,d){c.waitLists[e].push(d)},end_wait:function(f,e){var d,g;d=c.waitLists[f];if(d===undefined){e=f;d=[c.waitLists.quick,c.waitLists.medium]}else{d=[d]}for(g=0;g<d.length;g+=1){b(d[g],e)}},};b=function(f,d){var e;e=f.indexOf(d);while(e>-1){f.splice(e,1);e=f.indexOf(d)}};return c}]);owServices.factory("OldHeading",["$resource","$http",function(a,b){return function(c){return new GtdHeading(c)}}]);owServices.factory("Heading",["$resource",HeadingFactory]);function HeadingFactory(b){var a=b("/gtd/nodes/:id/",{id:"@id"},{update:{method:"PUT"},create:{method:"POST"},});return a}owServices.value("todoStatesList",[{id:1,color:{red:0,green:0,blue:0,alpha:0,},abbreviation:"NEXT",},{id:2,color:{red:0,green:0,blue:0,alpha:0,}},]);owServices.factory("todoStates",["$resource","todoStatesList",function(d,c){var b,a;a=d("/gtd/todostate/");b=a.query();b=c;b.getState=function(g){var e,f;f=this.filter(function(h){return h.id===g});if(f.length>0){e=f[0]}else{e=null}return e};return b}]);owServices.factory("notifyList",[function(){var a=[];return a}]);owServices.value("notifyTimeout",4000);owServices.factory("notify",["notifyList","notifyTimeout","$timeout",function(d,e,c){function b(){d.splice(0,1)}function a(g,f){if(typeof f==="undefined"){f="info"}d.push({msg:g,cls:f});c(b,e)}return a}]);"use strict";var owDirectives=angular.module("owDirectives",["ngAnimate","ngResource","owServices"]);owDirectives.directive("personaButton",["personaNavigator","personaUser",function(a,c){function b(f,e,d){e.on("click",function(){if(d.personaButton==="login"){a.id.request()}else{a.id.logout()}})}return{restrict:"AC",link:b}}]);owDirectives.directive("owSwitch",function(){function a(c,b,e,d){var g;g=b.find("input");function f(h){g.bootstrapSwitch("setState",h)}d.$formatters.push(f);g.on("switch-change",function(i,h){if(h.value!==d.$modelValue){c.$apply(function(){d.$setViewValue(h.value)})}});g.bootstrapSwitch()}return{link:a,require:"?ngModel",}});owDirectives.directive("owWaitFeedback",["owWaitIndicator",function(b){function a(d,c,e){var f;f=c.find(".mask");f.hide();c.hide();d.$watchCollection(function(){return b.waitLists.quick.length},function(g){if(g>0){c.show()}else{c.hide()}});d.$watchCollection(function(){return b.waitLists.medium.length},function(g){if(g>0){c.show();f.show()}else{c.hide();f.hide()}})}return{link:a,scope:{},}}]);owDirectives.directive("owCurrentDate",function(){function a(c,b,d){var f;f=b.find("input");c.isEditable=false;function e(g){c.dateString=g.toDateString();c.dateModel=g.ow_date();return g}c.$watch("currentDate",function(g){return e(g)},true);f.on("blur",function(){c.$apply(function(){var g;c.isEditable=false;g=new Date(c.dateModel);if(isNaN(g)){e(c.currentDate)}else{c.currentDate.setDate(g.getUTCDate());c.currentDate.setMonth(g.getUTCMonth());c.currentDate.setYear(g.getUTCFullYear())}})})}return{link:a,templateUrl:"/static/current-date.html",scope:true,}});owDirectives.directive("owDetails",["$timeout","$rootScope",function(b,a){function c(g,f,d){var e;g.editorId="edit-text-"+g.heading.id;g.heading.$get().then(function(h){var j,i;g.headingText=h.text;g.focusAreas=[];i=function(k){return k.id===h.scope[e]};for(e=0;e<h.scope.length;e+=1){j=a.scopes.filter(i)[0].display;g.focusAreas.push(j)}});b(function(){if(typeof tinymce!=="undefined"){tinymce.init({plugins:"charmap fullscreen hr image link table textcolor",toolbar:"undo redo | fullscreen | styleselect | bold italic forecolor backcolor superscript subscript | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | hr link image",inline:true,tools:"inserttable",mode:"exact",elements:g.editorId,setup:function(h){h.on("change",function(i){g.$apply(function(){g.heading.text=h.getContent();g.heading.$update()})})}})}});g.editText=function(h){h.stopPropagation();g.textIsEditable=true;g.textEditStatus=""};g.stopEditingText=function(){g.textIsEditable=false;if(typeof tinymce!=="undefined"){tinymce.remove("#"+g.editorId)}}}return{link:c,scope:{heading:"=owHeading"},templateUrl:"/static/details.html"}}]);owDirectives.directive("owEditable",["$resource","$rootScope","$timeout","owWaitIndicator","Heading","todoStates","notify",function(d,a,c,g,f,h,b){function e(p,j,o){var r,m,q,k,l,n,i;p.scopes=a.scopes;p.todoStates=h;p.fields={};j.addClass("ow-editable");if(p.heading){g.start_wait("quick","editable");p.fields=f.get({id:p.heading.id});p.fields.$promise.then(function(){g.end_wait("editable")})}else{if(p.parent){p.fields.scope=p.parent.scope;p.fields.priority=p.parent.priority;p.fields.parent=p.parent.id}else{p.fields.scope=[];p.fields.priority="B"}}p.priorities=[{sym:"A",display:"A - high"},{sym:"B",display:"B - medium (default)"},{sym:"C",display:"C - low"}];p.time_units=[{value:"d",label:"Days"},{value:"w",label:"Weeks"},{value:"m",label:"Months"},{value:"y",label:"Years"},];p.repeat_schemes=[{value:false,label:"scheduled date"},{value:true,label:"completion date"},];m=j.find(".edit-text");k=j.find("#edit-save");$("html").animate({scrollTop:j.offset().top-27},"500");j.find("#title").focus();p.save=function(t){var s;if(p.heading){s=f.update(p.fields)}else{s=f.create(p.fields)}s.$promise.then(function(u){b("Saved","success");p.$emit("finishEdit",s)})["catch"](function(u){b("<strong>Not saved!</strong> Check your internet connection and try again.","danger");console.log("Save failed:");console.log(u)})};p.cancelEdit=function(s){p.$emit("finishEdit")}}return{link:e,scope:{heading:"=owHeading",parent:"=owParent",},require:"?ngModel",templateUrl:"/static/editable.html"}}]);owDirectives.directive("owScopeTabs",["$resource","$rootScope","$timeout",function(c,a,b){function d(h,g,f){var e={id:0,display:"All"};h.owScopes=[e].concat(a.scopes);h.activeScope=e;b(function(){g.find("#scope-tab-0").addClass("active")});h.changeScope=function(j){var i;g.find("#scope-tab-"+h.activeScope.id).removeClass("active");h.activeScope=j;g.find("#scope-tab-"+h.activeScope.id).addClass("active");i=j.id?j:null;h.$emit("scope-changed",i)}}return{link:d,scope:{},templateUrl:"/static/scope-tabs.html"}}]);owDirectives.directive("owTodo",["$rootScope","$filter","todoStates","notify",function(a,e,f,b){function c(q,j,p){var k,n,h,l,g,m,r,o;j.addClass("todo-state-widget");q.todoState=f.getState(q.heading.todo_state);q.todoStateId=q.heading.todo_state;q.$watch("todoStateId",function(s,t){if(s!==q.heading.todo_state){var i;q.heading.todo_state=parseInt(s,10);q.todoState=f.getState(q.heading.todo_state);q.heading.auto_update=true;i=q.heading.scheduled_date;q.heading.$update().then(function(v){if(v.scheduled_date!==i){var u="Rescheduled for ";u+=v.scheduled_date;b(u,"info")}})["catch"](function(u){b("<strong>Not saved!</strong> Check your internet connection and try again.","danger");console.log("Save failed:");console.log(u)})}});q.$watch(function(){return q.heading.todo_state},function(i){if(i!==q.todoStateId){q.todoState=f.getState(q.heading.todo_state);q.todoStateId=i}if(q.todoState){j.tooltip({delay:{show:1000,hide:100},title:q.todoState.display_text,})}})}function d(n,k){var j,l,m,g;j=n.find("select");for(l=0;l<f.length;l+=1){g=f[l];m='<option value="'+g.id+'" ';m+='style="'+e("todoStateStyle")(g)+'">';m+=g.abbreviation+"</option>";j.append(m)}return c}return{compile:d,scope:{heading:"=owHeading"},templateUrl:"/static/todo-state-selector.html",}}]);owDirectives.directive("owTwisty",["$compile","$rootScope","Heading",function(b,a,d){function c(j,h,g){var i,f;j.isEditing=false;j.loadedChildren=false;j.state=0;h.addClass("state-"+j.state);j.showArchived=a.showArchived;if(a.todoStates){j.todoStates=a.todoStates}else{j.todoStates=[]}if(j.todoState&&j.todoState.actionable){h.find(".ow-hoverable").addClass("actionable")}j.$on("toggle-archived",function(l,k){j.showArchived=k});if(j.heading.level===0){h.find(".ow-hoverable").addClass("project")}h.addClass("heading");i=h.children(".ow-hoverable");j.tags=j.heading.tag_string.slice(1,-1).split(":");j.$watch("heading.rght - heading.lft",function(k){if(k>1){i.removeClass("leaf-node")}else{i.addClass("leaf-node")}});j.getChildren=function(){if(!j.loadedChildren){j.children=d.query({parent_id:j.heading.id,field_group:"outline"});j.children.$promise.then(function(k){j.numArchived=k.filter(function(l){return l.archived===true}).length;j.loadedChildren=true})}};j.$on("open-descendants",function(k){if(k.targetScope!==k.currentScope){j.toggleHeading(1)}});if(j.heading.level>0){j.getChildren()}j.toggleHeading=function(k){h.removeClass("state-"+j.state);if(/^\d+$/.test(k)){j.state=k%3}else{if($(k.target).is(":not(.non-opening)")){j.state=(j.state+1)%3}}h.addClass("state-"+j.state);if(j.state>0){j.getChildren()}if(j.state===2){j.$broadcast("open-descendants")}};j.edit=function(l){var k;l.stopPropagation();j.isEditing=true;k=j.$on("finishEdit",function(n,m){j.isEditing=false;n.stopPropagation();if(m){angular.extend(j.heading,m);if(j.heading.todo_state){j.todoState=j.todoStates.filter(function(o){return o.id===j.heading.todo_state})[0]}else{j.todoState=null}}k()})};j.createChild=function(l){var k;l.stopPropagation();if(j.state===0){j.toggleHeading(1)}j.newChild=true;k=j.$on("finishEdit",function(n,m){j.newChild=false;n.stopPropagation();if(m){j.children.push(m)}k()})};j.archive=function(k){k.stopPropagation();j.heading.archived=!j.heading.archived;j.heading.$update()}}function e(h,f){var g,i;i=h.contents().remove();return function(k,l,j){if(!g){g=b(i)}g(k,function(n,m){l.append(n);c(m,l,j)})}}return{compile:e,templateUrl:"/static/outline-twisty.html",scope:{heading:"=owHeading",},}}]);owDirectives.directive("owListRow",["$rootScope","todoStates","$filter",function(a,d,c){function b(i,h,g){var f,e;e=$(h);h.addClass("heading-row");h.addClass("priority"+(i.heading.priority||"B"));i.todoState=d.getState(i.heading.todo_state);i.$watch(function(){return i.heading.deadline_date},function(n){var k,m,j,l;m=null;if(n){j=new Date();l=new Date(n);i.owDate=c("deadline_str")(n);m=l-j}h.removeClass("overdue");h.removeClass("upcoming");if(m===null){k=""}else{if(m<=0){k="overdue"}else{if(7*86400000>m>0){k="upcoming"}}}h.addClass(k)});i.$watch("heading.fields.archived",function(j){if(j){h.addClass("archived")}});i.$watch("heading.fields.priority",function(j,k){if(k){h.removeClass("priority-"+k)}if(j){h.addClass("priority-"+j)}});i.edit=function(){var j;i.isEditable=true;j=i.$on("finishEdit",function(k){i.isEditable=false;j()})};i.$on("finishEdit",function(k,j){k.stopPropagation();angular.extend(i.heading,j)})}return{link:b,scope:{heading:"=owHeading",},templateUrl:"/static/actions-list-row.html",}}]);"use strict";var owFilters=angular.module("owFilters",["ngSanitize"]);owFilters.filter("is_target",function(){return function(c,b){var a="";if(b){if(c.pk===b.id){a="yes"}else{if(c.fields.tree_id===b.tree_id&&c.fields.lft<b.lft&&c.fields.rght>b.rght){a="ancestor"}}}return a}});owFilters.filter("todoStateStyle",function(){return function(b){var a,d;a="";if(b===null||b===undefined){a=null}else{d=b.color;a+="color: rgba("+d.red+", "+d.green+", ";a+=d.blue+", "+d.alpha+"); "}return a}});owFilters.filter("headingStyle",function(){return function(d){var c,a,b;c="";if(d.level>0){a=["rgb(80, 0, 0)","rgb(0, 44, 19)","teal","slateblue","brown"];b=(d.level)%a.length;c+="color: "+a[b-1]+"; "}return c}});owFilters.filter("asHtml",["$sce",function(a){return function(c){var b=a.trustAsHtml(c);return b}}]);owFilters.filter("order",["$sce",function(a){return function(f,e){var c,d,b;if(e==="list"){b=f.filter(function(g){return g.deadline_date===null});d=$(f).not(b).get().order_by("deadline_date");c=d;c=c.concat(b.order_by("priority"))}else{if(e==="none"){c=f}else{c=f.order_by(e)}}return c}}]);owFilters.filter("currentList",function(){return function(c,d,a){var b;if(d){c=c.filter(function(e){return d.indexOf(e.todo_state)>-1})}if(a){b=a.map(function(e){return e.id});c=c.filter(function(e){return b.indexOf(e.id)===-1})}return c}});owFilters.filter("currentScope",function(){return function(b,a){if(a){b=b.filter(function(c){return c.scope.indexOf(a.id)>-1})}return b}});owFilters.filter("deadline_str",["$sce",function(a){return function(d,b){var f,c,e,g;if(typeof b==="undefined"){b=new Date()}f="";if(d){f="Due ";c=new Date(d+"T12:00:00");b.setHours(12,0,0,0);e=c.getTime()-b.getTime();g=Math.ceil(e/(1000*3600*24));if(g===0){f+="today"}else{if(g===-1){f+="yesterday"}else{if(g<0){f+=Math.abs(g)+" days ago"}else{if(g===1){f+="tomorrow"}else{if(g>0){f+="in "+g+" days"}}}}}}return f}}]);owFilters.filter("scope",function(){return function(d,a){var b,c;if(a){c=[];for(b=0;b<d.length;b+=1){if(d[b].scope.indexOf(a)>-1){c.push(d.slice(b,b+1)[0])}}}else{c=d.slice(0)}return c}});"use strict";var test_headings,owConfig,HeadingFactory,outlineCtrl,listCtrl;var owMain=angular.module("owMain",["ngAnimate","ngResource","ngSanitize","ngRoute","owServices","owDirectives","owFilters"]);owMain.config(["$routeProvider","$locationProvider",function(b,a){a.html5Mode(true);b.when("/gtd/actions/:context_id?/:context_slug?",{templateUrl:"/static/actions-list.html",controller:"nextActionsList",}).when("/gtd/project/",{templateUrl:"/static/project-outline.html",controller:"nodeOutline"}).when("/",{redirectTo:"/gtd/project/"})}]);owMain.config(["$httpProvider","$locationProvider",owConfig]);function owConfig(d,b){d.defaults.headers.common["X-Request-With"]="XMLHttpRequest";d.defaults.xsrfCookieName="csrftoken";d.defaults.xsrfHeaderName="X-CSRFToken";function a(e){var j,h,g,f;j=null;if(document.cookie&&document.cookie!==""){h=document.cookie.split(";");for(g=0;g<h.length;g+=1){f=jQuery.trim(h[g]);if(f.substring(0,e.length+1)===(e+"=")){j=decodeURIComponent(f.substring(e.length+1));break}}}return j}var c=a("csrftoken");$.ajaxSetup({beforeSend:function(e){e.setRequestHeader("X-CSRFToken",c)}})}owMain.run(["$rootScope","$resource",function(c,f){var b,e,a,d;e=f("/gtd/context/");c.contexts=e.query();a=f("/gtd/scope/");c.scopes=a.query()}]);owMain.controller("owNotifications",["$scope","notifyList",function(a,b){a.notifyList=b}]);owMain.run(["$rootScope","$location",function(a,b){a.$on("$routeChangeSuccess",function(){if(typeof ga!=="undefined"){ga("send","pageview",{page:b.path()})}})}]);owMain.controller("inboxCapture",["$scope","$rootScope","owWaitIndicator",function(b,a,c){b.capture=function(f){var g,d,h;d={handler_path:"plugins.quickcapture"};h=$(f.target).find("#new_inbox_item");d.subject=h.val();c.start_wait("medium","quickcapture");$.ajax("/wolfmail/message/",{type:"POST",data:d,complete:function(){b.$apply(function(){c.end_wait("quickcapture")})},success:function(){h.val("");a.$emit("refresh_messages")},error:function(j,e,i){alert("Failed!");console.log(e);console.log(i)}})}}]);owMain.controller("nodeOutline",["$scope","$rootScope","$http","$resource","$filter","Heading","$location","$anchorScroll","owWaitIndicator",outlineCtrl]);function outlineCtrl(p,j,u,i,o,r,g,e,l){var k,f,d,n,h,s,b,c,m,q,v,a,t;$(".ow-active").removeClass("active");$("#nav-projects").addClass("active");a=$("#add-heading");t=$("#show-all");q=g.hash().split("-")[0];if(q){p.target_heading=r.get({id:q})}p.children=r.query({parent_id:0,archived:false,field_group:"outline"});p.activeScope=null;p.sortField="title";p.sortFields=[{key:"title",display:"Title"},{key:"-title",display:"Title (reverse)"},{key:"-opened",display:"Creation date"},{key:"opened",display:"Creation date (oldest first)"},];if(p.parent_id===""){p.parent_id=0}else{p.parent_id=parseInt(p.parent_id,10)}j.showArchived=false;if(p.parent_id){m=r.query({tree_id:b,level__lte:c+1});p.headings.add(m);m.$promise.then(function(){var x,w;x=p.headings.get({pk:p.parent_id});w=function(z){var y;z.toggle("open");z.update();y=z.get_parent();if(y.rank!==0){w(y)}};if(x.fields.archived){j.showArchived=true}w(x);x.editable=true})}p.showAll=function(x){var w;j.showArchived=!j.showArchived;t.toggleClass("active");if(!p.arx_cached){w=r.query({parent_id:0,archived:true});w.$promise.then(function(){p.children=p.children.concat(w)});p.arx_cached=true}p.$broadcast("toggle-archived",j.showArchived)};p.addProject=function(x){var w;p.newProject=!p.newProject;a.toggleClass("active");w=p.$on("finishEdit",function(z,y){z.stopPropagation();p.newProject=false;a.removeClass("active");if(y){p.sortFields.unshift({key:"none",display:"None"});p.children=o("order")(p.children,p.sortField);p.sortField="none";p.children.unshift(y)}w()})};p.$on("scope-changed",function(x,w){p.activeScope=w})}owMain.controller("nextActionsList",["$sce","$scope","$resource","$location","$routeParams","$filter","Heading","todoStates",listCtrl]);function listCtrl(m,p,q,f,o,k,l,c){var e,g,n,j,d,b,h,a;$(".ow-active").removeClass("active");$("#nav-actions").addClass("active");p.list_params={};p.showArchived=true;p.activeScope=null;if(typeof o.context_id!=="undefined"){p.activeContext=parseInt(o.context_id,10);p.contextName=o.context_slug;p.list_params.context=p.activeContext}else{p.activeContext=null}p.show_list=true;h=f.search().parent;if(h){h=parseInt(h,10);p.parent_id=h;p.list_params.parent=h;p.parent=q("/gtd/node/:id/").get({id:h})}a=f.search().todo_state;if(a){if(!Array.isArray(a)){a=[a]}a=a.map(function(i){return parseInt(i,10)})}else{a=[2]}p.cachedStates=a.slice(0);p.activeStates=a.slice(0);p.list_params.todo_state=p.activeStates;p.currentDate=new Date();p.$watch("currentDate",function(){p.$emit("refresh_list")},true);p.todoStates=c;p.setVisibleHeadings=function(){var i=k("currentList");p.visibleHeadings=p.upcomingList.slice(0);p.visibleHeadings=p.visibleHeadings.concat(i(p.actionsList,p.activeStates,p.upcomingList))};p.$watchCollection("actionsList",function(){p.setVisibleHeadings()});p.$watchCollection("upcomingList",function(){p.setVisibleHeadings()});p.$on("refresh_list",function(){var i;p.actionsList=l.query(p.list_params);i=angular.extend({upcoming:p.currentDate.ow_date()},p.list_params);p.upcomingList=l.query(i);p.scheduledList=l.query({field_group:"actions_list",scheduled_date__lte:p.currentDate.ow_date(),todo_state:8})});p.$on("scope-changed",function(r,i){p.activeScope=i});p.toggleTodoState=function(s){var r=p.activeStates.indexOf(s.id);if(r>-1){p.activeStates.splice(r,1)}else{p.activeStates.push(s.id)}p.setVisibleHeadings()};p.$watchCollection("activeStates",function(r,t){var i,s;s={};s.todo_state=r.filter(function(u){return p.cachedStates.indexOf(u)===-1});if(s.todo_state.length>0){i=l.query(s);i.$promise.then(function(){p.cachedStates=p.cachedStates.concat(s.todo_state);p.actionsList=p.actionsList.concat(i)})}});d=function(s){var r,i;r="/gtd/actions";if(s.activeContext){r+="/"+s.activeContext;r+="/"+s.contextName.toLowerCase().replace(/ /g,"-").replace(/[^\w\-]+/g,"")}f.path(r);i={};if(p.parent_id){i.parent=p.parent_id}i.todo_state=p.activeStates;f.search(i)};p.changeContext=function(t){var i,s,r,u;p.list_params.context=p.activeContext||0;if(p.activeContext){p.contextName=p.contexts.filter(function(v){return v.id===p.activeContext})[0].name}else{delete p.contextName}p.list_params.todo_state=p.activeStates;p.$emit("refresh_list");d(p);i=$("#nav-actions");s=i.find(".nav-text");r=i.find("a");u=p.contexts.filter(function(v){return v.id===p.activeContext});if(u.length===1){s.text(u[0].name+" Actions")}else{s.text("Next Actions")}r.attr("href",f.absUrl());console.log(f.absUrl())};p.filter_parent=function(i){if(i===null){delete p.parent_id}else{p.parent_id=i.root_id}d(p)}}"use strict";var Message;Message=function(a){if(a===undefined){a={}}this.fields={};this.set_fields(a)};Message.prototype.set_fields=function(a){$.extend(this.fields,a);this.pk=a.id;this.url="/wolfmail/message/"+this.pk+"/"};Message.prototype.create_node=function(d){var b,e,c,a;b=this;c={action:"create_node"};$.extend(c,d);delete c.$scope;jQuery.ajax(this.url,{type:"PUT",data:c,success:function(){d.$scope.$apply(d.$scope.success(b))},})};Message.prototype.delete_msg=function(b){var c,a;a=this;jQuery.ajax(this.url,{type:"DELETE",data:{action:"delete"},success:function(){b.$scope.$apply(b.$scope.success(a))}})};Message.prototype.archive=function(b){var c,a;a=this;jQuery.ajax(this.url,{type:"PUT",data:{action:"archive"},success:function(){b.$scope.$apply(b.$scope.success(a))}})};Message.prototype.defer=function(b){var c,a;a=this;jQuery.ajax(this.url,{type:"PUT",data:{action:"defer",target_date:b.target_date},success:function(){b.$scope.$apply(b.$scope.success(a))}})};"use strict";var MessageFactory;owServices.factory("Message",["$resource","$rootScope",MessageFactory]);function MessageFactory(c,a){var b=c("/wolfmail/message/:id",{id:"@id"},{archive:{method:"PUT",params:{action:"archive"},transformResponse:function(d){d=angular.fromJson(d);a.$broadcast("message-archived",d.message);return d.message}},createNode:{method:"POST",params:{action:"create_heading"},transformResponse:function(d){d=angular.fromJson(d);a.$broadcast("heading-created",d.message,d.heading);return d.message}},defer:{method:"PUT",params:{action:"defer"},transformResponse:function(d){d=angular.fromJson(d);a.$broadcast("message-deferred",d.message);return d.message}},});return b}"use strict";owDirectives.directive("owMessageRow",function(){function a(i,b,g){var h,j,c,k,d,f,e;h=$(b);h.find(".glyphicon").tooltip();i.headings=[];j=h.find(".msg-task");c=h.find(".msg-project");k=h.find(".msg-complete");d=h.find(".msg-defer");f=h.find(".msg-archive");e=h.find(".msg-delete");if(g.owHandler==="plugins.deferred"){c.remove();f.remove();e.remove()}else{k.remove()}i.$on("heading-created",function(n,m,l){if(i.message.id===m.id){i.headings.push(l)}})}return{scope:true,link:a,}});owDirectives.directive("owMessageHeading",["todoStates",function(b){function a(e,d,c){e.isEditable=false;e.$on("finishEdit",function(){e.isEditable=false});e.$watch("heading.todo_state",function(f){if(f){e.todoState=b.filter(function(g){return g.id===f})[0]}else{e.todoState=null}})}return{scope:false,link:a,}}]);owDirectives.directive("owMsgActions",["Heading",function(b){function a(g,f,e){var c,d;c=$(f);g.$task_modal=c.find(".modal.task");g.$delete_modal=c.find(".modal.delete");g.$defer_modal=c.find(".modal.defer");if(g.new_node===undefined){g.new_node={}}g.create_task_modal=function(h){g.new_node.title=h.subject;if(h.handler_path==="plugins.deferred"){h.$createNode()}else{g.active_msg=h;g.modal_task=true;g.$task_modal.modal()}};g.open_task_modal=function(h){g.new_node.close=false;g.create_task_modal(h)};g.completeTask=function(h){h.$createNode({close:true})};g.create_project_modal=function(h){delete g.new_node.tree_id;delete g.new_node.parent;g.new_node.title=h.subject;g.active_msg=h;g.modal_task=false;g.$task_modal.modal()};g.defer_modal=function(i){var h;h=new Date();g.active_msg=i;g.$defer_modal.modal()};g.delete_modal=function(h){g.active_msg=h;g.$delete_modal.modal()};g.archive=function(h){h.$archive()};g.createNode=function(h){g.$task_modal.modal("hide").one("hidden.bs.modal",function(){h.$createNode(g.new_node)})};g.change_project=function(h){g.parents=b.query({tree_id:h.tree_id,archived:false});g.parent=h};g.change_parent=function(h){g.new_node.parent=h.id};g.deferMessage=function(){g.new_node.target_date=g.$defer_modal.find("#target-date").val();g.$defer_modal.modal("hide").one("hidden.bs.modal",function(){g.active_msg.$defer({target_date:g.newDate})})};g.delete_node=function(){g.$delete_modal.modal("hide").one("hidden.bs.modal",function(){g.active_msg.$delete().then(function(){g.messages.splice(g.messages.indexOf(g.active_msg),1)})})}}return{link:a,scope:false,templateUrl:"/static/message-modals.html"}}]);"use strict";owFilters.filter("format_sender",["$sce",function(a){return function(c){var b;if(c.handler_path==="plugins.deferred"){b="";b+='<span class="dfrd">DFRD</span> Node';b=a.trustAsHtml(b)}else{if(c.handler_path==="plugins.quickcapture"){b="Quick capture"}else{b=c.sender}}return b}}]);owFilters.filter("format_subject",["$sce",function(a){return function(c){var b;b="";if(c.handler_path==="plugins.deferred"){b='<a href="/gtd/project/#';b+=c.source_node+"-";b+=c.node_slug+'">';b+=c.subject;b+="</a>";b=a.trustAsHtml(b)}else{if(c.handler_path==="plugins.quickcapture"){b=c.subject}else{b='<a href="/wolfmail/inbox/'+c.id+'/">';b+=c.subject;b+="</a>"}}return b}}]);owFilters.filter("format_date",function(){return function(a){var b;b=new Date(a);return b.toDateString()}});owFilters.filter("parent_label",function(){return function(c){var b,a;b=c.title;for(a=0;a<c.level;a+=1){if(a===0){b=" "+b}b="---"+b}return b}});"use strict";var MessageFactory,owinbox,owmessage;owMain.config(["$routeProvider","$locationProvider",function(b,a){a.html5Mode(true);b.when("/wolfmail/inbox/",{templateUrl:"/static/inbox.html",controller:"owInbox"}).when("/wolfmail/inbox/:msg_id/",{templateUrl:"/static/message.html",controller:"owMessage"})}]);owMain.controller("owInbox",["$scope","$rootScope","$resource","Message","Heading","owWaitIndicator",owinbox]);function owinbox(i,f,j,d,c,h){var a,e,g;$(".ow-active").removeClass("active");$("#nav-inbox").addClass("active");i.currentDate=new Date();i.$watch("currentDate",function(l,k){i.$emit("refresh_messages")},true);i.get_messages=function(k){h.start_wait("medium","get-messages");i.messages=d.query({in_inbox:true,rcvd_date__lte:i.currentDate.ow_date(),});i.messages.$promise["finally"](function(){h.end_wait("get-messages")});i.messages.$promise["catch"](function(){i.notify("Could not get messages. Check your internet connection and try again","danger")})};f.$on("refresh_messages",i.get_messages);i.$emit("refresh_messages");function b(l){var k=i.messages.map(function(m){return m.id}).indexOf(l.id);i.messages.splice(k,1)}i.$on("message-archived",function(l,k){b(k)});i.$on("message-deferred",function(l,k){b(k)});i.$on("heading-created",function(l,k){if(!k.in_inbox){b(k)}});i.projects=c.query({parent_id:0,archived:false});i.success=function(k){i.messages.remove(k)}}owMain.controller("owMessage",["$scope","$routeParams","$location","Message",owmessage]);function owmessage(a,d,f,c){var e,b;b=d.msg_id;a.msg=c.get({id:b});a.success=function(g){f.path("/wolfmail/inbox")}}owMain.directive("owFeedback",function(){function a(f,e,d){var b,c;b=$(e);c=b.find("#feedbackModal");f.feedback={};f.send_feedback=function(g){$.ajax("/feedback/",{type:"POST",data:{body:g.text},success:function(){f.$apply(function(){f.success=true;setTimeout(function(){f.$apply(function(){f.success=false;f.feedback={};c.modal("hide")})},1200)})},error:function(i,j,h){console.log(h)}})}}return{link:a,templateUrl:"/static/feedback-modal.html"}});