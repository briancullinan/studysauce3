
$(document).ready(function () {

    var body = $('body');

    key('⌘+v, ctrl+v, command+v', function () {
        var tab = $('[id*="packs-"]:visible');
        if(tab.find('input:focus, select:focus, textarea:focus').parents('.results [class*="-row"]').is('.empty')) {
            // get the clipboard text
            var text = $('<textarea></textarea>')
                .css('position', 'fixed')
                .css('top', 0)
                .css('left', -10000)
                .css('opacity', '0')
                .css('height', 1)
                .css('width', 1).appendTo(tab).focus();

            setTimeout(function () {
                var clipText = text.val();
                text.remove();
                rowImport.apply(tab, [clipText]);
            }, 100);
        }
    });

    function rowImport(clipText) {
        var results = $(this).find('.card-list .results'),
            request = results.data('request'),
            last = null;

        // split into rows
        var clipRows = Papa.parse(clipText).data;

        var newRows = $([]);
        // write out in a table
        for (var i=0; i<clipRows.length; i++) {
            // skip partial rows
            if (clipRows[i].length < 2)
                continue;

            (function (clipRow) {
                setTimeout(function () {
                    var newRow = {};
                    // set card type
                    newRow['responseType'] = '';
                    if (clipRow.length > 2) {
                        if (clipRow[0].match(/multiple/ig) != null) {
                            newRow['responseType'] = 'mc'
                        }
                        else if (clipRow[0].match(/false/ig) != null) {
                            newRow['responseType'] = 'tf'
                        }
                        else if (clipRow[0].match(/blank|short/ig) != null) {
                            newRow['responseType'] = 'sa';
                        }
                    }

                    // set correct answers
                    newRow['answers'] = clipRow.splice(3).filter(function (x) {
                        return x.trim() != '';
                    }).join("\n");

                    // merge this with row template and just pass a model containing type, answers, correct, content
                    if (clipRow.length == 2) {
                        newRow['content'] = clipRow[0];
                        newRow['correct'] = clipRow[1];
                    }
                    else {
                        if (newRow['responseType'] == 'tf') {
                            newRow['correct'] = (clipRow[2].match(/true|false/i) || [''])[0].toLowerCase() == 'true'
                                ? 'true'
                                : ((clipRow[2].match(/true|false/i) || [''])[0].toLowerCase() == 'false' ? 'false' : '');
                        }
                        else {
                            newRow['correct'] = clipRow[2];
                        }
                        newRow['content'] = clipRow[1];
                    }

                    newRow['table'] = 'card';
                    var rowHtml = $(window.views.render('row-card', {
                        card: applyEntityObj(newRow),
                        table: 'card',
                        tableId: 'card',
                        tables: request.tables,
                        request: request
                    }))
                        .removeClass('read-only').addClass('edit');

                    // list under currently focused row
                    if (last != null) {
                        last = rowHtml.insertAfter(last.last());
                    }
                    else {
                        last = rowHtml.insertAfter(results.find('> header.card'));
                    }
                    resizeTextAreas.apply(last);
                    last.addClass('changed');
                    last.trigger('validate');
                    newRows = newRows.add(last);
                }, 20);
            })(clipRows[i]);
        }

        // remove empties
        results.find('.card-row.empty, .card-row.empty + .expandable:not([class*="-row"])').remove();

        if(clipRows.length == 0) {
            for(var n = 0; n < 5; n++) {
                addResultRow.apply(results, ['card']);
            }
        }
    }

    function resizeTextAreas() {
        var row = $(this).closest('.card-row:not(.template):not(.removed)');
        row.each(function () {
            var row = $(this);
            var that = row.find('textarea:visible');
            that.each(function () {
                var that = $(this);
                that.css('height', '');
                //if (row.is('.edit')) {
                    that.height(that[0].scrollHeight - 4);
                    row.find('.correct').addClass('editing');
                //}
                //else {
                //    row.find('.correct').removeClass('editing');
                //    if (row.find('.correct .radios :checked').length > 0) {
                //        row.find('.correct textarea, .correct .radios').scrollTop(row.find('.correct .radios input').index(row.find('.correct .radios :checked')) * 22 - 2);
                //    }
                //}
            });
        });
    }
    body.on('change keyup keypress keydown focus blur', '[id^="packs-"] .card-row textarea', resizeTextAreas);

    body.on('change keyup', '[id^="packs-"] .card-row .type-mc.correct textarea, [id^="packs-"] .card-row .correct .radios input', function (evt) {
        var row = $(this).parents('.card-row');
        var that = row.find('.type-mc.correct textarea');

        // get current line
        var origName = $(evt.target).is('.correct .radios input') ? $(evt.target).attr('name') : row.find('.correct .radios input').attr('name');
        var orig = $(evt.target).is('.correct .radios input') ? $(evt.target).val() : row.find('.correct .radios input:checked').val();
        var line = row.find('.correct .radios input').index(row.find('.correct .radios input').filter(function () {return $(this).val() == orig;}));
        var existing = row.find('.correct .radios label');
        var answers = that.val().split(/\n/ig) || [];
        var newItems = [];
        var orderChanged = false;
        for(var i in answers) {
            if(!answers.hasOwnProperty(i))
                continue;
            var newItem;
            if ((newItem = $(existing.find('input').filter(function () {
                    return $(this).val() == answers[i];}).map(function () {
                    return $(this).parents('label')[0];})).not(newItems).first()).length == 0) {
                newItem = $('<label class="radio"><input type="radio" name="' + origName + '" value="' + answers[i] + '"><i></i><span>' + answers[i] + '</span></label>')
                    .appendTo(row.find('.correct .radios'));
            }
            else {
                if (i != newItem.parent().index(newItem)) {
                    orderChanged = true;
                    newItem.detach().appendTo(row.find('.correct .radios'));
                }
            }
            newItems = $.merge(newItems, [newItem[0]]);
        }
        if (existing.not(newItems).length > 0) {
            existing.not(newItems).remove();
        }
        var newVal = row.find('.correct .radios input').filter(function () {return $(this).val() == orig;});
        if(newVal.length == 0 || !orderChanged) {
            newVal = row.find('.correct .radios input').eq(line);
        }
        newVal.prop('checked', true);
    });

    body.on('click', '[id^="packs-"] .preview-play .play, [id^="cards"] .preview-play .play', function (evt) {
        evt.preventDefault();
        var player = $('#jquery_jplayer');
        if(player.data('jPlayer').status.src != $(this).attr('href')) {
            player.jPlayer("setMedia", {
                mp3: $(this).attr('href')
            });
        }
        player.jPlayer("play");
    });

    // TODO: merge with row-card.html.php or cell-id-card.html.php
    function setTypeClass() {
        var that = $(this);
        setTimeout(function () {
            var row = that.closest('.card-row');
            var results = row.parents('.results');
            var request = results.data('request');
            var data = gatherFields.apply(row, [getAllFieldNames(request.tables['card'])]);
            data['table'] = 'card';
            data['id'] = getRowId.apply(row);
            window.views.render.apply(row, ['row-card', {card: applyEntityObj(data), request: request, tables: request.tables, table: 'card'}])
        }, 13);
    }

    body.on('change', '[id*="packs-"] .card-row select[name="responseType"]', setTypeClass);

    var autoSaveTimeout = 0;

    function updatePreview() {
        if($(this).length == 0) {
            return;
        }
        var row = $(this).add($(this).next('.expandable'));
        var results = row.parents('.results');
        var request = results.data('request');
        var data = gatherFields.apply(row, [getAllFieldNames(request.tables['card'])]);
        window.views.render.apply(row, ['cell_preview_card', {card: applyEntityObj($.extend({table: 'card'}, data))}]);
        centerize.apply(row.find('.centerized:visible'));
        $('#jquery_jplayer').jPlayer('option', 'cssSelectorAncestor', '.preview-play:visible');
    }

    body.on('selected', '[id^="packs-"] .card-row', updatePreview);

    body.on('click', '[id^="packs-"] .card-row [href="#remove-confirm-card"]', packsFunc);

    // TODO: generalize this

    body.on('validate', '[id^="packs-"] [class*="-row"]', packsFunc);

    // TODO: merge this with template then run changes through template on server and check each cell for invalid class to validate before saving to database
    function packsFunc() {

        var tab = getTab.apply(this);
        var packRows = tab.find('.pack-row').first(); // <-- this is critical for autosave to work
        var cardRows = $(this).closest('.card-row:not(.removed)');

        for(var c  = 0; c < cardRows.length; c++) {
            var row = $(cardRows[c]);
            var data = gatherFields.apply(row, [['responseType', 'content', 'answers', 'correct']]);

            if(data.content == '' && (typeof data.correct == 'undefined' || data.correct == '') && (typeof data.answers == 'undefined' || data.answers == '')) {
                row.removeClass('invalid').addClass('empty valid');
            }
            else if (data.content == '' || data.correct == '' || data.answers == '') {
                row.removeClass('valid empty').addClass('invalid');
                if (data.content == '') {
                    row.find('.content').addClass('invalid');
                }
                else {
                    row.find('.content').removeClass('invalid');
                }
                if (data.correct == '' || data.answers == '') {
                    row.find('.correct').addClass('invalid');
                }
                else {
                    row.find('.correct').removeClass('invalid');
                }
            }
            else {
                row.removeClass('invalid empty').addClass('valid');
            }

            // update line number
            var rowIndex = '' + (row.parents('.results').find('.card-row:not(.removed)').index(row) + 1);
            if(row.find('.input.type > span').text() != rowIndex) {
                row.find('.input.type > span').text(rowIndex);
            }
        }
        for(var p = 0; p < packRows.length; p++) {
            var row2 = $(packRows[p]);
            if(row2.find('.name input').val().trim() != '') {
                row2.removeClass('invalid empty').addClass('valid').find('.name').removeClass('invalid');
            }
            else {
                row2.removeClass('valid empty').addClass('invalid').find('.name').addClass('invalid');
            }
        }

        var hasError = false;
        if(tab.find('.card-row.invalid:not(.empty):not(.removed):not(.template)').length > 0) {
            tab.addClass('has-card-error');
            hasError = true;
        }
        else {
            tab.removeClass('has-card-error')
        }

        if(tab.find('.pack-row.valid:not(.empty):not(.removed):not(.template)').length > 0) {
            tab.removeClass('has-pack-error').find('.highlighted-link a[href^="#save-"]').removeAttr('disabled');
        }
        else {
            hasError = true;
            tab.addClass('has-pack-error').find('.highlighted-link a[href^="#save-"]').attr('disabled', 'disabled');
        }

        if(hasError) {
            tab.addClass('has-error').find('.pack-row:not(.template):not(.removed) .status').addClass('read-only');
        }
        else {
            tab.removeClass('has-error').find('.pack-row:not(.template):not(.removed) .status').removeClass('read-only');
        }

        if(cardRows.length > 0) {
            updatePreview.apply(cardRows.filter('.selected').first());
        }
        // save at most every 2 seconds, don't autosave from admin lists
        if (autoSaveTimeout === null && $('.panel-pane[id^="packs-"]:visible').length > 0) {
            autoSaveTimeout = setTimeout(function () {
                standardSave.apply(tab, [{}]);
                autoSaveTimeout = null;
            }, 2000);
        }
    }

    body.on('resulted.saved', '[id^="packs-"] .results', function (evt) {
        var results = $(this);
        var tab = results.closest('.panel-pane');
        autoSaveTimeout = null;
        if (tab.is('#packs-pack0') && typeof evt['results']['results']['pack'][0] != 'undefined') {
            window.views.render.apply(tab, ['packs', {entity: evt['results']['results']['pack'][0]}]);
            results.data('request', $.extend(results.data('request'), {requestKey: evt['results'].requestKey})); // replace key because template clears it
            var id = getTabId.apply(results);
            window.activateMenu(Routing.generate('packs_edit', {pack: id}));
            // save cards next!
            standardSave.apply(tab.find('.card-list .results'), [{}]);
            loadResults.apply(tab.find('.group-list .results'));
        }
        var loaded = body.find('#packs'); // only top level packs page because packs cannot affect other pack pages
        loaded.off('show.resulted').one('show.resulted', function () {
            loadResults.apply($(this).find('.results'));
        });
    });

    body.on('resulted.saved', '[id^="groups-"] .results', function () {
        var loaded = body.find('[id^="packs"]:not(#packs-pack0)');
        loaded.off('show.resulted').one('show.resulted', function () {
            loadResults.apply($(this).find('.results'));
        });
    });

    // TODO: shouldn't need to do this anymore
    function setupPackEditor() {
        autoSaveTimeout = 0;
        var tab = $(this).closest('.panel-pane');
        var cardRows = tab.find('.card-row:not(.removed):not(.template)');

        setTimeout(function () {
            for(var i = 0; i < cardRows.length; i++) {
                var row = $(cardRows[i]);
                if (row.find('.correct .radios :checked').length > 0) {
                    row.find('.correct textarea, .correct .radios').scrollTop(row.find('.correct .radios input').index(row.find('.correct .radios :checked')) * 22 - 2);
                }

                // update line number
                var rowIndex = '' + (i + 1);
                if(row.find('.input.type > span').text() != rowIndex) {
                    row.find('.input.type > span').text(rowIndex);
                }
            }
        }, 50);

        var select = tab.find('.pack-row:not(.template) .status select');
        select.data('oldValue', select.val());
        resizeTextAreas.apply(tab.find('.card-row:not(.template):not(.removed)'));
        tab.find('.card-row:not(.template):not(.removed)').first().filter(':not(.selected)').trigger('mousedown');

        autoSaveTimeout = null;
    }

    body.on('click', '.panel-pane[id^="packs-"] a[href="#edit-pack"]', setupPackEditor);
    body.on('show', '.panel-pane[id^="packs-"]', setupPackEditor);

    // TODO: generalize and move this to dashboard using some sort of property binding API, data-target, data-toggle for selects toggles class of closest matching target?
    // TODO: data-toggle="modal" on option brings up dialog for confirmation

    body.on('change change.confirm', '[id^="packs-"] .status select', function (evt) {
        var row = $(this).parents('.pack-row');
        var select = $(this);

        if($(this).val() == 'GROUP' && evt.namespace == 'confirm') {
            select.val(select.data('oldValue'));
            evt.preventDefault();
            showPublishDialog.apply(select, [getRowId.apply(row), row.find('.name input').val(), select.data('publish')]);
        }
        else {
            select.data('oldValue', select.val());
        }

        var pack = {};
        window.views.render.apply(row.find('> .status'), ['cell_status_pack', {pack: pack}]);
    });

    body.on('click', '[id^="cards"] .card-row .preview-card:not([class*="type-"])', function () {
        // go to answer without submitting for flash card
        var id = getRowId.apply($(this).parents('.card-row'));
        activateMenu(Routing.generate('cards_answers', {answer: id}));
    });

    body.on('show', '[id^="cards"]', function () {
        body.addClass('study-mode');
        $('#jquery_jplayer').jPlayer('option', 'cssSelectorAncestor', '.preview-play:visible');
        goFullscreen();
        if(!$(this).is('.loaded')) {
            $(this).addClass('loaded');
        }
        else {
            loadResults.apply($(this).find('.results'));
        }
    });

    body.on('show', '#home', function () {
        Cookies.set('retention', moment(new Date()).formatPHP('r'), { expires: 7 });
        if(!$(this).is('.loaded')) {
            $(this).addClass('loaded');
        }
        else {
            loadResults.apply($(this).find('.results'));
        }
        body.removeClass('study-mode');
        if (document.cancelFullScreen) {
            document.cancelFullScreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if (document.webkitCancelFullScreen) {
            document.webkitCancelFullScreen();
        }
    });

    function goFullscreen() {
        if ((document.fullScreenElement && document.fullScreenElement !== null) ||
            (!document.mozFullScreen && !document.webkitIsFullScreen)) {
            if (document.documentElement.requestFullScreen) {
                document.documentElement.requestFullScreen();
            } else if (document.documentElement.mozRequestFullScreen) {
                document.documentElement.mozRequestFullScreen();
            } else if (document.documentElement.webkitRequestFullScreen) {
                document.documentElement.webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT);
            }
        }
    }

    body.on('click', 'a[href^="/cards"]', function () {
        goFullscreen();
    });

    body.on('click', '[id^="home"] .user-shuffle a[href^="/cards"]', function () {
        Cookies.set('retention_shuffle', $(this).is('header a'));
    });

    body.on('click', '[id^="cards"] .cardResult a[href^="/cards"]', function () {
        Cookies.set('retention', moment(new Date()).formatPHP('r'), { expires: 7 });
    });

    body.on('click', '[id^="cards"] .card-row .preview-answer:not([class*="type-"]) [href="#wrong"], [id^="cards"] .card-row .preview-answer:not([class*="type-"]) [href="#right"]', function (evt) {
        evt.preventDefault();
        var id = getRowId.apply($(this).parents('.card-row'));
        var correct = $(this).is('[href="#right"]');
        var packId = Cookies.get('retention_shuffle') == 'true' ? null : $(this).parents('.panel-pane').data('card').pack.id;
        $.ajax({
            url: Routing.generate('responses', {user:$('#welcome-message').data('user').id}),
            type: 'POST',
            dataType: 'json',
            data: {
                pack: packId,
                correct : correct,
                card : id,
                created : new Date(),
                answer: ''
            },
            success: function (data) {
                body.one('hiding', '[id^="cards"]', function () {
                    $(this).stop().hide();
                });
                body.one('showing', '.panel-pane', function () {
                    $(this).stop().css({left: 0});
                    doFlash(correct);
                });
                pickNextCard(data, packId);
            },
            error: function () {
            }
        });
    });

    function pickNextCard(data, packId) {
        var retentionDate = Cookies.get('retention');
        if(retentionDate == null) {
            Cookies.set('retention', retentionDate = moment(new Date()).formatPHP('r'), { expires: 7 });
        }
        var retention = data.retention;
        if(typeof retention[0] == 'undefined' || typeof retention[0].retention.constructor != Array) {
            retention = [data];
        }

        var remaining = [];
        for(var j in retention) {
            if(!retention.hasOwnProperty(j)) {
                continue;
            }
            for(var i in retention[j].retention) {
                if(!retention[j].retention.hasOwnProperty(i)) {
                    continue;
                }
                if(retention[j].retention[i][2] && (!retention[j].retention[i][3]
                    || new Date(retention[j].retention[i][3]) < new Date(retentionDate))) {
                    remaining[remaining.length] = i;
                }
            }
        }

        // TODO: created results tab without callback
        if(remaining.length > 0) {
            var id = remaining[Math.floor(Math.random() * remaining.length)];
            activateMenu(Routing.generate('cards', {card: id}));
        }
        else {
            // TODO: go to results page
            activateMenu(Routing.generate('cards_result', {pack: packId}));
        }
        // TODO: pick card based on last time hitting home page, same retention rules as in the app
    }

    function setupProgress() {
        if(!$(this).is('.setup-progress') && $(this).find('.preview-progress').length > 0) {
            $(this).data('progress', new ProgressBar.Circle($(this).find('.preview-progress')[0], {
                strokeWidth: 12,
                easing: 'linear',
                duration: 250,
                color: '#09B',
                trailColor: '#BBB',
                trailWidth: 12,
                svgStyle: null
            }));
            $(this).addClass('setup-progress');
        }
    }

    body.on('show', '[id^="cards"]', setupProgress);

    var jPlayer = $('#jquery_jplayer');
    jPlayer.bind($.jPlayer.event.timeupdate, function (evt) {
        var player = $('#jquery_jplayer').data('jPlayer');
        var progress = $('.preview-progress:visible').parents('.setup-progress').data('progress');
        progress.stop();
        progress.animate(player.status.currentTime / player.status.duration);
    });

    function doFlash(correct) {
        if(correct) {
            $('<div class="flash-right"><span>✔︎</span></div>').appendTo(body).animate({opacity: 0}, 1000, function () {
                $(this).remove();
            });
        }
        else {
            $('<div class="flash-wrong"><span>✘</span></div>').appendTo(body).animate({opacity: 0}, 1000, function () {
                $(this).remove();
            });
        }
    }

    body.on('click', '[id^="cards"] .card-row .type-mc .preview-response, [id^="cards"] .card-row .type-tf a', function (evt) {
        evt.preventDefault();
        var id = getRowId.apply($(this).parents('.card-row'));
        var correct = $(this).is('.correct');
        var packId = Cookies.get('retention_shuffle') == 'true' ? null : $(this).parents('.panel-pane').data('card').pack.id;
        $.ajax({
            url: Routing.generate('responses', {user:$('#welcome-message').data('user').id}),
            type: 'POST',
            dataType: 'json',
            data: {
                pack: packId,
                correct : correct,
                card : id,
                created : new Date(),
                answer: ((/answer-id-([0-9]*)/).exec($(this).attr('class')) || [])[1]
            },
            success: function (data) {
                body.one('hiding', '[id^="cards"]', function () {
                    $(this).stop().hide();
                });
                body.one('showing', '.panel-pane', function () {
                    $(this).stop().css({left: 0});
                    doFlash(correct);
                });
                if(!correct) {
                    activateMenu(Routing.generate('cards_answers', {answer: id}));
                    body.one('click', '#cards-answer' + id + ' .card-row .preview-answer[class*="type-"]', function () {
                        pickNextCard(data, packId);
                    });
                    return;
                }
                pickNextCard(data, packId);
            },
            error: function () {
            }
        });
    });

    body.on('click', '[id^="cards"] .card-row .type-sa a[href="#done"]', function (evt) {
        evt.preventDefault();
        var id = getRowId.apply($(this).parents('.card-row'));
        var input = $(this).parents('.card-row input');
        // check answer
        var correct = (new RegExp(input.data('correct'), 'i')).exec(input.val()) != null;
        var packId = Cookies.get('retention_shuffle') == 'true' ? null : $(this).parents('.panel-pane').data('card').pack.id;
        $.ajax({
            url: Routing.generate('responses', {user:$('#welcome-message').data('user').id}),
            type: 'POST',
            dataType: 'json',
            data: {
                pack: packId,
                correct : correct,
                card : id,
                created : new Date(),
                value : input.val(),
                answer: ((/answer-id-([0-9]*)/).exec($(this).attr('class')) || [])[1]
            },
            success: function (data) {
                body.one('hiding', '[id^="cards"]', function () {
                    $(this).stop().hide();
                });
                body.one('showing', '.panel-pane', function () {
                    $(this).stop().css({left: 0});
                    doFlash(correct);
                });
                if(!correct) {
                    activateMenu(Routing.generate('cards_answers', {answer: id}));
                    body.one('click', '#cards-answer' + id + ' .card-row .preview-answer[class*="type-"]', function () {
                        pickNextCard(data, packId);
                    });
                    return;
                }
                pickNextCard(data, packId);
            },
            error: function () {
            }
        });
    });

});

