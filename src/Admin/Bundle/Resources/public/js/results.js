if (typeof window == 'undefined') {
    window = {};
}
if (typeof window.views == 'undefined') {
    window.views = {};
}
if (typeof window.views.__vars == 'undefined') {
    window.views.__vars = {};
}
if (typeof window.views.__varStack == 'undefined') {
    window.views.__varStack = [];
}
if (typeof window.views.__parentStack == 'undefined') {
    window.views.__parentStack = [];
}
if (typeof window.views.__output == 'undefined') {
    window.views.__output = '';
}
if (typeof window.views.__outputStack == 'undefined') {
    window.views.__outputStack = [];
}
if (typeof window.views.__globalVars == 'undefined') {
    window.views.__globalVars = {};
}
if (typeof window.views.__globalVars.app == 'undefined') {
    window.views.__globalVars.app = {};
}
if (typeof window.views.__globalVars.view == 'undefined') {
    window.views.__globalVars.view = {};
}
if (typeof window.views.__globalVars.view['slots'] == 'undefined') {
    window.views.__globalVars.view['slots'] = {};
}
if (typeof window.views.__globalVars.view['slots'].output == 'undefined') {
    window.views.__globalVars.view['slots'].output = {};
}
window.views.slotStack = [];
window.views.user = {};
window.views.user.hasRole = function (role) {
    return window.views.user.roles.indexOf(role) > -1;
};
window.views.user.getEmail = function () {
    return window.views.user.email;
};
window.views.__globalVars.app.getUser = function () {
    var user = $.extend(window.views.user, $('#welcome-message').data('user'));
    return user;
};

if (typeof window.views.render == 'undefined') {
    window.views.render = function (name, vars) {
        name = name.replace(/.*?:.*?:|\.html\.php/ig, '').replace(/[^a-z0-9]/ig, '_');
        if(typeof window.views[name] == 'undefined') {
            throw 'View not found';
        }

        // save state
        var useThis;
        if(typeof vars.context != 'undefined') {
            useThis = vars.context;
        }
        else if (typeof this.this != 'undefined') {
            useThis = jQuery('<div />');
        }
        else {
            useThis = this;
        }
        window.views.__varStack.push(window.views.__vars);
        window.views.__vars = $.extend({this: useThis}, window.views.__globalVars);
        window.views.__vars.view = $.extend({this: useThis}, window.views.__vars.view); // don't override default or leave any traces, the rest are just top level function references
        window.views.__vars = $.extend(window.views.__vars, vars);
        window.views.__outputStack.push(window.views.__output);
        window.views.__output = '';

        // set up parent template to be executed at the end on top of this template
        var hasParent = false;
        window.views.__vars.view.extend = function (name, vars) {
            name = name.replace(/.*?:.*?:|\.html\.php/ig, '').replace(/[^a-z0-9]/ig, '_');
            if(typeof window.views[name] == 'undefined') {
                throw 'Parent view not found';
            }
            // add parent to stack above current view with vars for popping after the first render is complete
            hasParent = true;
            window.views.__varStack.push($.extend({this: useThis}, vars));
            window.views.__parentStack.push(name);
        };

        window.views[name].apply(useThis, [window.views.__vars]);
        var output = window.views.__output;

        // restore state
        window.views.__vars = window.views.__varStack.pop();
        window.views.__output = window.views.__outputStack.pop();

        if(hasParent) {
            // parentVars already from above
            var parent = window.views.__parentStack.pop();
            output += window.views.render.apply(useThis, [parent, window.views.__vars]);
            // pop back to incoming state
            window.views.__vars = window.views.__varStack.pop();
        }

        return output;
    };
}

window.views.__globalVars.view.render = window.views.render;
window.views.__globalVars.view.router = Routing;
window.views.__globalVars.view.escape = _.escape;
window.views.__globalVars.view['slots'].start = function (name) {
    window.views.__outputStack.push(window.views.__output);
    window.views.__output = '';
    window.views.slotStack.push(name);
};
window.views.__globalVars.view['slots'].stop = function () {
    window.views.__globalVars.view['slots'].output[window.views.slotStack.pop()] = window.views.__output;
    window.views.__output = window.views.__outputStack.pop();
};
window.views.__globalVars.view['slots'].get = function (name) {
    return window.views.__globalVars.view['slots'].output[name];
};
window.views.__globalVars.view['slots'].output = function (name) {
    return window.views.__output += window.views.__globalVars.view['slots'].output[name];
};
Date.prototype.format = function (format) {
    if (format == 'r') {
        return moment(this).formatPHP('ddd, DD MMM YYYY HH:mm:ss ZZ');
    }
    return moment(this).formatPHP(format);
};

