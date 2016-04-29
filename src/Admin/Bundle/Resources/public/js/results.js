

$(document).ready(function () {

    var body = $('body'),
        orderBy = 'last DESC',
        searchTimeout = null,
        searchRequest = null;

    var lastSelected = null;
    var selectViable = false;
    document.onselectstart = function () {
        if(key.shift && selectViable) {
            return false;
        }
    };
    body.on('mousedown', '.results [class*="-row"], table.results > tbody > tr', function (evt) {
        // cancel select toggle if target of click is also interactable
        if(($(this).is('.selected') || $(evt.target).is('a'))
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
            if(lastSelected != null && lastSelected.is('.' + type + '-row')) {
                if(lastSelected.index() < $(this).index()) {
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
        if(!$(evt.target).is('a:not(.edit-icon), [class*="-row"] > .packList, [class*="-row"] > .packList *'))
        {
            var results = $(this).parents('.results');
            var row = $(this).closest('[class*="-row"]');
            window.activateMenu(row.find('.edit-icon').attr('href'));
            row.removeClass('edit').addClass('read-only');
        }
    });

    body.on('click', '.results.expandable > [class*="-row"]:nth-of-type(odd), .results.expandable > tbody > tr:nth-child(odd)', function () {
        var row = $(this);
        if(row.is('.selected')) {
            row.removeClass('selected');
        }
        else {
            row.addClass('selected');
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

            if(selected.length == 0) {
                command.attr('class', command.attr('class').replace(/showing-(.*?)(\s+|$)/i, ''));
                command.addClass('empty');
            }
            else {
                command.removeClass('empty');
                var table = (/(.*)-row/i).exec(selected.attr('class'))[1];
                table = 'showing-' + table;
                if(!command.is('.' + table)) {
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

    function getDataRequest()
    {
        var admin = $(this).closest('.results');
        var result = $.extend({}, admin.data('request'));
        var dataTables = result['tables'];
        var tables = {};
        if (admin.find('.class-names').length > 0) {
            admin.find('.class-names input:checked').each(function () {
                if(dataTables.hasOwnProperty($(this).val())) {
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
        heading.scrollintoview({padding: {
            top: topPlusPane,
            right: 0,
            bottom: $(window).height() - DASHBOARD_MARGINS.padding.top + command.find('.pane-top').height() - heading.outerHeight(),
            left: 0
        }});
        command.find('[class*="-row"].' + this.hash.substr(1) + '-row').first().trigger('mouseover');
    });

    // collapse section feature
    body.on('change', '.results .class-names .checkbox input', function () {
        var command = $('.results:visible');
        var table = $(this).val();
        var heading = command.find('> h2.' + table);
        if($(this).is(':checked')) {
            heading.removeClass('collapsed').addClass('expanded');
        }
        else {
            heading.removeClass('expanded').addClass('collapsed');
        }
        if($(this).is('[disabled]')) {
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
                    if(renamed.indexOf(origName) == -1) {
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
        if($(this).is('[href^="#remove-confirm-"]')) {
            row.removeClass('selected').addClass('removed');
        }
        else {
            row.addClass('remove-confirm');
        }
    });

    body.on('click', '[class*="-row"] a[href^="#edit-"]', function (evt) {
        evt.preventDefault();
        var row = $(this).closest('[class*="-row"]');
        row.removeClass('read-only').addClass('edit');
    });

    body.on('click', '.form-actions a[href^="#edit-"]', function (evt) {
        evt.preventDefault();
        var row = $(this).closest('.panel-pane').find('.results [class*="-row"].read-only');
        row.removeClass('read-only').addClass('edit');
    });

    body.on('click', '[class*="-row"] a[href="#cancel-edit"]', function (evt) {
        evt.preventDefault();
        var row = $(this).closest('[class*="-row"]');
        row.removeClass('edit remove-confirm').addClass('read-only');
    });

    body.on('click', '.form-actions a[href^="#cancel-edit"], .form-actions .cancel-edit', function (evt) {
        evt.preventDefault();
        var row = $(this).closest('.panel-pane').find('.results [class*="-row"].edit');
        row.removeClass('edit remove-confirm').addClass('read-only');
    });

    body.on('click', '.results a[href^="#switch-view-"]', function (evt) {
        evt.preventDefault();
        var results = $(this).parents('.results').first();
        var request = results.data('request');
        request['view'] = $(this).attr('href').substr(13);
        results.data('request', request);
        loadResults.apply(results);
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

    function loadContent (data, tables) {
        var admin = $(this).closest('.results').first();
        if(!tables) {
            tables = $.unique(admin.find('[class*="-row"].template').map(function () {
                return (/(.*)-row/i).exec($(this).attr('class'))[1];
            }).toArray());
        }
        var content;
        if(typeof data == 'object') {
            throw 'Not allowed';
            /*
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

        for(var t = 0; t < tables.length; t++) {
            (function (table) {
                var selected = getRowId.apply(admin.find('> .' + table + '-row.selected'));

                var getRowQuery,
                    rowQuery = (getRowQuery = function (table) { return '> header.' + table + ', > .highlighted-link.' + table + ', > .' + table + '-row, > .' + table + '-row + .expandable' })(table);

                admin.find(rowQuery)
                    // leave edit rows alone
                    .filter('.template, .header, .highlighted-link, :not(.edit), :not(.edit) + .expandable')
                    // remove existing rows
                    .remove();

                var existing,
                    keepRows = (existing = admin.find('> .' + table + '-row')).map(function () {
                    var rowId = getRowId.apply(this);
                    return '.' + table + '-id-' + rowId + ', .' + table + '-id-' + rowId + ' + .expandable';
                }).toArray();
                var last = existing.length == 0 ? admin.find(getRowQuery(tables[t-1])).last() : existing.last();
                var newRows = content.find(rowQuery).not(keepRows.join(','));
                var headerFooter = newRows.filter('header, .highlighted-link, .' + table + '-row, .' + table + '-row + .expandable');
                // put headers before and actions after
                if(headerFooter.length > 0) {
                    if (existing.length > 0) {
                        headerFooter.filter('header').insertBefore(existing.first());
                        headerFooter.filter('.highlighted-link, .' + table + '-row, .' + table + '-row + .expandable').insertAfter(existing.last());
                    }
                    else {
                        if (last.length == 0) {
                            headerFooter.prependTo(admin);
                        }
                        else {
                            headerFooter.insertAfter(last);
                        }
                        last = headerFooter.filter('header').last();
                    }
                    newRows = newRows.not(headerFooter);
                }

                for(var n = 0; n < newRows.length; n++) {
                    var noId, row = $(newRows[n]);
                    if(!row.is('.' + table + '-row')) {
                        continue;
                    }
                    else {
                        row = row.add($(newRows[n]).next('.expandable'));
                    }
                    // update empty row ids TODO: verify this doesn't mistakenly pick out the wrong blank row added in between saving
                    if((noId = admin.find('> .' + table + '-row.edit.' + table + '-id-:not(.template)').first()).length > 0) {
                        noId.removeClass(table + '-id-').addClass(table + '-id-' + getRowId.apply(newRows[n]));
                    }
                    else {
                        if(last.length == 0) {
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
                for(var r = 0; r < keepRows.length; r++) {
                    admin.find(keepRows[r]).find('> [class*="actions"]').replaceWith(content.find(keepRows[r]).find('> [class*="actions"]'))
                }
                if (selected) {
                    admin.find('> .' + table + '-id-' + selected[1]).addClass('selected');
                }
            })(tables[t]);
        }
        resetHeader();
        admin.trigger('resulted');
        centerize.apply(admin.find('.centerized'));
    }
    // make available to save functions that always lead back to index
    window.loadContent = loadContent;

    function loadResults() {
        if(searchRequest != null)
            searchRequest.abort();
        if(searchTimeout != null)
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
        if(page == 'first')
            page = 1;
        if(page == 'next')
            page = current + 1;
        if(page == 'prev')
            page = current - 1;
        if(page == 'last')
            page = last;
        if(page > last)
            page = last;
        if(page < 1)
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

        if(that.val() == '_ascending' || that.val() == '_descending')
        {
            orderBy = that.attr('name') + (that.val() == '_ascending' ? ' ASC' : ' DESC');
            that.val(that.data('last') || that.find('option').first().attr('value'));
        }
        else if(that.val().trim() != '') {
            that.parent().removeClass('unfiltered').addClass('filtered');
            that.data('last', that.val());
        }
        else
        {
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
            if(!$(this).is('[disabled]')) {
                $(this).data('last', $(this).prop('checked'));
            }
            if($(this).is(disabled)) {
                $(this).attr('disabled', 'disabled').prop('checked', false);
            }
            else {
                $(this).removeAttr('disabled').prop('checked', $(this).data('last'))
            }
            $(this).trigger('change');
        });

        loadResults.apply(admin);
    });

    body.on('click', 'a[data-target="#general-dialog"][data-action]', function (evt) {
        evt.preventDefault();
        var that = $(this);
        body.one('click.confirm_action', '#general-dialog a[href="#submit"]', function () {
            $.ajax({
                url: that.data('action'),
                type: 'GET',
                dataType: that.data('type') || 'json',
                success: function (data) {
                    if(that.data('type') == 'text') {
                        loadContent.apply(that.parents('.results'), [data]);
                    }
                    that.parents('.results').trigger('resulted');
                }
            });
        });

        $('#general-dialog').find('.modal-body').html(that.data('dialog'));
    });

    body.on('click', 'a[href="#goto-error"]', function (evt) {
        evt.preventDefault();
        var invalid = $(this).parents('.results').find('.invalid .invalid:has(input, select, textarea)').first();
        invalid.scrollintoview(DASHBOARD_MARGINS).addClass('pulsate');
        invalid.find('input, select, textarea').focus().one('change', function () {$(this).parents('.pulsate').removeClass('pulsate');});
    });

});