$(document).ready(function () {

    var body = $('body'),
        orderBy = 'last DESC',
        searchTimeout = null,
        searchRequest = null;

    var lastSelected = null;
    var selectViable = false;
    document.onselectstart = function () {
        if (key.shift && selectViable) {
            return false;
        }
    };
    body.on('mousedown', '.results [class*="-row"], table.results > tbody > tr', function (evt) {
        // cancel select toggle if target of click is also interactable
        if (($(this).is('.selected') || $(evt.target).is('a'))
            && $(evt.target).is('select, input, a, textarea, button, label.checkbox, label.radio, label.checkbox *, label.radio *, button *, .selectize-control, .selectize-control *')) {
            return;
        }

        selectViable = false;
        var results = $(this).closest('.results');
        var type = (/(.*)-row/i).exec($(this).attr('class'))[1];
        var state = !$(this).find('input[name="selected"]').prop('checked');
        // clear selection unless shift is pressed
        var range = $(this);
        if (!key.shift) {
            results.parents('.panel-pane').find('.results').find('.selected').not($(this)).removeClass('selected').find('> *:last-child input[name="selected"]')
                .prop('checked', false);
        }
        else {
            // check if range is viable
            if (lastSelected != null && lastSelected.is('.' + type + '-row')) {
                if (lastSelected.index() < $(this).index()) {
                    range = $.merge(range, lastSelected.nextUntil($(this)));
                }
                else {
                    range = $.merge(range, $(this).nextUntil(lastSelected));
                }
                selectViable = true;
            }
        }
        if (state) {
            range.addClass('selected').find('> *:last-child input[name="selected"]')
                .prop('checked', state);
            range.trigger('selected');
        }
        else {
            range.removeClass('selected').find('> *:last-child input[name="selected"]')
                .prop('checked', state);
        }

        // if we just did a select, reset the last select so it takes two more clicks to do another range
        if (selectViable) {
            lastSelected = null;
        }
        else {
            lastSelected = $(this);
        }
    });

    body.on('click', '.tiles [class*="-row"]:has(a.edit-icon)', function (evt) {
        if (!$(evt.target).is('a:not(.edit-icon), [class*="-row"] > .packList, [class*="-row"] > .packList *')) {
            var results = $(this).parents('.results');
            var row = $(this).closest('[class*="-row"]');
            window.activateMenu(row.find('.edit-icon').attr('href'));
            row.removeClass('edit').addClass('read-only');
        }
    });

    function resetHeader() {
        var command = $('.results.collapsible:visible').first();
        if (command.length == 0) {
            return;
        }
        command.each(function () {
            var command = $(this);
            var selected = $('[class*="-row"]:visible.selected').filter(function () {
                return isElementInViewport($(this));
            });

            if (selected.length == 0) {
                if ($(this).is('[class*="-row"]:visible') && isElementInViewport($(this))) {
                    selected = $(this);
                }
                else {
                    selected = command.find('[class*="-row"]:visible').filter(function () {
                        return isElementInViewport($(this));
                    });
                }
            }

            if (selected.length == 0) {
                command.attr('class', command.attr('class').replace(/showing-(.*?)(\s+|$)/i, ''));
                command.addClass('empty');
            }
            else {
                command.removeClass('empty');
                var table = (/(.*)-row/i).exec(selected.attr('class'))[1];
                table = 'showing-' + table;
                if (!command.is('.' + table)) {
                    command.attr('class', command.attr('class').replace(/showing-(.*?)(\s+|$)/i, ''));
                    command.addClass(table);
                }
            }
        });
    }

    body.on('show', '.panel-pane', function () {
        if (!$(this).is('.results-loaded')) {
            $(this).addClass('results-loaded');
            $(this).find('.results header .search .checkbox').draggable();
        }
        resetHeader();
    });

    function getDataRequest() {
        var admin = $(this).closest('.results');
        var result = {requestKey: admin.data('request').requestKey};
        var dataTables = result['tables'];
        var tables = {};
        if (admin.find('.class-names').length > 0) {
            admin.find('.class-names input:checked').each(function () {
                if (dataTables.hasOwnProperty($(this).val())) {
                    tables[$(this).val()] = dataTables[$(this).val()];
                }
            });
        }
        else {
            tables = dataTables;
        }
        result['order'] = orderBy;
        result['tables'] = tables;
        result['search'] = (admin.find('input[name="search"]').val() || '').trim();


        admin.find('input[name="page"]').each(function () {
            var table = $(this).parents('.paginate > .paginate').parent().attr('class').replace('paginate', '').trim();
            result['page-' + table] = $(this).val();
        });

        admin.find('header .input input, header .input select').each(function () {
            result[$(this).attr('name')] = $(this).val();
        });

        return result;
    }

    window.getDataRequest = getDataRequest;

    body.on('click', '.results .class-names .checkbox a', function (evt) {
        evt.preventDefault();
        var command = $('.results:visible');
        var heading = $('[name="' + this.hash.substr(1) + '"]');
        var topPlusPane = DASHBOARD_MARGINS.padding.top + command.find('.pane-top').outerHeight(true) - heading.outerHeight();
        heading.scrollintoview({
            padding: {
                top: topPlusPane,
                right: 0,
                bottom: $(window).height() - DASHBOARD_MARGINS.padding.top + command.find('.pane-top').height() - heading.outerHeight(),
                left: 0
            }
        });
        command.find('[class*="-row"].' + this.hash.substr(1) + '-row').first().trigger('mouseover');
    });

    // collapse section feature
    body.on('change', '.results .class-names .checkbox input', function () {
        var command = $('.results:visible');
        var table = $(this).val();
        var heading = command.find('> h2.' + table);
        if ($(this).is(':checked')) {
            heading.removeClass('collapsed').addClass('expanded');
        }
        else {
            heading.removeClass('expanded').addClass('collapsed');
        }
        if ($(this).is('[disabled]')) {
            heading.hide();
        }
        else {
            heading.show();
        }
        if (command.is('.showing-' + table) && (heading.is('.collapsed') || !heading.is(':visible')) || command.is('.empty')) {
            resetHeader();
        }
    });

    var radioCounter = 5000;

    // TODO: remove this in favor of creating a blank through the template system
    body.on('click', '.results a[href^="#add-"]', function (evt) {
        evt.preventDefault();
        var results = $(this).parents('.results');
        var table = $(this).attr('href').substring(5);
        var newRow = results.find('.' + table + '-row.template, .' + table + '-row.template + .expandable.template').clone();
        newRow.each(function () {
            var that = $(this);
            that.attr('class', that.attr('class').replace(new RegExp(table + '-id-[0-9]*(\\s|$)', 'ig'), table + '-id- '));
            that.removeClass('template removed read-only historic').addClass('edit empty');
            that.find('select, textarea, input[type="text"]').val('').trigger('change');
            var radio = that.find('input[type="radio"]');
            if (radio.length > 0) {
                radioCounter++;
                var renamed = [];
                radio.each(function () {
                    var origName = $(this).attr('name');
                    var name = origName.replace(/[0-9]*/, '') + radioCounter;
                    // find radios with the same name as the one we are on
                    if (renamed.indexOf(origName) == -1) {
                        renamed[renamed.length] = origName;
                        renamed[renamed.length] = name;
                    }
                    that.find('input[type="radio"][name="' + origName + '"]').attr('name', name).trigger('change');
                });
            }
            that.find('input[type="checkbox"]').prop('checked', false).trigger('change');
        });
        newRow.insertBefore(results.find('.' + table + '-row').first());
    });

    body.on('click', '[class*="-row"] a[href^="#remove-"]', function (evt) {
        evt.preventDefault();
        var row = $(this).parents('[class*="-row"]');
        if ($(this).is('[href^="#remove-confirm-"]')) {
            row.removeClass('selected').addClass('removed');
        }
        else {
            row.addClass('remove-confirm');
        }
    });

    // inline edit
    body.on('click', '[class*="-row"] a[href^="#edit-"]', function (evt) {
        evt.preventDefault();
        var row = $(this).closest('[class*="-row"]');
        row.removeClass('read-only').addClass('edit');
    });

    // footer edit
    body.on('click', '.form-actions a[href^="#edit-"]', function (evt) {
        evt.preventDefault();
        var row = getTab.apply(this).find('[class*="-row"].read-only');
        row.removeClass('read-only').addClass('edit');
    });

    // inline cancel
    body.on('click', '[class*="-row"] a[href="#cancel-edit"]', function (evt) {
        evt.preventDefault();
        var row = $(this).closest('[class*="-row"]');
        row.removeClass('edit remove-confirm').addClass('read-only');
    });

    // footer cancel
    body.on('click', '.form-actions a[href^="#cancel-edit"], .form-actions .cancel-edit', function (evt) {
        evt.preventDefault();
        var row = getTab.apply(this).find('[class*="-row"].edit');
        row.removeClass('edit remove-confirm').addClass('read-only');
    });

    // footer save
    body.on('click', '.form-actions a[href^="#save-"], .form-actions [value^="save-"]', function (evt) {
        evt.preventDefault();
        var tab = getTab.apply(this);
        //if (autoSaveTimeout != null) {
        //    clearTimeout(autoSaveTimeout);
        //    autoSaveTimeout = null;
        //}
        tab.trigger('validate');
        var rows = tab.find('[class*="-row"].empty:not(.template)');
        rows.add(rows.next('.expandable')).removeClass('selected').addClass('removed');
        tab.find('[class*="-row"].edit').removeClass('edit remove-confirm').addClass('read-only');
        standardSave.apply(tab, [{}]);
    });

    var validationTimeout = null;
    body.on('change keyup keydown', '.results [class*="-row"] input, .results [class*="-row"] select, .results [class*="-row"] textarea', function (evt) {
        // do not autosave from selectize because the input underneath will change
        if ($(evt.target).parents('.selectize-input').length > 0) {
            return;
        }
        var tab = getTab.apply(this);
        $(this).parents('[class*="-row"]').addClass('changed');

        if (validationTimeout != null) {
            clearTimeout(validationTimeout);
        }
        validationTimeout = setTimeout(function () {
            tab.trigger('validate');
        }, 100);
    });

    function getTab(readonly) {
        if (readonly) {
            return $(this).closest('.panel-pane').find('.results:has([class*="-row"].edit, [class*="-row"].read-only)');
        }
        else {
            return $(this).closest('.panel-pane').find('.results:has([class*="-row"].edit, [class*="-row"].read-only)');
        }
    }

    window.getTab = getTab;

    body.on('click', '.results a[href^="#switch-view-"]', function (evt) {
        evt.preventDefault();
        var results = $(this).parents('.results').first();
        var request = results.data('request');
        request['view'] = $(this).attr('href').substr(13);
        results.data('request', request);
        loadResults.apply(results);
    });

    var isLoading = false;

    // TODO: port to server in a shared code file, saves to database at the end
    function standardSave(save) {
        var field = $(this);
        var tab = getTab.apply(field);
        var fieldTab = field.closest('.results').first();
        var data = $.extend(save || {}, {requestKey: getDataRequest.apply(fieldTab).requestKey});
        var actionItem = field.closest('[action], [data-action]');
        if (actionItem.length == 0) {
            actionItem = fieldTab.find('[action], [data-action]')
        }
        var saveUrl = actionItem.data('action') || actionItem.attr('action');
        data = $.extend(true, data, getQueryObject(saveUrl));
        saveUrl = saveUrl.replace(/\?.*/ig, '');

        var saveButton = fieldTab.find('.highlighted-link a[href^="#save-"]');

        if (typeof saveUrl == 'undefined') {
            throw 'Save action not found!';
        }

        if (saveButton.is('.read-only > *, [disabled]') || isLoading) {
            // select incorrect row handled by #goto-error
            return;
        }

        // loading animation from CTA or activating field
        isLoading = true;
        loadingAnimation(saveButton);

        // get the parsed list of data
        for (var r = 0; r < tab.length; r++) {
            var tables = $(tab[r]).data('request').tables;
            for (var table in tables) {
                if (tables.hasOwnProperty(table)) {
                    // get list of possible fields in form
                    var tmpTables = {};
                    tmpTables[table] = tables[table];
                    var fields = getAllFields(tmpTables);
                    var rows = tab.find('.' + table + '-row.valid.changed:not(.template), .' + table + '-row.removed:not(.template)');
                    for (var i = 0; i < rows.length; i++) {
                        if (typeof data[table] == 'undefined') {
                            data[table] = [];
                        }
                        if (data[table].constructor !== Array) {
                            data[table] = [data[table]];
                        }
                        var row = $(rows[i]);
                        var rowId = getRowId.apply(row);
                        if ($(this).is('.removed') || $(this).is('.empty')) {
                            data[table][data[table].length] = {id: rowId, remove: true};
                        }
                        else {
                            data[table][data[table].length] = $.extend({id: rowId}, gatherFields.apply(row, [fields]));
                        }
                        if (rows.length == 1 && data[table].length == 1) {
                            data[table] = data[table][0];
                        }
                    }
                    rows.removeClass('changed');
                }
            }
        }

        $.ajax({
            url: saveUrl,
            type: 'POST',
            dataType: 'text',
            data: data,
            success: function (data) {
                fieldTab.find('.squiggle').stop().remove();
                isLoading = false;
                // copy rows and select
                loadContent.apply(fieldTab.first(), [data]);
            },
            error: function () {
                isLoading = false;
                fieldTab.find('.squiggle').stop().remove();
            }
        });
    }

    function getAllFields(tables) {
        var fields = [];
        for (var table in tables) {
            if (tables.hasOwnProperty(table)) {
                // get list of possible fields in form
                for (var f in tables[table]) {
                    if (tables[table].hasOwnProperty(f)) {
                        if (typeof f == 'string' && isNaN(parseInt(f))) {
                            fields = $.merge(fields, [f]);
                        }

                        if (typeof tables[table][f] == 'string') {
                            fields = $.merge(fields, [tables[table][f]]);
                        }
                        else if (Array.isArray(tables[table][f])) {
                            fields = $.merge(fields, tables[table][f]);
                        }
                        else {
                            throw 'Not supported!';
                        }
                    }
                }
            }
        }
        return fields;
    }
    window.getAllFields = getAllFields;

    window.standardSave = standardSave;

    $(window).on('beforeunload', function (evt) {
        if ($('.panel-pane:visible').find('.results [class*="-row"].edit.changed:not(.template):not(.removed)').length > 0) {
            evt.preventDefault();
            return "You have unsaved changes!  Please don't go!";
        }
    });

    body.on('hide', '.panel-pane', function () {
        var row = $(this).find('.results [class*="-row"].edit');
        row.removeClass('edit remove-confirm').addClass('read-only');
    });

    function getTabId() {
        return getRowId.apply($(this).closest('.panel-pane').find('[class*="-row"]:not(.template)').first());
    }

    window.getTabId = getTabId;

    function getRowId() {
        var row = $(this).closest('[class*="-row"]').first();
        var table = ((/(^|\s)([a-z0-9_-]*)-row(\s|$)/ig).exec(row.attr('class')) || [])[2];
        return ((new RegExp(table + '-id-([0-9]*)(\\s|$)', 'ig')).exec(row.attr('class')) || [])[1];
    }

    window.getRowId = getRowId;

    // TODO: remove this entire method and merge update features with template system, same as results.html.php and rows.html.php
    function loadContent(data, tableNames) {
        var admin = $(this).closest('.results').first();
        if (!tableNames) {
            tableNames = [];
            var tables = admin.first().data('request')['tables'];
            for(var tn in tables) {
                if(tables.hasOwnProperty(tn)) {
                    tableNames[tableNames.length] = tn;
                }
            }
        }
        var content;
        if (typeof data == 'object') {
            throw 'Not allowed';
            /*
             TODO: run template system
             if(typeof data.tables == 'undefined') {
             throw 'Not a "results" request.';
             }
             admin.data('request', {requestKey: data.searchRequest.requestKey});
             */
        }
        else {
            content = $(data).filter('.results');
            if (content.find('.panel-pane').length > 0) {
                throw 'Not a "results" request.';
            }
            admin.data('request', content.data('request')).attr('class', content.attr('class'));
        }

        admin.find('> .views').remove();
        for (var t = 0; t < tableNames.length; t++) {
            (function (table) {
                var selected = getRowId.apply(admin.find('> .' + table + '-row.selected'));

                var getRowQuery,
                    rowQuery = (getRowQuery = function (table) {
                        return '> .views, > footer.' + table + ', > header.' + table + ', > .highlighted-link.' + table + ', > .' + table + '-row, > .' + table + '-row + .expandable:not([class*="-row"])'
                    })(table);

                admin.find(rowQuery)
                    // leave edit rows alone
                    .filter('.template, .template + .expandable:not([class*="-row"]), header, footer, .highlighted-link, [class*="-row"]:not(.edit), [class*="-row"]:not(.edit) + .expandable:not([class*="-row"])')
                    // remove existing rows
                    .remove();

                var existing,
                    keepRows = (existing = admin.find('> .' + table + '-row')).map(function () {
                        var rowId = getRowId.apply(this);
                        return '.' + table + '-id-' + rowId + ', .' + table + '-id-' + rowId + ' + .expandable:not([class*="-row"])';
                    }).toArray();
                var last = existing.length == 0 ? admin.find(getRowQuery(tableNames[t - 1])).last() : existing.add(existing.next('.expandable:not([class*="-row"])')).last();
                var allNewTableContent = content.find(rowQuery);
                var newRows = allNewTableContent.not($.merge(['.template'], keepRows).join(','));
                var headerFooter = allNewTableContent.filter('.views, header, footer, .highlighted-link, .template');
                // put headers before and actions after
                if (headerFooter.length > 0) {
                    if (existing.length > 0) {
                        headerFooter.filter('header, .views').insertBefore(existing.first());
                        headerFooter.filter('.highlighted-link, .template, footer').insertAfter(last);
                    }
                    else {
                        if (last.length == 0) {
                            headerFooter.prependTo(admin);
                        }
                        else {
                            headerFooter.insertAfter(last);
                        }
                        if(headerFooter.filter('header, .views').length > 0) {
                            last = headerFooter.filter('header, .views').last();
                        }
                    }
                    newRows = newRows.not(headerFooter);
                }

                for (var n = 0; n < newRows.length; n++) {
                    var noId, row = $(newRows[n]);
                    if (!row.is('.' + table + '-row')) {
                        continue;
                    }
                    else {
                        row = row.add($(newRows[n]).next('.expandable:not([class*="-row"])'));
                    }
                    // update empty row ids TODO: verify this doesn't mistakenly pick out the wrong blank row added in between saving
                    if ((noId = admin.find('> .' + table + '-row.edit.' + table + '-id-:not(.template)').first()).length > 0) {
                        noId.removeClass(table + '-id-').addClass(table + '-id-' + getRowId.apply(newRows[n]));
                    }
                    else {
                        if (last.length == 0) {
                            row.prependTo(admin);
                        }
                        else {
                            row.insertAfter(last);
                        }
                        last = row.last();
                    }
                }
                admin.find('.paginate.' + table + ' .page-total').text(content.find('.paginate.' + table + ' .page-total').text());
                // TODO: even if we are keeping the existing rows, still update data-action attributes for each ID
                for (var r = 0; r < keepRows.length; r++) {
                    admin.find(keepRows[r]).find('> [class*="actions"]').replaceWith(content.find(keepRows[r]).find('> [class*="actions"]'))
                }
                if (selected) {
                    admin.find('> .' + table + '-id-' + selected[1]).addClass('selected');
                }
            })(tableNames[t]);
        }
        resetHeader();
        admin.trigger('resulted');
        centerize.apply(admin.find('.centerized'));
    }

    // make available to save functions that always lead back to index
    window.loadContent = loadContent;

    function loadResults() {
        if (searchRequest != null)
            searchRequest.abort();
        if (searchTimeout != null)
            clearTimeout(searchTimeout);
        $(this).filter('.results:visible').each(function () {
            var that = $(this);
            searchTimeout = setTimeout(function () {
                searchRequest = $.ajax({
                    url: Routing.generate('command_callback'),
                    type: 'GET',
                    dataType: 'text',
                    data: getDataRequest.apply(that),
                    success: function (data) {
                        loadContent.apply(that, [data]);
                    }
                });
            }, 100);
        });
    }

    window.loadResults = loadResults;

    body.on('mouseover click', '.results [class*="-row"]', resetHeader);

    body.on('change', '.paginate input', function () {
        var results = $(this).parents('.results');
        var paginate = $(this).closest('.paginate');
        results.find('.class-names a[href="#' + (/showing-(.*?)(\s|$)/i).exec(results.attr('class'))[1].trim() + '"]').trigger('click');
    });

    body.on('click', '.results a[href^="#search-"]', function (evt) {
        var admin = $(this).parents('.results');
        evt.preventDefault();
        var search = this.hash.substring(8);
        if (search.indexOf(':') > -1) {
            admin.find('header input, header select').each(function () {
                var subSearch = (new RegExp($(this).attr('name') + ':(.*?)(\\s|$)', 'i')).exec(search);
                if (subSearch) {
                    search = search.replace(subSearch[0], '');
                    $(this).val(subSearch[1]).trigger('change');
                }
            });
        }
        else {

        }
        $(this).parents('.results').find('.search input[name="search"]').val(search).trigger('change');
    });

    body.on('click change', '.paginate a', function (evt) {
        evt.preventDefault();
        var results = $(this).parents('.results'),
            paginate = $(this).closest('.paginate'),
            page = this.hash.match(/([0-9]*|last|prev|next|first)$/i)[0],
            current = parseInt(paginate.find('input[name="page"]').val()),
            last = parseInt(paginate.find('.page-total').text());
        if (page == 'first')
            page = 1;
        if (page == 'next')
            page = current + 1;
        if (page == 'prev')
            page = current - 1;
        if (page == 'last')
            page = last;
        if (page > last)
            page = last;
        if (page < 1)
            page = 1;
        paginate.find('input[name="page"]').val(page).trigger('change');
    });

    body.on('submit', '.results header form', function (evt) {
        evt.preventDefault();

        loadResults.apply($(this).parents('.results'));
    });

    body.on('change', '.results header .input > select, .results header .input > input', function () {
        var that = $(this);
        var admin = $('.results:visible');
        var paginate = that.closest('.paginate');

        if (that.val() == '_ascending' || that.val() == '_descending') {
            orderBy = that.attr('name') + (that.val() == '_ascending' ? ' ASC' : ' DESC');
            that.val(that.data('last') || that.find('option').first().attr('value'));
        }
        else if (that.val().trim() != '') {
            that.parent().removeClass('unfiltered').addClass('filtered');
            that.data('last', that.val());
        }
        else {
            that.parent().removeClass('filtered').addClass('unfiltered');
            that.data('last', that.val());
        }

        var disabled = [];
        admin.find('header .filtered').each(function () {
            var header = $(this).parents('header > *');
            admin.find('.class-names .checkbox input').each(function () {
                if (!header.is('.search') && !header.is('.paginate') && !header.is('.' + $(this).val())) {
                    disabled = $.merge($(disabled), $(this));
                }
            });
        });
        admin.find('.class-names .checkbox input').each(function () {
            if (!$(this).is('[disabled]')) {
                $(this).data('last', $(this).prop('checked'));
            }
            if ($(this).is(disabled)) {
                $(this).attr('disabled', 'disabled').prop('checked', false);
            }
            else {
                $(this).removeAttr('disabled').prop('checked', $(this).data('last'))
            }
            $(this).trigger('change');
        });

        loadResults.apply(admin);
    });

    body.on('click', 'a[href="#goto-error"]', function (evt) {
        evt.preventDefault();
        var invalid = $(this).parents('.results').find('.invalid .invalid:has(input, select, textarea)').first();
        invalid.scrollintoview(DASHBOARD_MARGINS).addClass('pulsate');
        invalid.find('input, select, textarea').focus().one('change', function () {
            $(this).parents('.pulsate').removeClass('pulsate');
        });
    });

});
