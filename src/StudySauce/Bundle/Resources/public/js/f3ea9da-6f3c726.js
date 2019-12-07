/*!
 * jQuery scrollintoview() plugin and :scrollable selector filter
 *
 * Version 1.8 (14 Jul 2011)
 * Requires jQuery 1.4 or newer
 *
 * Copyright (c) 2011 Robert Koritnik
 * Licensed under the terms of the MIT license
 * http://www.opensource.org/licenses/mit-license.php
 */

(function ($) {
	var converter = {
		vertical: { x: false, y: true },
		horizontal: { x: true, y: false },
		both: { x: true, y: true },
		x: { x: true, y: false },
		y: { x: false, y: true }
	};

	var settings = {
		duration: "fast",
		direction: "both"
	};

	var rootrx = /^(?:html)$/i;

	// gets border dimensions
	var borders = function (domElement, styles) {
		styles = styles || (document.defaultView && document.defaultView.getComputedStyle ? document.defaultView.getComputedStyle(domElement, null) : domElement.currentStyle);
		var px = document.defaultView && document.defaultView.getComputedStyle ? true : false;
		var b = {
			top: (parseFloat(px ? styles.borderTopWidth : $.css(domElement, "borderTopWidth")) || 0),
			left: (parseFloat(px ? styles.borderLeftWidth : $.css(domElement, "borderLeftWidth")) || 0),
			bottom: (parseFloat(px ? styles.borderBottomWidth : $.css(domElement, "borderBottomWidth")) || 0),
			right: (parseFloat(px ? styles.borderRightWidth : $.css(domElement, "borderRightWidth")) || 0)
		};
		return {
			top: b.top,
			left: b.left,
			bottom: b.bottom,
			right: b.right,
			vertical: b.top + b.bottom,
			horizontal: b.left + b.right
		};
	};

	var dimensions = function ($element) {
		var win = $(window);
		var isRoot = rootrx.test($element[0].nodeName);
		return {
			border: isRoot ? { top: 0, left: 0, bottom: 0, right: 0} : borders($element[0]),
			scroll: {
				top: (isRoot ? win : $element).scrollTop(),
				left: (isRoot ? win : $element).scrollLeft()
			},
			scrollbar: {
				right: isRoot ? 0 : $element.innerWidth() - $element[0].clientWidth,
				bottom: isRoot ? 0 : $element.innerHeight() - $element[0].clientHeight
			},
			rect: (function () {
				var r = $element[0].getBoundingClientRect();
				return {
					top: isRoot ? 0 : r.top,
					left: isRoot ? 0 : r.left,
					bottom: isRoot ? $element[0].clientHeight : r.bottom,
					right: isRoot ? $element[0].clientWidth : r.right
				};
			})()
		};
	};

	$.fn.extend({
		scrollintoview: function (options) {
			/// <summary>Scrolls the first element in the set into view by scrolling its closest scrollable parent.</summary>
			/// <param name="options" type="Object">Additional options that can configure scrolling:
			///        duration (default: "fast") - jQuery animation speed (can be a duration string or number of milliseconds)
			///        direction (default: "both") - select possible scrollings ("vertical" or "y", "horizontal" or "x", "both")
			///        complete (default: none) - a function to call when scrolling completes (called in context of the DOM element being scrolled)
			/// </param>
			/// <return type="jQuery">Returns the same jQuery set that this function was run on.</return>

			options = $.extend({}, settings, options);
			options.direction = converter[typeof (options.direction) === "string" && options.direction.toLowerCase()] || converter.both;

			var dirStr = "";
			if (options.direction.x === true) dirStr = "horizontal";
			if (options.direction.y === true) dirStr = dirStr ? "both" : "vertical";

			var el = this.eq(0);
			var scroller = el.closest(":scrollable(" + dirStr + ")");

            if(typeof options.padding == 'undefined')
                options.padding = {top:0,left:0,right:0,bottom:0};
            // check if there's anything to scroll in the first place
			if (scroller.length > 0)
			{
				scroller = scroller.eq(0);

				var dim = {
					e: dimensions(el),
					s: dimensions(scroller)
				};

				var rel = {
					top: dim.e.rect.top - (dim.s.rect.top + dim.s.border.top) - options.padding.top,
					bottom: dim.s.rect.bottom - dim.s.border.bottom - dim.s.scrollbar.bottom - dim.e.rect.bottom - options.padding.bottom,
					left: dim.e.rect.left - (dim.s.rect.left + dim.s.border.left) - options.padding.left,
					right: dim.s.rect.right - dim.s.border.right - dim.s.scrollbar.right - dim.e.rect.right - options.padding.right
				};

				var animOptions = {};

				// vertical scroll
				if (options.direction.y === true)
				{
					if (rel.top < 0)
					{
						animOptions.scrollTop = dim.s.scroll.top + rel.top;
					}
					else if (rel.top > 0 && rel.bottom < 0)
					{
						animOptions.scrollTop = dim.s.scroll.top + Math.min(rel.top, -rel.bottom);
					}
				}

				// horizontal scroll
				if (options.direction.x === true)
				{
					if (rel.left < 0)
					{
						animOptions.scrollLeft = dim.s.scroll.left + rel.left;
					}
					else if (rel.left > 0 && rel.right < 0)
					{
						animOptions.scrollLeft = dim.s.scroll.left + Math.min(rel.left, -rel.right);
					}
				}

				// scroll if needed
				if (!$.isEmptyObject(animOptions))
				{
					if (rootrx.test(scroller[0].nodeName))
					{
						scroller = $("html,body");
					}
					scroller
						.animate(animOptions, options.duration)
						.eq(0) // we want function to be called just once (ref. "html,body")
						.queue(function (next) {
							$.isFunction(options.complete) && options.complete.call(scroller[0]);
							next();
						});
				}
				else
				{
					// when there's nothing to scroll, just call the "complete" function
					$.isFunction(options.complete) && options.complete.call(scroller[0]);
				}
			}

			// return set back
			return this;
		}
	});

	var scrollValue = {
		auto: true,
		scroll: true,
		visible: false,
		hidden: false
	};

	$.extend($.expr[":"], {
		scrollable: function (element, index, meta, stack) {
            var that = $(element);
			var direction = converter[typeof (meta[3]) === "string" && meta[3].toLowerCase()] || converter.both;
			var styles = (document.defaultView && document.defaultView.getComputedStyle ? document.defaultView.getComputedStyle(element, null) : element.currentStyle);
			var overflow = {
				x: scrollValue[styles.overflowX.toLowerCase()] || false,
				y: scrollValue[styles.overflowY.toLowerCase()] || false,
				isRoot: rootrx.test(element.nodeName)
			};

			// check if completely unscrollable (exclude HTML element because it's special)
			if (!overflow.x && !overflow.y && !overflow.isRoot && !that.is('[scrollable]'))
			{
				return false;
			}

			var size = {
				height: {
					scroll: element.scrollHeight,
					client: element.clientHeight
				},
				width: {
					scroll: element.scrollWidth,
					client: element.clientWidth
				},
				// check overflow.x/y because iPad (and possibly other tablets) don't dislay scrollbars
				scrollableX: function () {
					return (overflow.x || overflow.isRoot || that.attr('scrollable') == 'both' || that.attr('scrollable') == 'x' || that.attr('scrollable') == 'horizontal') && this.width.scroll > this.width.client;
				},
				scrollableY: function () {
					return (overflow.y || overflow.isRoot || that.attr('scrollable') == 'both' || that.attr('scrollable') == 'y' || that.attr('scrollable') == 'vertical') && this.height.scroll > this.height.client;
				}
			};
			return direction.y && size.scrollableY() || direction.x && size.scrollableX();
		}
	});
})(jQuery);

$(document).ready(function () {

    var pan = null;

    setTimeout(function () {
        var title = $('.landing-home .video h1');
        title.animate({left: 0, opacity: 1}, 1200);
        setTimeout(function () {
            // TODO: fade in video
            var video = $('.landing-home .player-wrapper');
            video.animate({opacity: 1}, 1200);
            setTimeout(function () {
                // fade in cta
                var cta = $('.landing-home .video .highlighted-link');
                cta.animate({top: 0, opacity: 1}, 1200);
            }, 500)
        }, 500)
    }, 200);

    var testimonies = false;

    $(window).on('DOMContentLoaded load resize scroll', checkForVisibility);

    function checkForVisibility()
    {
        var shouldLoad = false;
        var quotes = $('.landing-home .testimony-inner');
        quotes.each(function () {
            if(isElementInViewport($(this))) {
                shouldLoad = true;
            }
        });
        if(shouldLoad) {

            // make all testimonies visible
            if(!testimonies) {
                testimonies = true;

                quotes.each(function (i, el) {
                    setTimeout(function () {
                        // fade in cta
                        $(el).animate({left: 0, top: 0, opacity: 1}, 1200);
                    }, i * 500)
                });
            }
        }
    }

    checkForVisibility();
    onYouTubeIframeAPIReady.apply($('.landing-home'));

});
var DASHBOARD_MARGINS = {};

window.sincluding = [];
window.visits = [];
window.players = [];
window.jsErrors = [];
window.noError = false;

$(window).unload(function() {
    window.noError = true;
});
function getQueryObject(url) {
    var match,
        pl     = /\+/g,  // Regex for replacing addition symbol with a space
        search = /([^&=]+)=?([^&]*)/g,
        decode = function (s) { return decodeURIComponent(s.replace(pl, " ")); },
        query  = url.substr(url.indexOf('?') + 1);

    var urlParams = {};
    if(url.indexOf('?') > -1) {
        while (match = search.exec(query)) {
            var key = decode(match[1]);
            assignSubKey(urlParams, key, decode(match[2]));
        }
    }

    return urlParams;
}

function assignSubKey(obj, key, value) {
    var orig = obj;
    var keys = key.split(/\]?\[/ig);
    for(var k = 0; k < keys.length; k++) {
        var subKey = keys[k];
        if(subKey.substr(-1) == ']') {
            subKey = subKey.substr(0, subKey.length-1);
        }
        if (k == keys.length - 1) {
            if(typeof obj[subKey] == 'object' && obj[subKey] != null) {
                obj[subKey] = obj[subKey].constructor == Array ? $.merge(obj[subKey], value) : $.extend(true, obj[subKey], value);
            }
            else {
                obj[subKey] = value;
            }
        }
        else if (typeof obj[subKey] == 'undefined' || obj[subKey] == null) {
            obj[subKey] = {};
        }
        obj = obj[subKey];
    }
    return orig;
}

function setSelectionRange(input, selectionStart, selectionEnd) {
    if (input.setSelectionRange) {
        input.focus();
        input.setSelectionRange(selectionStart, selectionEnd);
    }
    else if (input.createTextRange) {
        var range = input.createTextRange();
        range.collapse(true);
        range.moveEnd('character', selectionEnd);
        range.moveStart('character', selectionStart);
        range.select();
    }
}

if (typeof key != 'undefined') {
    key.filter = function (event) {
        //var tagName = (event.target || event.srcElement).tagName;
        //key.setScope(/^(INPUT|TEXTAREA|SELECT)$/.test(tagName) ? 'input' : 'other');
        return true;
    };
}

+function ($) {
    'use strict';

    // TAB CLASS DEFINITION
    // ====================

    var Tab = function (element) {
        this.element = $(element)
    }

    Tab.VERSION = '3.2.0'

    Tab.prototype.show = function () {
        var $this    = this.element
        var $ul      = $this.closest('ul:not(.dropdown-menu)')
        var selector = $this.data('target')

        if (!selector) {
            selector = $this.attr('href')
            selector = selector && selector.replace(/.*(?=#[^\s]*$)/, '') // strip for ie7
        }

        if ($this.parent('li').hasClass('active')) return

        var previous = $ul.find('.active:last a')[0]
        var e        = $.Event('show.bs.tab', {
            relatedTarget: previous
        })

        $this.trigger(e)

        if (e.isDefaultPrevented()) return

        var $target = $(selector)

        this.activate($this.closest('li'), $ul)
        this.activate($target, $target.parent(), function () {
            $this.trigger({
                type: 'shown.bs.tab',
                relatedTarget: previous
            })
        })
    }

    Tab.prototype.activate = function (element, container, callback) {
        var $active    = container.find('> .active')
        var transition = callback
            && $.support.transition
            && $active.hasClass('fade')

        function next() {
            $active
                .removeClass('active')
                .find('> .dropdown-menu > .active')
                .removeClass('active')

            element.addClass('active')

            if (transition) {
                element[0].offsetWidth // reflow for transition
                element.addClass('in')
            } else {
                element.removeClass('fade')
            }

            if (element.parent('.dropdown-menu')) {
                element.closest('li.dropdown').addClass('active')
            }

            callback && callback()
        }

        transition ?
            $active
                .one('bsTransitionEnd', next)
                .emulateTransitionEnd(150) :
            next()

        $active.removeClass('in')
    }


    // TAB PLUGIN DEFINITION
    // =====================

    function Plugin(option) {
        return this.each(function () {
            var $this = $(this)
            var data  = $this.data('bs.tab')

            if (!data) $this.data('bs.tab', (data = new Tab(this)))
            if (typeof option == 'string') data[option]()
        })
    }

    var old = $.fn.tab

    $.fn.tab             = Plugin
    $.fn.tab.Constructor = Tab


    // TAB NO CONFLICT
    // ===============

    $.fn.tab.noConflict = function () {
        $.fn.tab = old
        return this
    }


    // TAB DATA-API
    // ============

    $(document).on('click', '[data-toggle="tab"], [data-toggle="pill"]', function (e) {
        e.preventDefault()
        Plugin.call($(this), 'show')
    })

}(jQuery);

function stacktrace() {
    function st2(f) {
        if(!f) {
            return [];
        }
        else {
            var args = [];
            for(var a = 0; a < args.length; a++) {
                args[args.length] = '' + f.arguments;
            }
            return st2(f.caller).concat([f.toString().split('(')[0].substring(9) + '(' + args.join(',') + ')']);
        }
    }
    return st2(arguments.callee.caller);
}

window.onerror = function (errorMessage, url, lineNumber, columnNo, error) {
    var message = "Error: [" + errorMessage + "], url: [" + url + "], line: [" + lineNumber + ":" + columnNo + "]";
    window.jsErrors.push(message);
    if(window.noError)
        return false;
    var dialog = $('#error');
    if(dialog.length > 0)
    {
        var stack = stacktrace();
        if(typeof error == 'object' && typeof error.stack != 'undefined') {
            stack = error.stack;
        }
        dialog.find('.modal-body').html(message + '<br />' + stack);
        dialog.modal({show:true});
    }
    return true;
};
RegExp.escape= function(s) {
    return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
};
// datepicker modifications to turn onAfterUpdate in to a settable event callback
$.datepicker._defaults.onAfterUpdate = null;

var datepicker__updateDatepicker = $.datepicker._updateDatepicker;
$.datepicker._updateDatepicker = function( inst ) {
    datepicker__updateDatepicker.call( this, inst );

    var onAfterUpdate = this._get(inst, 'onAfterUpdate');
    if (onAfterUpdate)
        onAfterUpdate.apply((inst.input ? inst.input[0] : null),
            [(inst.input ? inst.input.val() : ''), inst]);
};

function centerize() {
    $(this).each(function () {
        if(!($(this).is('.centerized'))) {
            $(this).addClass('centerized');
        }
        $(this).css('margin-top', '').css('top', '');
        var myheight = $(this).outerHeight(true);
        var relativeParent = $(this).parents().filter(function () {return (/relative|absolute|fixed/i).test($(this).css('position'));}).first();
        var relativeHeight = relativeParent.outerHeight();
        if(relativeParent.length == 0) {
            relativeParent = $(this).parent();
            relativeHeight = relativeParent.height();
        }
        else {

        }
        var offsetY = (relativeHeight - myheight) / 2;
        if(relativeParent.css('overflow') == 'auto' && offsetY < 0) {
            // this should scroll instead of centering
            offsetY = 0;
        }
        $(this).css((/relative/i).test($(this).css('position')) ? 'top' : 'margin-top', offsetY + 'px');
        if($(this).is('img')) {
            $(this).one('load', centerize);
        }
    });
}

function loadingAnimation(that)
{
    if(typeof that != 'undefined' && that.length > 0 && that.find('.squiggle').length == 0)
    {
        return loadingAnimation.call($('<small class="squiggle">&nbsp;</small>').appendTo(that), that);
    }
    else if ($(this).is('.squiggle'))
    {
        var width = $(this).parent().outerWidth(false);
        return $(this).css('width', 0).css('left', 0)
            .animate({width: width}, 1000, 'swing', function () {
                var width = $(this).parent().outerWidth(false);
                $(this).css('width', width).css('left', 0)
                    .animate({left: width, width: 0}, 1000, 'swing', loadingAnimation);
            });
    }
    else if(typeof that != 'undefined')
        return that.find('.squiggle');
}

function setupYoutubePlayer()
{
    var frame = $(this),
        ytPlayer = new YT.Player(frame.attr('id'), {
            events: {
                'onStateChange': function (e) {
                    var x = frame.offset().left,
                        y = frame.offset().top,
                        w = frame.width(),
                        h = frame.height();
                    frame.attr('class', (frame.attr('class') || '').replace(/yt-state-([0-9\-]*)(\s|$)/ig, '') + ' yt-state-' + e.data).trigger('yt' + e.data);
                    if(e.data == 1)
                    {
                        frame.css({
                            top: y,
                            left: x,
                            bottom: window.innerHeight - y + h,
                            right: window.innerWidth - x + w,
                            width: w / window.innerWidth * 100 + '%',
                            height: w / window.innerHeight * 100 + '%',
                            opacity: 0})
                            .animate({
                                top: 0,
                                bottom: 0,
                                right: 0,
                                left: 0,
                                height: '100%',
                                width: '100%',
                                opacity: 1}, 159);
                    }
                    /*
                     -1 – unstarted
                     0 – ended
                     1 – playing
                     2 – paused
                     3 – buffering
                     5 – video cued
                     */
                    _gaq.push(['_trackPageview', location.pathname + location.search  + '#yt' + e.data]);
                    visits[visits.length] = {path: window.location.pathname, query: window.location.search, hash: '#yt' + e.data, time:(new Date()).toJSON()};
                }
            }
        });
    $(ytPlayer).data('frame', frame);
    window.players[window.players.length] = ytPlayer;
}

function onYouTubeIframeAPIReady() {
    var frames = $(this).find('iframe[src*="youtube.com/embed"]');
    var delayed = function () {
        if(typeof YT != 'undefined' && typeof YT.Player != 'undefined')
            frames.each(setupYoutubePlayer);
        else
            setTimeout(delayed, 100);
    };
    delayed();
}

function isElementInViewport (el) {

    //special bonus for those using jQuery
    if (typeof jQuery === "function" && el instanceof jQuery) {
        el = el[0];
    }

    var rect = el.getBoundingClientRect();

    return !(0 > rect.right || document.documentElement.clientWidth < rect.left
        || 0 > rect.bottom || document.documentElement.clientHeight < rect.top);
}

function ssMergeStyles(content)
{
    var styles = $.merge(content.filter('link[type*="css"], style[type*="css"]'), content.find('link[type*="css"], style[type*="css"]'));

    var any = false;
    $(styles).each(function () {
        // remove version string
        var url;
        if (typeof (url = $(this).attr('href')) != 'undefined') {
            url = url.replace(/\?.*/ig, '');
            if ($('link[href*="' + url + '"]').length == 0) {
                $('head').append('<link href="' + url + '" type="text/css" rel="stylesheet" />');
                any = true;
            }
        }
        else {
            var re = (/url\("(.*?)"\)/ig),
                match,
                media = $(this).attr('media'),
                imports = false;
            while (match = re.exec($(this).html())) {
                imports = true;
                // remove version string
                url = match[1].replace(/\?.*/ig, '');
                if ($('link[href="' + url + '"]').length == 0 &&
                    $('style:contains("' + url + '")').length == 0) {
                    if (typeof media == 'undefined' || media == 'all') {
                        $('head').append('<link href="' + url + '" type="text/css" rel="stylesheet" />');
                        any = true;
                    }
                    else {
                        $('head').append('<style media="' + media + '">@import url("' + url + '");');
                        any = true;
                    }
                }
            }
            if(!imports)
                $('head').append($(this));
        }
    });

    // queue stylesheets if we are loading for a tab
    var pane;
    if (any && (pane = content.filter('.panel-pane').first()).length > 0) {

        //Wait for style to be loaded
        var wait = setInterval(function(){
            //Check for the style to be applied to the body
            if($('.css-loaded.' + pane.attr('id')).css('content').indexOf('loading-' + pane.attr('id')) > -1) {
                //CSS ready
                window.sincluding.splice(window.sincluding.indexOf('loading-' + pane.attr('id')), 1);
            }
            // clear loading if done loading all css
            var loading = 0;
            for(var i = 0; i < window.sincluding.length; i++) {
                if(window.sincluding[i].substr(0, 8) == 'loading-')
                    loading++;
            }
            if(loading == 0) {
                clearInterval(wait);
            }
        }, 100);

        $('<div class="css-loaded ' + pane.attr('id') + '"></div>').appendTo($('body'));
        window.sincluding.push('loading-' + pane.attr('id'))
    }

    return styles;
}

var alreadyLoadedScripts = [];
function ssMergeScripts(content)
{
    var scripts = $.merge(content.filter('script[type="text/javascript"]'), content.find('script[type="text/javascript"]'));
    $(scripts).each(function () {
        // TODO: remove version information from link, only load one version per page refresh
        var url = ($(this).attr('src') || '').replace(/\?.*/ig, '');
        if (url != '') {
            // only load script if it hasn't already been loaded
            if ($('script[src*="' + url + '"]').length == 0 && alreadyLoadedScripts.indexOf(url) == -1) {
                console.log(url);
                window.sincluding.push(url);
                $.getScript(url);
                alreadyLoadedScripts[alreadyLoadedScripts.length] = url;
            }
        }
        else {
            try
            {
                eval($(this).text());
            }
            catch(e)
            {
                console.log(e);
            }
        }
    });
    return scripts;
}

centerize.apply($('body').find('.centerized:visible'));

function gatherFields(fields, visibleOnly) {
    var fieldMatch = function (f) {
        return '[name="' + f + '"], [name^="' + f + '-"], [name^="' + f + '["]';
    };
    var context = $(this),
        form = context.closest('[class*="-row"],form').last().add('+ .expandable:not([class*="-row"])');
    var result = {};
    var formFields = [];
    if (form.is('form')) {
        formFields = form.serializeArray();
    }
    else {
        // must be a row, also include ID and tablename?
        for(var f in fields) {
            if (fields.hasOwnProperty(f)) {
                var key = fields[f];
                var inputField = context.find(fieldMatch(key));
                if(visibleOnly !== false) {
                    inputField = inputField.filter('input[type="hidden"],label:visible *,:visible,*:visible > *');
                }
                if(inputField.is('[name^="' + key + '["]')) {
                    key = inputField.attr('name');
                }
                var value = null;
                if (inputField.is('[type="checkbox"],[type="radio"]')) {
                    value = inputField.filter(':checked').val();
                }
                else if (inputField.is('.dateTimePicker')) {
                    value = inputField.datetimepicker('getValue');
                }
                else if (inputField.length > 0) {
                    value = inputField.val();
                }
                if(inputField.is('[data-prefix]')) {
                    // so we can prefix the command to the ORM to clear the list,
                    // unlike any other lists the entire list is provided by the answers field
                    value = inputField.data('prefix') + value;
                }
                if(inputField.is('[data-delimiter]')) {
                    value = value.split(new RegExp(inputField.data('delimiter'), 'ig'));
                }
                if(value != null) {
                    formFields[formFields.length] = {name: key, value: value};
                }
            }
        }
    }
    for(var i = 0; i < formFields.length; i++) {
        if((fields.indexOf(formFields[i].name) > -1 || fields.indexOf(formFields[i].name.split(/[-\[]/ig)[0]) > -1) &&
            (!visibleOnly || form.find(fieldMatch(fields[f])).filter(':visible').length > 0)) {
            assignSubKey(result, formFields[i].name, formFields[i].value);
        }
    }
    return result;
}

function applyFields(fields) {
    var context = $(this);
    for(var f in fields) {
        if (fields.hasOwnProperty(f)) {
            var inputField = context.find('[name="' + fields[f] + '"]:visible');
            if (inputField.is('[type="checkbox"],[type="radio"]')) {
                inputField.each(function () {
                    if($(this).val() == fields[f] || ($(this).val() == 'true' && fields[f]) || ($(this).val() == 'false' && !fields[f])) {
                        $(this).prop('checked', true);
                    }
                });
            }
            else if (inputField.is('.dateTimePicker')) {
                inputField.datetimepicker('setOptions', {value: new Date(fields[f])});
            }
            else {
                inputField.val(fields[f])
            }
        }
    }
}

$(document).ready(function () {
    var body = $('body');

    centerize.apply(body.find('.centerized:visible'));


    $(document).tooltip({
        items: '*[title]:not(iframe):not(.cke_editable):not(.cke),*[original-title]:not(iframe):not(.cke_editable):not(.cke)',
        position: { my: "center top", at: "center bottom+10" },
        content: function() {
            var element = $(this);
            if ( element.is( "[title]" ) ) {
                return $(this).attr('title');
            }
        }
    });

    /*
    $(document).on('mouseover', 'rect[title],path[title]', function () {
        var that = $(this);
        setTimeout(function () {
            var id = that.data('ui-tooltip-id'),
                tip = $('#' + id);
            tip.position({my: 'left-10 center'});
            tip.css('left', that.offset().left + that[0].getBBox().width + 10).css('top', that.offset().top + that[0].getBBox().height / 2 - tip.height() / 2);
            tip.addClass('left-arrow')
        }, 15);
    });
    */

    body.on('click', 'a[href="#yt-pause"]', function (evt) {
        evt.preventDefault();
        var frame = $(this).prev().closest('iframe');
        for(var i = 0; i < window.players.length; i++) {
            if ($(window.players[i]).data('frame').is(frame)) {
                window.players[i].pauseVideo();
            }
        }
    });

    $('.sinclude').each(function () {
        var that = $(this),
            url = that.attr('data-src');
        window.sincluding.push(url);
        $.ajax({
            url: url,
            type: 'GET',
            dataType: 'text',
            success: function (data)
            {
                var visible = $('.panel-pane:visible'),
                    newStuff = $(data),
                    styles = ssMergeStyles(newStuff),
                    scripts = ssMergeScripts(newStuff);
                newStuff = newStuff.not(styles).not(scripts);
                // do not merge top level items with IDs that already exist
                newStuff.filter('[id]').each(function () {
                    var id = $(this).attr('id');
                    if($('#' + id).length > 0)
                        newStuff = newStuff.not('#' + id);
                });
                that.replaceWith(newStuff);
                centerize.apply(newStuff.find('.centerized').add(newStuff.filter('.centerized')));
                newStuff.trigger('loaded');
            },
            error: function () {
            }
        });
    });

    function activatePanel(panel) {
        setTimeout(function () {
            if(panel.is(':visible')) {
                return;
            }
            // animate panels
            body.css('overflow', 'hidden');
            var panels = body.find('.panel-pane:visible').not(panel).addClass('hiding')
                .css({'position': 'absolute', left: 0}).animate({left: '-100%'}, { duration: 500, queue: false, done: function () {
                    panels.hide();
                } });
            panels.trigger('hiding');
            panel.addClass('showing').css({'position': 'absolute', 'left': '100%'}).show().animate({left: '0'}, { duration: 500, queue: false, done: function () {
                panel.css('position', '');
            } });
            panel.trigger('showing');
            setTimeout(function () {
                centerize.apply(panel.find('.centerized:visible'));
            }, 20);
            // poll for panel visibility and fire events
            var triggerHide = setInterval(function () {
                if (panels.is(':visible'))
                    return;
                panels.trigger('hide');
                panels.removeClass('hiding');
                body.css('overflow', '');
                setTimeout(function () {
                    panel.scrollintoview(DASHBOARD_MARGINS).trigger('show').removeClass('showing');
                    setTimeout(function () {
                        centerize.apply(panel.find('.centerized:visible'));
                    }, 20);
                }, 40);
                clearInterval(triggerHide);
            }, 40);
        }, 50);
    }
    window.activatePanel = activatePanel;

    // show the already visible tabs
    var panel = body.find('.panel-pane').first();
    if(panel.length > 0) {
        var key = panel.attr('id').replace(/-[a-z]+[0-9]+$/ig, '');
        if (Routing.getRoute(key)) {
            var path = Routing.generate(key),
                item = body.find('.main-menu a[href^="' + path + '"]').first();

            if (item.parents('nav').find('ul.collapse.in') != item.parents('ul.collapse.in'))
                item.parents('nav').find('ul.collapse.in').removeClass('in');
            item.addClass('active').parents('ul.collapse').addClass('in').css('height', '');
            var host;
            body.find('#welcome-message .main-menu a').each(function () {
                var parts = $(this).attr('href').split('/');
                parts[parts.length-1] = path.substr(1);
                $(this).attr('href', parts.join('/'));
            });
            if(!(host = body.find('#welcome-message .main-menu a[href*="' + window.location.hostname +  '"]')).is('.active')) {
                host.addClass('active');
            }
        }
        ssMergeStyles(body);
        setTimeout(function () {
            body.find('> *[id]').trigger('loaded');
            activatePanel.apply(body, [panel]);
        }, 20);
    }

});

$.ajaxPrefilter(function (options, originalOptions) {
    // do not send data for POST/PUT/DELETE
    if (originalOptions.type !== 'GET' || options.type !== 'GET') {
        return;
    }

    var data = originalOptions.data;
    if (originalOptions.data !== undefined) {
        if (Object.prototype.toString.call(originalOptions.data) === '[object String]') {
            data = $.deparam(originalOptions.data); // see http://benalman.com/code/projects/jquery-bbq/examples/deparam/
        }
    } else {
        data = {};
    }

    var visits = window.visits.slice(0, Math.min(10, window.visits.length));
    window.visits = window.visits.length <= 10 ? [] : window.visits.slice(10, window.visits.length);
    options.data = $.param($.extend(data, { __visits: visits }));
});

if(typeof window.jqAjax == 'undefined') {
    window.jqAjax = $.ajax;
    $.ajax = function (settings) {
        var success = settings.success,
            error = settings.error,
            url = settings.url;
        settings.success = function (data, textStatus, jqXHR) {
            window.sincluding.splice(window.sincluding.indexOf(url), 1);
            if (typeof data == 'string' && data.indexOf('{"redirect":') > -1) {
                try {
                    data = JSON.parse(data.substr(0, 4096)); // no way a redirect would be longer than that
                } catch (ignore) {

                }
            }
            if (data != null && typeof data.redirect != 'undefined') {
                var a = document.createElement('a');
                a.href = data.redirect;
                if (typeof window.handleLink == 'undefined' || window.handleLink.apply(a, [jQuery.Event('click')])) {
                    if (window.location.pathname != data.redirect) {
                        window.location = data.redirect;
                    }
                }
            }
            if (typeof success != 'undefined')
                success(data, textStatus, jqXHR);
        };
        settings.error = function ( jqXHR, textStatus, errorThrown) {
            window.sincluding.splice(window.sincluding.indexOf(url), 1);
            var message = "Error: [" + errorThrown + "], url: [" + url + "], status: [" + textStatus + "]";
            window.jsErrors.push(message);
            if (typeof error != 'undefined')
                error(jqXHR, textStatus, errorThrown);
        };
        return window.jqAjax(settings);
    };
}

$(document).ajaxError(function(event, jqXHR, ajaxSettings, thrownError) {
    if(window.noError)
        return false;
    var dialog = $('#error');
    if(dialog.length > 0 && thrownError !== "abort" && jqXHR.status !== 0)
    {
        var error = '';
        try {
            var content = $(jqXHR.responseText);
            if(content.filter('#error'))
                error = content.filter('#error').find('.pane-content').html();
        } catch(ex) {
            error = jqXHR.responseText;
        }
        finally {
            dialog.find('.modal-body').html(error);
            dialog.modal({show:true});
            throw thrownError;
        }
    }
});

// set some extra utility functions globally
Date.prototype.getWeekNumber = function () {
// Create a copy of this date object
    var target  = new Date(this.valueOf());

    // ISO week date weeks start on monday
    // so correct the day number
    var dayNr   = (this.getDay() + 6) % 7;

    // ISO 8601 states that week 1 is the week
    // with the first thursday of that year.
    // Set the target date to the thursday in the target week
    target.setDate(target.getDate() - dayNr + 3);

    // Store the millisecond value of the target date
    var firstThursday = target.valueOf();

    // Set the target to the first thursday of the year
    // First set the target to january first
    target.setMonth(0, 1);
    // Not a thursday? Correct the date to the next thursday
    if (target.getDay() != 4) {
        target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
    }

    // The weeknumber is the number of weeks between the
    // first thursday of the year and the thursday in the target week
    return 1 + Math.ceil((firstThursday - target) / 604800000); // 604800000 = 7 * 24 * 3600 * 1000
};

Date.prototype.getFirstDayOfWeek = function () {
    var d = new Date(+this);
    d.setHours(0, 0, 0, 0);
    var day = d.getDay(),
        diff = d.getDate() - day + (day == 0 ? 0:0); // adjust when day is sunday
    return new Date(d.setDate(diff));
};

Date.prototype.addHours = function(h){
    this.setHours(this.getHours()+h);
    return this;
};

$.fn.selectRange = function(start, end) {
    if(!end) end = start;
    return this.each(function() {
        if (this.setSelectionRange) {
            this.focus();
            this.setSelectionRange(start, end);
        } else if (this.createTextRange) {
            var range = this.createTextRange();
            range.collapse(true);
            range.moveEnd('character', end);
            range.moveStart('character', start);
            range.select();
        }
    });
};

$.fn.redraw = function(){
    var that = $(this);
    setTimeout(function () {
        that.each(function(){
            var redraw = this.offsetHeight,
                oldZ = this.zIndex;
            if(typeof this.style != 'undefined') {
                this.style.zIndex = 2;
                this.style.zIndex = oldZ;
                this.style.webkitTransform = 'scale(1)';
                this.style.webkitTransform = '';
            }
        });
    }, 10);
};

+function ($) {
    'use strict';

    // MODAL CLASS DEFINITION
    // ======================

    var Modal = function (element, options) {
        this.options        = options
        this.$body          = $(document.body)
        this.$element       = $(element)
        this.$backdrop      =
            this.isShown        = null
        this.scrollbarWidth = 0

        if (this.options.remote) {
            this.$element
                .find('.modal-content')
                .load(this.options.remote, $.proxy(function () {
                    this.$element.trigger('loaded.bs.modal')
                }, this))
        }
    }

    Modal.VERSION  = '3.2.0'

    Modal.DEFAULTS = {
        backdrop: true,
        keyboard: true,
        show: true
    }

    Modal.prototype.toggle = function (_relatedTarget) {
        return this.isShown ? this.hide() : this.show(_relatedTarget)
    }

    Modal.prototype.show = function (_relatedTarget) {
        var that = this
        var e    = $.Event('show.bs.modal', { relatedTarget: _relatedTarget })

        this.$element.trigger(e)

        if (this.isShown || e.isDefaultPrevented()) return

        this.isShown = true

        this.checkScrollbar()
        this.$body.addClass('modal-open')

        this.setScrollbar()
        this.escape()

        this.$element.on('click.dismiss.bs.modal', '[data-dismiss="modal"]', $.proxy(this.hide, this))

        this.backdrop(function () {
            var transition = $.support.transition && that.$element.hasClass('fade')

            if (!that.$element.parent().length) {
                that.$element.appendTo(that.$body) // don't move modals dom position
            }

            that.$element
                .show()
                .scrollTop(0)

            if (transition) {
                that.$element[0].offsetWidth // force reflow
            }

            that.$element
                .addClass('in')
                .attr('aria-hidden', false)

            that.enforceFocus()

            var e = $.Event('shown.bs.modal', { relatedTarget: _relatedTarget })

            transition ?
                that.$element.find('.modal-dialog') // wait for modal to slide in
                    .one('bsTransitionEnd', function () {
                        that.$element.trigger('focus').trigger(e)
                    })
                    .emulateTransitionEnd(300) :
                that.$element.trigger('focus').trigger(e)
        })
    }

    Modal.prototype.hide = function (e) {
        if (e) e.preventDefault()

        e = $.Event('hide.bs.modal')

        this.$element.trigger(e)

        if (!this.isShown || e.isDefaultPrevented()) return

        this.isShown = false

        this.$body.removeClass('modal-open')

        this.resetScrollbar()
        this.escape()

        $(document).off('focusin.bs.modal')

        this.$element
            .removeClass('in')
            .attr('aria-hidden', true)
            .off('click.dismiss.bs.modal')

        $.support.transition && this.$element.hasClass('fade') ?
            this.$element
                .one('bsTransitionEnd', $.proxy(this.hideModal, this))
                .emulateTransitionEnd(300) :
            this.hideModal()
    }

    Modal.prototype.enforceFocus = function () {
        $(document)
            .off('focusin.bs.modal') // guard against infinite focus loop
            .on('focusin.bs.modal', $.proxy(function (e) {
                if (this.$element[0] !== e.target && !this.$element.has(e.target).length) {
                    this.$element.trigger('focus')
                }
            }, this))
    }

    Modal.prototype.escape = function () {
        if (this.isShown && this.options.keyboard) {
            this.$element.on('keyup.dismiss.bs.modal', $.proxy(function (e) {
                e.which == 27 && this.hide()
            }, this))
        } else if (!this.isShown) {
            this.$element.off('keyup.dismiss.bs.modal')
        }
    }

    Modal.prototype.hideModal = function () {
        var that = this
        this.$element.hide()
        this.backdrop(function () {
            that.$element.trigger('hidden.bs.modal')
        })
    }

    Modal.prototype.removeBackdrop = function () {
        this.$backdrop && this.$backdrop.remove()
        this.$backdrop = null
    }

    Modal.prototype.backdrop = function (callback) {
        var that = this
        var animate = this.$element.hasClass('fade') ? 'fade' : ''

        if (this.isShown && this.options.backdrop) {
            var doAnimate = $.support.transition && animate

            this.$backdrop = $('<div class="modal-backdrop ' + animate + '"><div class="modal-backdrop-top" /><div class="modal-backdrop-right" /><div class="modal-backdrop-bottom" /><div class="modal-backdrop-left" /></div>')
                .appendTo(this.$body)

            this.$element.on('click.dismiss.bs.modal', $.proxy(function (e) {
                if (e.target !== e.currentTarget) return
                this.options.backdrop == 'static'
                    ? this.$element[0].focus.call(this.$element[0])
                    : this.hide.call(this)
            }, this))

            if (doAnimate) this.$backdrop[0].offsetWidth // force reflow

            this.$backdrop.addClass('in')

            if (!callback) return

            doAnimate ?
                this.$backdrop
                    .one('bsTransitionEnd', callback)
                    .emulateTransitionEnd(150) :
                callback()

        } else if (!this.isShown && this.$backdrop) {
            this.$backdrop.removeClass('in')

            var callbackRemove = function () {
                that.removeBackdrop()
                callback && callback()
            }
            $.support.transition && this.$element.hasClass('fade') ?
                this.$backdrop
                    .one('bsTransitionEnd', callbackRemove)
                    .emulateTransitionEnd(150) :
                callbackRemove()

        } else if (callback) {
            callback()
        }
    }

    Modal.prototype.checkScrollbar = function () {
        if (document.body.clientWidth >= window.innerWidth) return
        this.scrollbarWidth = this.scrollbarWidth || this.measureScrollbar()
    }

    Modal.prototype.setScrollbar = function () {
        var bodyPad = parseInt((this.$body.css('padding-right') || 0), 10)
        if (this.scrollbarWidth) this.$body.css('padding-right', bodyPad + this.scrollbarWidth)
    }

    Modal.prototype.resetScrollbar = function () {
        this.$body.css('padding-right', '')
    }

    Modal.prototype.measureScrollbar = function () { // thx walsh
        var scrollDiv = document.createElement('div')
        scrollDiv.className = 'modal-scrollbar-measure'
        this.$body.append(scrollDiv)
        var scrollbarWidth = scrollDiv.offsetWidth - scrollDiv.clientWidth
        this.$body[0].removeChild(scrollDiv)
        return scrollbarWidth
    }


    // MODAL PLUGIN DEFINITION
    // =======================

    function Plugin(option, _relatedTarget) {
        return this.each(function () {
            var $this   = $(this)
            var data    = $this.data('bs.modal')
            var options = $.extend({}, Modal.DEFAULTS, $this.data(), typeof option == 'object' && option)

            if (!data) $this.data('bs.modal', (data = new Modal(this, options)))
            if (typeof option == 'string') data[option](_relatedTarget)
            else if (options.show) data.show(_relatedTarget)
        })
    }

    var old = $.fn.modal

    $.fn.modal             = Plugin
    $.fn.modal.Constructor = Modal


    // MODAL NO CONFLICT
    // =================

    $.fn.modal.noConflict = function () {
        $.fn.modal = old
        return this
    }


    // MODAL DATA-API
    // ==============

    $(document).on('click.bs.modal.data-api', '[data-toggle="modal"]', function (e) {
        var $this   = $(this)
        var href    = $this.attr('href')
        var $target = $($this.attr('data-target') || (href && href.replace(/.*(?=#[^\s]+$)/, ''))) // strip for ie7
        var option  = $target.data('bs.modal') ? 'toggle' : $.extend({ remote: !/#/.test(href) && href }, $target.data(), $this.data())

        if ($this.is('a')) e.preventDefault()

        $target.one('show.bs.modal', function (showEvent) {
            if (showEvent.isDefaultPrevented()) return // only register focus restorer if modal will actually get shown
            $target.one('hidden.bs.modal', function () {
                $this.is(':visible') && $this.trigger('focus')
            })
        })
        Plugin.call($target, option, this)
    })

}(jQuery);

$(document).ready(function () {
    var body = $('body');

    // show unsupported dialog if it is needed
    $('#unsupported').modal({
        backdrop: 'static',
        keyboard: false,
        show: true
    });

    if(!body.is('.landing-home') && window.location.pathname != '/cart') {
        var appUrl = 'studysauce://' + window.location.hostname + window.location.search;

        var appDialog = $('#gettheapp').modal({show: true});
        if (appDialog.length > 0 && (window.location.pathname == '/login' || window.location.pathname == '/register' || window.location.pathname == '/reset')) {
            appUrl += (window.location.search.indexOf('?') > -1 ? '&' : '?') + $('input').map(function () {
                    return $(this).attr('name') + '=' + $(this).attr('value');
                }).toArray().join("&");
            // TODO: show invite dialog
            appDialog.find('.highlighted-link a').attr('href', appUrl);
        }
    }

    var centerTimeout = null;
    $(window).resize(function () {
        DASHBOARD_MARGINS = {padding: {top: $('.header-wrapper').outerHeight(), bottom: 0, left: 0, right: 0}};
        if (centerTimeout != null) {
            clearTimeout(centerTimeout);
        }
        centerTimeout = setTimeout(function () {
            centerize.apply(body.find('.centerized:visible'));
        }, 50);
        adjustBackdrop();
    });
    $(window).trigger('resize');

    body.on('show.bs.modal shown.bs.modal', function () {
        centerize.apply($('body').find('.centerized:visible'));
        adjustBackdrop();
    });

    body.on('hidden.bs.modal hide.bs.modal', function () {
        $(this).find('.modal-content').stop();
        $(this).find('.modal-content').css('top', '');
        $(this).find('.modal-content').css('left', '');
    });

    body.on('shown.bs.modal', '.modal', function () {
        if($(this).is('.modal')) {
            var modals = $('.modal');
            //if(backdrops.length > 1)
            if(modals.length > 0)
                modals.not(this).filter(':visible').each(function () {
                    $(this).modal('hide').finish();
                    if($(this).data('bs.modal') != null) {
                        $(this).data('bs.modal').removeBackdrop();
                    }
                });
        }
    });

    var alreadyDragging = false;
    body.on('mousedown', '.modal-header', function (evt) {
        if(alreadyDragging) {
            return;
        }
        var content = $(this).parents('.modal-content');
        if(!content.is('.ui-draggable')) {
            alreadyDragging = true;
            setupDialog.apply(content).trigger(evt);
            alreadyDragging = false;
        }
    });

    function setupDialog () {
        var content = $(this);
        if(!content.is('.ui-draggable')) {
            content.draggable({
                handle: '.modal-header',
                drag: adjustBackdrop,
                containment: content.parents('.modal')
            });
        }
        return content;
    }

    var goingToY = 0;
    function adjustBackdrop(evt) {
        setTimeout(function () {
            var backdrop = $('.modal-backdrop:visible');
            var container = $('.modal:visible');
            var currentDialog = container.find('.modal-content');
            if(currentDialog.length == 0 || backdrop.length == 0) {
                return;
            }
            setupDialog.apply(currentDialog);
            var height = $(window).height();
            var width = $(window).width();
            var dialogHeight = currentDialog.outerHeight();
            var dialogWidth = currentDialog.outerWidth();
            var offset = currentDialog.offset();
            offset.top = offset.top - $(window).scrollTop();
            offset.left = offset.left - $(window).scrollLeft();
            backdrop.find('.modal-backdrop-left').css('margin-right', (width / 2) - offset.left - 1);
            backdrop.find('.modal-backdrop-right').css('margin-left', offset.left - (width / 2) + dialogWidth - 1);
            backdrop.find('.modal-backdrop-bottom').css('margin-top', offset.top - (height / 2) + dialogHeight - 1);
            backdrop.find('.modal-backdrop-top').css('margin-bottom', (height / 2) - offset.top - 1);
            var containment;
            if((typeof evt == 'undefined' || evt.type != 'drag') && typeof (containment = currentDialog.draggable('instance').containment) != 'undefined') {
                if(offset.top + dialogHeight > height && goingToY != containment[3] - containment[1]) {
                    container.css('overflow', 'hidden');
                    currentDialog.draggable('option', 'containment', false);
                    currentDialog.draggable('instance')._setContainment();
                    currentDialog.draggable('option', 'containment', container);
                    currentDialog.draggable('instance').helperProportions = {
                        width: dialogWidth,
                        height: dialogHeight
                    };
                    currentDialog.draggable('instance')._setContainment();
                    containment = currentDialog.draggable('instance').containment;
                    goingToY = containment[3] - containment[1];
                    if (goingToY < containment[1]) {
                        goingToY = containment[1];
                    }
                    currentDialog.stop().animate({top: containment[3] - containment[1], step: function () {
                        //adjustBackdrop();
                    }}, 250, function () {
                        // done?
                        //container.css('overflow', '');
                    });
                }
            }
        }, 13);
    }
    window.adjustBackdrop = adjustBackdrop;

    $(window).on('scroll', function () {
        adjustBackdrop();
    });

    body.on('hidden.bs.modal', '#general-dialog', function () {
        $(this).find('.modal-body').html('<p>put message here</p>');
    });

    body.on('hidden.bs.modal', '#general-dialog', function () {
        // don't do this too early, give the confirm button a chance to response
        setTimeout(function () {
            body.off('click.modify_entities_confirm');
            body.off('click.publish_confirm');
            body.off('click.confirm_action');
            body.off('click.confirm_navigation');
        }, 100);
    });

    /*
    body.on('change', 'input[data-confirm], select:has(option[data-confirm])', function () {
        // TODO: reset to oldValue, show confirmation dialog, then set to new value
        var that = $(this);
        var confirmDialog = '#general-dialog';
        var shouldConfirm = that.is('[data-confirm]'); // confirm everything except individual select options
        if(that.is('select')) {
            for(var o = 0; o < that.find('option[data-confirm]').length; o++) {
                if(that.val() == $(options[o]).attr('value')) {
                    shouldConfirm = true;
                    break;
                }
            }
        }
        that.val(that.data('oldValue'));
        $('#general-dialog').modal({show: true, backdrop: true})
            .find('.modal-body').html('Are you sure you want to set ');
    });
    */

    // data-toggle="modal" on option brings up dialog for confirmation

    body.on('click', 'a[data-confirm][data-toggle="modal"]', function (evt) {
        evt.preventDefault();
        var that = $(this);
        body.one('click.confirm_action', '#general-dialog a[href="#submit"]', function () {
            if(that.is('[data-action]')) {

                $.ajax({
                    url: that.data('action').replace(/\?.*/ig, ''),
                    type: 'POST',
                    data: $.extend({requestKey: getDataRequest.apply(that).requestKey}, getQueryObject(that.data('action'))),
                    dataType: 'json',
                    success: function (data) {
                        var event = $.Event('resulted.saved');
                        that.parents('.results').trigger(event);
                        if(!data.redirect) {
                            loadContent.apply(that.parents('.results'), [data]);
                        }
                    }
                });

            }
            else {
                // TODO: set the field value?
            }

        });

        $('#general-dialog').find('.modal-body').html(that.data('confirm'));
    });

    var alreadySetting = false;
    body.on('change', '#create-coupon input[name="packs"]', function () {
        if (alreadySetting) {
            return;
        }
        alreadySetting = true;
        var that = $(this);
        var value = that.val();
        var newItem = that[0].selectize.options[value];
        //var table = value.split('-')[0];
        //var id = parseInt(value.split('-')[1]);
        that[0].selectize.setValue('', true);
        that.blur();

        var newRow = $('<div class="pack-row" />');
        window.views.render('cell_collectionRow', {
            context: newRow,
            entity: newItem,
            tables: that.data('tables')
        });

        // TODO: add below search field same way entity dialog does?
        $(newRow).insertAfter($('#create-coupon').find('.entity-search header'));

        alreadySetting = false;
    });

    body.on('submit', '#create-coupon form', function (evt) {
        evt.preventDefault();
        var that = $(this);
        var results = $('#store').find('.results').first();
        var request = getDataRequest.apply(results);
        var dialog = $('#create-coupon');
        var data = gatherFields.apply(that, [['description', 'options']]);
        var obj = {tables: {coupon: ['description', 'options']}};
        assignSubKey(obj, 'coupon', data);
        obj.requestKey = request.requestKey;
        standardSave.apply(that, [obj, function (result) {
            // TODO: finish setting up new coupon by adding packs
            var coupon = result.results.coupon.pop();
            var packList = [];
            var obj = {};
            that.find('.entity-search .pack-row').each(function () {
                var row = $(this);
                var packs = gatherFields.apply(row, [['pack']]);
                var pack = null;
                for(var p in packs.pack)
                {
                    if(packs.pack.hasOwnProperty(p))
                    {
                        pack = packs.pack[p];
                        break;
                    }
                }
                pack.coupons = {id: coupon.id};
                packList[packList.length] = pack;
            });
            obj.pack = packList;
            obj.tables = {pack: ['coupons']};
            obj.requestKey = request.requestKey;
            standardSave.apply(that, [obj, function () {
                loadResults.apply(results);
                dialog.modal('hide');
            }]);
        }]);
    });

});
$(document).ready(function () {

    // TODO: bring back chat
    var body = $('body');

    function validateContact()
    {
        var contact = $(this).closest('#contact-support');
        if(contact.find('.name input').val().trim() == '') {
            contact.addClass('name-required');
        }
        else {
            contact.removeClass('name-required');
        }
        if(contact.find('.email input').val().trim() == '' ||
            !(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,6}\b/i).test(contact.find('.email input').val())) {
            contact.addClass('email-required');
        }
        else {
            contact.removeClass('email-required');
        }
        if(contact.find('.message textarea').val().trim() == '') {
            contact.addClass('message-required');
        }
        else {
            contact.removeClass('message-required');
        }

        if(contact.is('.name-required') || contact.is('.email-required') || contact.is('.message-required')) {
            contact.find('.highlighted-link').removeClass('valid').addClass('invalid');
        }
        else {
            contact.removeClass('invalid-only').find('.highlighted-link').removeClass('invalid').addClass('valid');
        }
    }

    body.on('shown.bs.modal', '#contact-support', validateContact);
    body.on('keyup', '#contact-support input, #contact-support textarea', validateContact);
    body.on('change', '#contact-support input, #contact-support textarea', validateContact);

    body.on('submit', '#contact-support form', function (evt) {
        evt.preventDefault();
        var contact = $('#contact-support');
        if(contact.find('.highlighted-link').is('.invalid')) {
            contact.addClass('invalid-only');
            if(contact.is('.name-required')) {
                contact.find('.name input').focus();
            }
            if(contact.is('.email-required')) {
                contact.find('.email input').focus();
            }
            if(contact.is('.message-required')) {
                contact.find('.message textarea').focus();
            }
            return;
        }
        contact.removeClass('valid').addClass('invalid');

        jQuery.ajax({
            url: Routing.generate('contact_send'),
            type: 'POST',
            dataType: 'json',
            data: {
                name: contact.find('.name input').val(),
                email: contact.find('.email input').val(),
                message: contact.find('.message textarea').val()
            },
            success: function () {
                contact.find('.message textarea').val('');
                contact.modal('hide');
            },
            error: function () {
                contact.removeClass('invalid').addClass('valid');
            }
        });
    });

    function validateDemo()
    {
        var contact = $(this).closest('#schedule-demo');
        if(contact.find('.first-name input').val().trim() == '') {
            contact.addClass('first-required');
        }
        else {
            contact.removeClass('first-required');
        }
        if(contact.find('.last-name input').val().trim() == '') {
            contact.addClass('last-required');
        }
        else {
            contact.removeClass('last-required');
        }
        if(contact.find('.email input').val().trim() == '' ||
            !(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,6}\b/i).test(contact.find('.email input').val())) {
            contact.addClass('email-required');
        }
        else {
            contact.removeClass('email-required');
        }
        if(contact.find('.company input').val().trim() == '') {
            contact.addClass('company-required');
        }
        else {
            contact.removeClass('company-required');
        }
        if(contact.find('.phone input').val().trim() == '') {
            contact.addClass('phone-required');
        }
        else {
            contact.removeClass('phone-required');
        }

        if(contact.is('.first-required') || contact.is('.last-required') || contact.is('.email-required') || contact.is('.company-required') || contact.is('.phone-required')) {
            contact.find('.highlighted-link').removeClass('valid').addClass('invalid');
        }
        else {
            contact.removeClass('invalid-only').find('.highlighted-link').removeClass('invalid').addClass('valid');
        }
    }

    body.on('shown.bs.modal', '#schedule-demo', validateDemo);
    body.on('keyup', '#schedule-demo input, #schedule-demo textarea', validateDemo);
    body.on('change', '#schedule-demo input, #schedule-demo textarea', validateDemo);

    body.on('submit', '#schedule-demo form', function (evt) {
        evt.preventDefault();
        var contact = $('#schedule-demo');
        if(contact.find('.highlighted-link').is('.invalid')) {
            contact.addClass('invalid-only');
            if(contact.is('.first-required')) {
                contact.find('.first-name input').focus();
            }
            else if(contact.is('.last-required')) {
                contact.find('.last-name input').focus();
            }
            else if(contact.is('.company-required')) {
                contact.find('.company input').focus();
            }
            else if(contact.is('.email-required')) {
                contact.find('.email input').focus();
            }
            else if(contact.is('.phone-required')) {
                contact.find('.phone input').focus();
            }
            return;
        }
        contact.find('.highlighted-link').removeClass('valid').addClass('invalid');

        jQuery.ajax({
            url: Routing.generate('contact_send'),
            type: 'POST',
            dataType: 'json',
            data: {
                name: contact.find('.first-name input').val() + ' ' + contact.find('.last-name input').val(),
                email: contact.find('.email input').val(),
                message: 'First: ' + contact.find('.first-name input').val() + "\r\n" +
                         'Last: ' + contact.find('.last-name input').val() + "\r\n" +
                         'Company: ' + contact.find('.company input').val() + "\r\n" +
                         'Phone: ' + contact.find('.phone input').val()
            },
            success: function () {
                contact.find('.message textarea').val('');
                contact.modal('hide');
            },
            error: function () {
                contact.removeClass('invalid').addClass('valid');
            }
        });
    });

    body.on('submit', '#bill-parents form', function (evt) {
        var contact = $('#bill-parents');
        evt.preventDefault();
        if(contact.find('.highlighted-link').is('.invalid')) {
            contact.addClass('invalid-only');
            if(contact.is('.first-required')) {
                contact.find('.first-name input').focus();
            }
            else if(contact.is('.last-required')) {
                contact.find('.last-name input').focus();
            }
            else if(contact.is('.email-required')) {
                contact.find('.email input').focus();
            }
            else if(contact.is('.your-first-required')) {
                contact.find('.your-first input').focus();
            }
            else if(contact.is('.your-last-required')) {
                contact.find('.your-last input').focus();
            }
            else if(contact.is('.your-email-required')) {
                contact.find('.your-email input').focus();
            }
            return;
        }
        loadingAnimation(contact.find('[value="#submit-contact"]'));
        contact.removeClass('valid').addClass('invalid');
        var data = {
            first: contact.find('.first-name input').val(),
            last: contact.find('.last-name input').val(),
            email: contact.find('.email input').val()
        };
        if(contact.find('.your-first input').length > 0) {
            data['yourFirst'] = contact.find('.your-first input').val().trim();
            data['yourLast'] = contact.find('.your-last input').val().trim();
            data['yourEmail'] = contact.find('.your-email input').val().trim();
        }
        jQuery.ajax({
            url: Routing.generate('contact_parents'),
            type: 'POST',
            dataType: 'json',
            data: data,
            success: function () {
                contact.find('.squiggle').stop().remove();
                contact.find('.first-name input, .last-name input, .email input, ' +
                            '.your-first input, .your-last input, .your-email input').val('');
                contact.modal('hide');
                $('#bill-parents-confirm').modal({show:true});
            },
            error: function () {
                contact.find('.squiggle').stop().remove();
            }
        });
    });

    function validateInvite()
    {
        var invite = $(this).closest('#student-invite, #bill-parents');
        var valid = true;
        if(invite.find('.first-name input').val().trim() == '') {
            invite.addClass('first-required');
        }
        else {
            invite.removeClass('first-required');
        }
        if(invite.find('.last-name input').val().trim() == '') {
            invite.addClass('last-required');
        }
        else {
            invite.removeClass('last-required');
        }
        if(invite.find('.email input').val().trim() == '' ||
            !(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,6}\b/i).test(invite.find('.email input').val())) {
            invite.addClass('email-required');
        }
        else {
            invite.removeClass('email-required');
        }
        if(invite.find('.your-first').length > 0) {
            if(invite.find('.your-first input').val().trim() == '') {
                invite.addClass('your-first-required');
            }
            else {
                invite.removeClass('your-first-required');
            }
            if(invite.find('.your-last input').val().trim() == '') {
                invite.addClass('your-last-required');
            }
            else {
                invite.removeClass('your-last-required');
            }
            if(invite.find('.your-email input').val().trim() == '' ||
                !(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,6}\b/i).test(invite.find('.your-email input').val())) {
                invite.addClass('your-email-required');
            }
            else {
                invite.removeClass('your-email-required');
            }
        }
        if(invite.is('.first-required') || invite.is('.last-required') || invite.is('.email-required') ||
            invite.is('.your-first-required') || invite.is('.your-last-required') || invite.is('.your-email-required'))
            invite.find('.highlighted-link').removeClass('valid').addClass('invalid');
        else
            invite.removeClass('invalid-only').find('.highlighted-link').removeClass('invalid').addClass('valid');
    }

    body.on('shown.bs.modal', '#student-invite, #bill-parents', validateInvite);
    body.on('keyup', '#student-invite input, #bill-parents input', validateInvite);
    body.on('change', '#student-invite input, #bill-parents input', validateInvite);

    body.on('submit', '#student-invite form', function (evt) {
        evt.preventDefault();
        var contact = $('#student-invite');
        if(contact.find('.highlighted-link').is('.invalid')) {
            contact.addClass('invalid-only');
            if(contact.is('.first-required')) {
                contact.find('.first-name input').focus();
            }
            else if(contact.is('.last-required')) {
                contact.find('.last-name input').focus();
            }
            else if(contact.is('.email-required')) {
                contact.find('.email input').focus();
            }
            else if(contact.is('.your-first-required')) {
                contact.find('.your-first input').focus();
            }
            else if(contact.is('.your-last-required')) {
                contact.find('.your-last input').focus();
            }
            else if(contact.is('.your-email-required')) {
                contact.find('.your-email input').focus();
            }
            return;
        }
        loadingAnimation(contact.find('[value="#submit-contact"]'));
        contact.find('.highlighted-link').removeClass('valid').addClass('invalid');
        var data = {
            first: contact.find('.first-name input').val(),
            last: contact.find('.last-name input').val(),
            email: contact.find('.email input').val()
        };
        if(contact.find('.your-first input').length > 0) {
            data['yourFirst'] = contact.find('.your-first input').val().trim();
            data['yourLast'] = contact.find('.your-last input').val().trim();
            data['yourEmail'] = contact.find('.your-email input').val().trim();
        }
        jQuery.ajax({
            url: Routing.generate('contact_students'),
            type: 'POST',
            dataType: 'json',
            data: data,
            success: function () {
                contact.find('.squiggle').stop().remove();
                contact.find('.first-name input, .last-name input, .email input, ' +
                            '.your-first input, .your-last input, .your-email input').val('');
                contact.modal('hide');
                $('#student-invite-confirm').modal({show:true});
            },
            error: function () {
                contact.find('.squiggle').stop().remove();
            }
        });
    });
});
/*! fancyBox v2.1.5 fancyapps.com | fancyapps.com/fancybox/#license */
(function(r,G,f,v){var J=f("html"),n=f(r),p=f(G),b=f.fancybox=function(){b.open.apply(this,arguments)},I=navigator.userAgent.match(/msie/i),B=null,s=G.createTouch!==v,t=function(a){return a&&a.hasOwnProperty&&a instanceof f},q=function(a){return a&&"string"===f.type(a)},E=function(a){return q(a)&&0<a.indexOf("%")},l=function(a,d){var e=parseInt(a,10)||0;d&&E(a)&&(e*=b.getViewport()[d]/100);return Math.ceil(e)},w=function(a,b){return l(a,b)+"px"};f.extend(b,{version:"2.1.5",defaults:{padding:15,margin:20,
    width:800,height:600,minWidth:100,minHeight:100,maxWidth:9999,maxHeight:9999,pixelRatio:1,autoSize:!0,autoHeight:!1,autoWidth:!1,autoResize:!0,autoCenter:!s,fitToView:!0,aspectRatio:!1,topRatio:0.5,leftRatio:0.5,scrolling:"auto",wrapCSS:"",arrows:!0,closeBtn:!0,closeClick:!1,nextClick:!1,mouseWheel:!0,autoPlay:!1,playSpeed:3E3,preload:3,modal:!1,loop:!0,ajax:{dataType:"html",headers:{"X-fancyBox":!0}},iframe:{scrolling:"auto",preload:!0},swf:{wmode:"transparent",allowfullscreen:"true",allowscriptaccess:"always"},
    keys:{next:{13:"left",34:"up",39:"left",40:"up"},prev:{8:"right",33:"down",37:"right",38:"down"},close:[27],play:[32],toggle:[70]},direction:{next:"left",prev:"right"},scrollOutside:!0,index:0,type:null,href:null,content:null,title:null,tpl:{wrap:'<div class="fancybox-wrap" tabIndex="-1"><div class="fancybox-skin"><div class="fancybox-outer"><div class="fancybox-inner"></div></div></div></div>',image:'<img class="fancybox-image" src="{href}" alt="" />',iframe:'<iframe id="fancybox-frame{rnd}" name="fancybox-frame{rnd}" class="fancybox-iframe" frameborder="0" vspace="0" hspace="0" webkitAllowFullScreen mozallowfullscreen allowFullScreen'+
    (I?' allowtransparency="true"':"")+"></iframe>",error:'<p class="fancybox-error">The requested content cannot be loaded.<br/>Please try again later.</p>',closeBtn:'<a title="Close" class="fancybox-item fancybox-close" href="javascript:;"></a>',next:'<a title="Next" class="fancybox-nav fancybox-next" href="javascript:;"><span></span></a>',prev:'<a title="Previous" class="fancybox-nav fancybox-prev" href="javascript:;"><span></span></a>'},openEffect:"fade",openSpeed:250,openEasing:"swing",openOpacity:!0,
    openMethod:"zoomIn",closeEffect:"fade",closeSpeed:250,closeEasing:"swing",closeOpacity:!0,closeMethod:"zoomOut",nextEffect:"elastic",nextSpeed:250,nextEasing:"swing",nextMethod:"changeIn",prevEffect:"elastic",prevSpeed:250,prevEasing:"swing",prevMethod:"changeOut",helpers:{overlay:!0,title:!0},onCancel:f.noop,beforeLoad:f.noop,afterLoad:f.noop,beforeShow:f.noop,afterShow:f.noop,beforeChange:f.noop,beforeClose:f.noop,afterClose:f.noop},group:{},opts:{},previous:null,coming:null,current:null,isActive:!1,
    isOpen:!1,isOpened:!1,wrap:null,skin:null,outer:null,inner:null,player:{timer:null,isActive:!1},ajaxLoad:null,imgPreload:null,transitions:{},helpers:{},open:function(a,d){if(a&&(f.isPlainObject(d)||(d={}),!1!==b.close(!0)))return f.isArray(a)||(a=t(a)?f(a).get():[a]),f.each(a,function(e,c){var k={},g,h,j,m,l;"object"===f.type(c)&&(c.nodeType&&(c=f(c)),t(c)?(k={href:c.data("fancybox-href")||c.attr("href"),title:c.data("fancybox-title")||c.attr("title"),isDom:!0,element:c},f.metadata&&f.extend(!0,k,
        c.metadata())):k=c);g=d.href||k.href||(q(c)?c:null);h=d.title!==v?d.title:k.title||"";m=(j=d.content||k.content)?"html":d.type||k.type;!m&&k.isDom&&(m=c.data("fancybox-type"),m||(m=(m=c.prop("class").match(/fancybox\.(\w+)/))?m[1]:null));q(g)&&(m||(b.isImage(g)?m="image":b.isSWF(g)?m="swf":"#"===g.charAt(0)?m="inline":q(c)&&(m="html",j=c)),"ajax"===m&&(l=g.split(/\s+/,2),g=l.shift(),l=l.shift()));j||("inline"===m?g?j=f(q(g)?g.replace(/.*(?=#[^\s]+$)/,""):g):k.isDom&&(j=c):"html"===m?j=g:!m&&(!g&&
    k.isDom)&&(m="inline",j=c));f.extend(k,{href:g,type:m,content:j,title:h,selector:l});a[e]=k}),b.opts=f.extend(!0,{},b.defaults,d),d.keys!==v&&(b.opts.keys=d.keys?f.extend({},b.defaults.keys,d.keys):!1),b.group=a,b._start(b.opts.index)},cancel:function(){var a=b.coming;a&&!1!==b.trigger("onCancel")&&(b.hideLoading(),b.ajaxLoad&&b.ajaxLoad.abort(),b.ajaxLoad=null,b.imgPreload&&(b.imgPreload.onload=b.imgPreload.onerror=null),a.wrap&&a.wrap.stop(!0,!0).trigger("onReset").remove(),b.coming=null,b.current||
    b._afterZoomOut(a))},close:function(a){b.cancel();!1!==b.trigger("beforeClose")&&(b.unbindEvents(),b.isActive&&(!b.isOpen||!0===a?(f(".fancybox-wrap").stop(!0).trigger("onReset").remove(),b._afterZoomOut()):(b.isOpen=b.isOpened=!1,b.isClosing=!0,f(".fancybox-item, .fancybox-nav").remove(),b.wrap.stop(!0,!0).removeClass("fancybox-opened"),b.transitions[b.current.closeMethod]())))},play:function(a){var d=function(){clearTimeout(b.player.timer)},e=function(){d();b.current&&b.player.isActive&&(b.player.timer=
        setTimeout(b.next,b.current.playSpeed))},c=function(){d();p.unbind(".player");b.player.isActive=!1;b.trigger("onPlayEnd")};if(!0===a||!b.player.isActive&&!1!==a){if(b.current&&(b.current.loop||b.current.index<b.group.length-1))b.player.isActive=!0,p.bind({"onCancel.player beforeClose.player":c,"onUpdate.player":e,"beforeLoad.player":d}),e(),b.trigger("onPlayStart")}else c()},next:function(a){var d=b.current;d&&(q(a)||(a=d.direction.next),b.jumpto(d.index+1,a,"next"))},prev:function(a){var d=b.current;
        d&&(q(a)||(a=d.direction.prev),b.jumpto(d.index-1,a,"prev"))},jumpto:function(a,d,e){var c=b.current;c&&(a=l(a),b.direction=d||c.direction[a>=c.index?"next":"prev"],b.router=e||"jumpto",c.loop&&(0>a&&(a=c.group.length+a%c.group.length),a%=c.group.length),c.group[a]!==v&&(b.cancel(),b._start(a)))},reposition:function(a,d){var e=b.current,c=e?e.wrap:null,k;c&&(k=b._getPosition(d),a&&"scroll"===a.type?(delete k.position,c.stop(!0,!0).animate(k,200)):(c.css(k),e.pos=f.extend({},e.dim,k)))},update:function(a){var d=
        a&&a.type,e=!d||"orientationchange"===d;e&&(clearTimeout(B),B=null);b.isOpen&&!B&&(B=setTimeout(function(){var c=b.current;c&&!b.isClosing&&(b.wrap.removeClass("fancybox-tmp"),(e||"load"===d||"resize"===d&&c.autoResize)&&b._setDimension(),"scroll"===d&&c.canShrink||b.reposition(a),b.trigger("onUpdate"),B=null)},e&&!s?0:300))},toggle:function(a){b.isOpen&&(b.current.fitToView="boolean"===f.type(a)?a:!b.current.fitToView,s&&(b.wrap.removeAttr("style").addClass("fancybox-tmp"),b.trigger("onUpdate")),
        b.update())},hideLoading:function(){p.unbind(".loading");f("#fancybox-loading").remove()},showLoading:function(){var a,d;b.hideLoading();a=f('<div id="fancybox-loading"><div></div></div>').click(b.cancel).appendTo("body");p.bind("keydown.loading",function(a){if(27===(a.which||a.keyCode))a.preventDefault(),b.cancel()});b.defaults.fixed||(d=b.getViewport(),a.css({position:"absolute",top:0.5*d.h+d.y,left:0.5*d.w+d.x}))},getViewport:function(){var a=b.current&&b.current.locked||!1,d={x:n.scrollLeft(),
        y:n.scrollTop()};a?(d.w=a[0].clientWidth,d.h=a[0].clientHeight):(d.w=s&&r.innerWidth?r.innerWidth:n.width(),d.h=s&&r.innerHeight?r.innerHeight:n.height());return d},unbindEvents:function(){b.wrap&&t(b.wrap)&&b.wrap.unbind(".fb");p.unbind(".fb");n.unbind(".fb")},bindEvents:function(){var a=b.current,d;a&&(n.bind("orientationchange.fb"+(s?"":" resize.fb")+(a.autoCenter&&!a.locked?" scroll.fb":""),b.update),(d=a.keys)&&p.bind("keydown.fb",function(e){var c=e.which||e.keyCode,k=e.target||e.srcElement;
        if(27===c&&b.coming)return!1;!e.ctrlKey&&(!e.altKey&&!e.shiftKey&&!e.metaKey&&(!k||!k.type&&!f(k).is("[contenteditable]")))&&f.each(d,function(d,k){if(1<a.group.length&&k[c]!==v)return b[d](k[c]),e.preventDefault(),!1;if(-1<f.inArray(c,k))return b[d](),e.preventDefault(),!1})}),f.fn.mousewheel&&a.mouseWheel&&b.wrap.bind("mousewheel.fb",function(d,c,k,g){for(var h=f(d.target||null),j=!1;h.length&&!j&&!h.is(".fancybox-skin")&&!h.is(".fancybox-wrap");)j=h[0]&&!(h[0].style.overflow&&"hidden"===h[0].style.overflow)&&
        (h[0].clientWidth&&h[0].scrollWidth>h[0].clientWidth||h[0].clientHeight&&h[0].scrollHeight>h[0].clientHeight),h=f(h).parent();if(0!==c&&!j&&1<b.group.length&&!a.canShrink){if(0<g||0<k)b.prev(0<g?"down":"left");else if(0>g||0>k)b.next(0>g?"up":"right");d.preventDefault()}}))},trigger:function(a,d){var e,c=d||b.coming||b.current;if(c){f.isFunction(c[a])&&(e=c[a].apply(c,Array.prototype.slice.call(arguments,1)));if(!1===e)return!1;c.helpers&&f.each(c.helpers,function(d,e){if(e&&b.helpers[d]&&f.isFunction(b.helpers[d][a]))b.helpers[d][a](f.extend(!0,
        {},b.helpers[d].defaults,e),c)});p.trigger(a)}},isImage:function(a){return q(a)&&a.match(/(^data:image\/.*,)|(\.(jp(e|g|eg)|gif|png|bmp|webp|svg)((\?|#).*)?$)/i)},isSWF:function(a){return q(a)&&a.match(/\.(swf)((\?|#).*)?$/i)},_start:function(a){var d={},e,c;a=l(a);e=b.group[a]||null;if(!e)return!1;d=f.extend(!0,{},b.opts,e);e=d.margin;c=d.padding;"number"===f.type(e)&&(d.margin=[e,e,e,e]);"number"===f.type(c)&&(d.padding=[c,c,c,c]);d.modal&&f.extend(!0,d,{closeBtn:!1,closeClick:!1,nextClick:!1,arrows:!1,
        mouseWheel:!1,keys:null,helpers:{overlay:{closeClick:!1}}});d.autoSize&&(d.autoWidth=d.autoHeight=!0);"auto"===d.width&&(d.autoWidth=!0);"auto"===d.height&&(d.autoHeight=!0);d.group=b.group;d.index=a;b.coming=d;if(!1===b.trigger("beforeLoad"))b.coming=null;else{c=d.type;e=d.href;if(!c)return b.coming=null,b.current&&b.router&&"jumpto"!==b.router?(b.current.index=a,b[b.router](b.direction)):!1;b.isActive=!0;if("image"===c||"swf"===c)d.autoHeight=d.autoWidth=!1,d.scrolling="visible";"image"===c&&(d.aspectRatio=
        !0);"iframe"===c&&s&&(d.scrolling="scroll");d.wrap=f(d.tpl.wrap).addClass("fancybox-"+(s?"mobile":"desktop")+" fancybox-type-"+c+" fancybox-tmp "+d.wrapCSS).appendTo(d.parent||"body");f.extend(d,{skin:f(".fancybox-skin",d.wrap),outer:f(".fancybox-outer",d.wrap),inner:f(".fancybox-inner",d.wrap)});f.each(["Top","Right","Bottom","Left"],function(a,b){d.skin.css("padding"+b,w(d.padding[a]))});b.trigger("onReady");if("inline"===c||"html"===c){if(!d.content||!d.content.length)return b._error("content")}else if(!e)return b._error("href");
        "image"===c?b._loadImage():"ajax"===c?b._loadAjax():"iframe"===c?b._loadIframe():b._afterLoad()}},_error:function(a){f.extend(b.coming,{type:"html",autoWidth:!0,autoHeight:!0,minWidth:0,minHeight:0,scrolling:"no",hasError:a,content:b.coming.tpl.error});b._afterLoad()},_loadImage:function(){var a=b.imgPreload=new Image;a.onload=function(){this.onload=this.onerror=null;b.coming.width=this.width/b.opts.pixelRatio;b.coming.height=this.height/b.opts.pixelRatio;b._afterLoad()};a.onerror=function(){this.onload=
        this.onerror=null;b._error("image")};a.src=b.coming.href;!0!==a.complete&&b.showLoading()},_loadAjax:function(){var a=b.coming;b.showLoading();b.ajaxLoad=f.ajax(f.extend({},a.ajax,{url:a.href,error:function(a,e){b.coming&&"abort"!==e?b._error("ajax",a):b.hideLoading()},success:function(d,e){"success"===e&&(a.content=d,b._afterLoad())}}))},_loadIframe:function(){var a=b.coming,d=f(a.tpl.iframe.replace(/\{rnd\}/g,(new Date).getTime())).attr("scrolling",s?"auto":a.iframe.scrolling).attr("src",a.href);
        f(a.wrap).bind("onReset",function(){try{f(this).find("iframe").hide().attr("src","//about:blank").end().empty()}catch(a){}});a.iframe.preload&&(b.showLoading(),d.one("load",function(){f(this).data("ready",1);s||f(this).bind("load.fb",b.update);f(this).parents(".fancybox-wrap").width("100%").removeClass("fancybox-tmp").show();b._afterLoad()}));a.content=d.appendTo(a.inner);a.iframe.preload||b._afterLoad()},_preloadImages:function(){var a=b.group,d=b.current,e=a.length,c=d.preload?Math.min(d.preload,
        e-1):0,f,g;for(g=1;g<=c;g+=1)f=a[(d.index+g)%e],"image"===f.type&&f.href&&((new Image).src=f.href)},_afterLoad:function(){var a=b.coming,d=b.current,e,c,k,g,h;b.hideLoading();if(a&&!1!==b.isActive)if(!1===b.trigger("afterLoad",a,d))a.wrap.stop(!0).trigger("onReset").remove(),b.coming=null;else{d&&(b.trigger("beforeChange",d),d.wrap.stop(!0).removeClass("fancybox-opened").find(".fancybox-item, .fancybox-nav").remove());b.unbindEvents();e=a.content;c=a.type;k=a.scrolling;f.extend(b,{wrap:a.wrap,skin:a.skin,
        outer:a.outer,inner:a.inner,current:a,previous:d});g=a.href;switch(c){case "inline":case "ajax":case "html":a.selector?e=f("<div>").html(e).find(a.selector):t(e)&&(e.data("fancybox-placeholder")||e.data("fancybox-placeholder",f('<div class="fancybox-placeholder"></div>').insertAfter(e).hide()),e=e.show().detach(),a.wrap.bind("onReset",function(){f(this).find(e).length&&e.hide().replaceAll(e.data("fancybox-placeholder")).data("fancybox-placeholder",!1)}));break;case "image":e=a.tpl.image.replace("{href}",
        g);break;case "swf":e='<object id="fancybox-swf" classid="clsid:D27CDB6E-AE6D-11cf-96B8-444553540000" width="100%" height="100%"><param name="movie" value="'+g+'"></param>',h="",f.each(a.swf,function(a,b){e+='<param name="'+a+'" value="'+b+'"></param>';h+=" "+a+'="'+b+'"'}),e+='<embed src="'+g+'" type="application/x-shockwave-flash" width="100%" height="100%"'+h+"></embed></object>"}(!t(e)||!e.parent().is(a.inner))&&a.inner.append(e);b.trigger("beforeShow");a.inner.css("overflow","yes"===k?"scroll":
        "no"===k?"hidden":k);b._setDimension();b.reposition();b.isOpen=!1;b.coming=null;b.bindEvents();if(b.isOpened){if(d.prevMethod)b.transitions[d.prevMethod]()}else f(".fancybox-wrap").not(a.wrap).stop(!0).trigger("onReset").remove();b.transitions[b.isOpened?a.nextMethod:a.openMethod]();b._preloadImages()}},_setDimension:function(){var a=b.getViewport(),d=0,e=!1,c=!1,e=b.wrap,k=b.skin,g=b.inner,h=b.current,c=h.width,j=h.height,m=h.minWidth,u=h.minHeight,n=h.maxWidth,p=h.maxHeight,s=h.scrolling,q=h.scrollOutside?
        h.scrollbarWidth:0,x=h.margin,y=l(x[1]+x[3]),r=l(x[0]+x[2]),v,z,t,C,A,F,B,D,H;e.add(k).add(g).width("auto").height("auto").removeClass("fancybox-tmp");x=l(k.outerWidth(!0)-k.width());v=l(k.outerHeight(!0)-k.height());z=y+x;t=r+v;C=E(c)?(a.w-z)*l(c)/100:c;A=E(j)?(a.h-t)*l(j)/100:j;if("iframe"===h.type){if(H=h.content,h.autoHeight&&1===H.data("ready"))try{H[0].contentWindow.document.location&&(g.width(C).height(9999),F=H.contents().find("body"),q&&F.css("overflow-x","hidden"),A=F.outerHeight(!0))}catch(G){}}else if(h.autoWidth||
        h.autoHeight)g.addClass("fancybox-tmp"),h.autoWidth||g.width(C),h.autoHeight||g.height(A),h.autoWidth&&(C=g.width()),h.autoHeight&&(A=g.height()),g.removeClass("fancybox-tmp");c=l(C);j=l(A);D=C/A;m=l(E(m)?l(m,"w")-z:m);n=l(E(n)?l(n,"w")-z:n);u=l(E(u)?l(u,"h")-t:u);p=l(E(p)?l(p,"h")-t:p);F=n;B=p;h.fitToView&&(n=Math.min(a.w-z,n),p=Math.min(a.h-t,p));z=a.w-y;r=a.h-r;h.aspectRatio?(c>n&&(c=n,j=l(c/D)),j>p&&(j=p,c=l(j*D)),c<m&&(c=m,j=l(c/D)),j<u&&(j=u,c=l(j*D))):(c=Math.max(m,Math.min(c,n)),h.autoHeight&&
    "iframe"!==h.type&&(g.width(c),j=g.height()),j=Math.max(u,Math.min(j,p)));if(h.fitToView)if(g.width(c).height(j),e.width(c+x),a=e.width(),y=e.height(),h.aspectRatio)for(;(a>z||y>r)&&(c>m&&j>u)&&!(19<d++);)j=Math.max(u,Math.min(p,j-10)),c=l(j*D),c<m&&(c=m,j=l(c/D)),c>n&&(c=n,j=l(c/D)),g.width(c).height(j),e.width(c+x),a=e.width(),y=e.height();else c=Math.max(m,Math.min(c,c-(a-z))),j=Math.max(u,Math.min(j,j-(y-r)));q&&("auto"===s&&j<A&&c+x+q<z)&&(c+=q);g.width(c).height(j);e.width(c+x);a=e.width();
        y=e.height();e=(a>z||y>r)&&c>m&&j>u;c=h.aspectRatio?c<F&&j<B&&c<C&&j<A:(c<F||j<B)&&(c<C||j<A);f.extend(h,{dim:{width:w(a),height:w(y)},origWidth:C,origHeight:A,canShrink:e,canExpand:c,wPadding:x,hPadding:v,wrapSpace:y-k.outerHeight(!0),skinSpace:k.height()-j});!H&&(h.autoHeight&&j>u&&j<p&&!c)&&g.height("auto")},_getPosition:function(a){var d=b.current,e=b.getViewport(),c=d.margin,f=b.wrap.width()+c[1]+c[3],g=b.wrap.height()+c[0]+c[2],c={position:"absolute",top:c[0],left:c[3]};d.autoCenter&&d.fixed&&
    !a&&g<=e.h&&f<=e.w?c.position="fixed":d.locked||(c.top+=e.y,c.left+=e.x);c.top=w(Math.max(c.top,c.top+(e.h-g)*d.topRatio));c.left=w(Math.max(c.left,c.left+(e.w-f)*d.leftRatio));return c},_afterZoomIn:function(){var a=b.current;a&&(b.isOpen=b.isOpened=!0,b.wrap.css("overflow","visible").addClass("fancybox-opened"),b.update(),(a.closeClick||a.nextClick&&1<b.group.length)&&b.inner.css("cursor","pointer").bind("click.fb",function(d){!f(d.target).is("a")&&!f(d.target).parent().is("a")&&(d.preventDefault(),
        b[a.closeClick?"close":"next"]())}),a.closeBtn&&f(a.tpl.closeBtn).appendTo(b.skin).bind("click.fb",function(a){a.preventDefault();b.close()}),a.arrows&&1<b.group.length&&((a.loop||0<a.index)&&f(a.tpl.prev).appendTo(b.outer).bind("click.fb",b.prev),(a.loop||a.index<b.group.length-1)&&f(a.tpl.next).appendTo(b.outer).bind("click.fb",b.next)),b.trigger("afterShow"),!a.loop&&a.index===a.group.length-1?b.play(!1):b.opts.autoPlay&&!b.player.isActive&&(b.opts.autoPlay=!1,b.play()))},_afterZoomOut:function(a){a=
        a||b.current;f(".fancybox-wrap").trigger("onReset").remove();f.extend(b,{group:{},opts:{},router:!1,current:null,isActive:!1,isOpened:!1,isOpen:!1,isClosing:!1,wrap:null,skin:null,outer:null,inner:null});b.trigger("afterClose",a)}});b.transitions={getOrigPosition:function(){var a=b.current,d=a.element,e=a.orig,c={},f=50,g=50,h=a.hPadding,j=a.wPadding,m=b.getViewport();!e&&(a.isDom&&d.is(":visible"))&&(e=d.find("img:first"),e.length||(e=d));t(e)?(c=e.offset(),e.is("img")&&(f=e.outerWidth(),g=e.outerHeight())):
    (c.top=m.y+(m.h-g)*a.topRatio,c.left=m.x+(m.w-f)*a.leftRatio);if("fixed"===b.wrap.css("position")||a.locked)c.top-=m.y,c.left-=m.x;return c={top:w(c.top-h*a.topRatio),left:w(c.left-j*a.leftRatio),width:w(f+j),height:w(g+h)}},step:function(a,d){var e,c,f=d.prop;c=b.current;var g=c.wrapSpace,h=c.skinSpace;if("width"===f||"height"===f)e=d.end===d.start?1:(a-d.start)/(d.end-d.start),b.isClosing&&(e=1-e),c="width"===f?c.wPadding:c.hPadding,c=a-c,b.skin[f](l("width"===f?c:c-g*e)),b.inner[f](l("width"===
f?c:c-g*e-h*e))},zoomIn:function(){var a=b.current,d=a.pos,e=a.openEffect,c="elastic"===e,k=f.extend({opacity:1},d);delete k.position;c?(d=this.getOrigPosition(),a.openOpacity&&(d.opacity=0.1)):"fade"===e&&(d.opacity=0.1);b.wrap.css(d).animate(k,{duration:"none"===e?0:a.openSpeed,easing:a.openEasing,step:c?this.step:null,complete:b._afterZoomIn})},zoomOut:function(){var a=b.current,d=a.closeEffect,e="elastic"===d,c={opacity:0.1};e&&(c=this.getOrigPosition(),a.closeOpacity&&(c.opacity=0.1));b.wrap.animate(c,
    {duration:"none"===d?0:a.closeSpeed,easing:a.closeEasing,step:e?this.step:null,complete:b._afterZoomOut})},changeIn:function(){var a=b.current,d=a.nextEffect,e=a.pos,c={opacity:1},f=b.direction,g;e.opacity=0.1;"elastic"===d&&(g="down"===f||"up"===f?"top":"left","down"===f||"right"===f?(e[g]=w(l(e[g])-200),c[g]="+=200px"):(e[g]=w(l(e[g])+200),c[g]="-=200px"));"none"===d?b._afterZoomIn():b.wrap.css(e).animate(c,{duration:a.nextSpeed,easing:a.nextEasing,complete:b._afterZoomIn})},changeOut:function(){var a=
    b.previous,d=a.prevEffect,e={opacity:0.1},c=b.direction;"elastic"===d&&(e["down"===c||"up"===c?"top":"left"]=("up"===c||"left"===c?"-":"+")+"=200px");a.wrap.animate(e,{duration:"none"===d?0:a.prevSpeed,easing:a.prevEasing,complete:function(){f(this).trigger("onReset").remove()}})}};b.helpers.overlay={defaults:{closeClick:!0,speedOut:200,showEarly:!0,css:{},locked:!s,fixed:!0},overlay:null,fixed:!1,el:f("html"),create:function(a){a=f.extend({},this.defaults,a);this.overlay&&this.close();this.overlay=
    f('<div class="fancybox-overlay"></div>').appendTo(b.coming?b.coming.parent:a.parent);this.fixed=!1;a.fixed&&b.defaults.fixed&&(this.overlay.addClass("fancybox-overlay-fixed"),this.fixed=!0)},open:function(a){var d=this;a=f.extend({},this.defaults,a);this.overlay?this.overlay.unbind(".overlay").width("auto").height("auto"):this.create(a);this.fixed||(n.bind("resize.overlay",f.proxy(this.update,this)),this.update());a.closeClick&&this.overlay.bind("click.overlay",function(a){if(f(a.target).hasClass("fancybox-overlay"))return b.isActive?
    b.close():d.close(),!1});this.overlay.css(a.css).show()},close:function(){var a,b;n.unbind("resize.overlay");this.el.hasClass("fancybox-lock")&&(f(".fancybox-margin").removeClass("fancybox-margin"),a=n.scrollTop(),b=n.scrollLeft(),this.el.removeClass("fancybox-lock"),n.scrollTop(a).scrollLeft(b));f(".fancybox-overlay").remove().hide();f.extend(this,{overlay:null,fixed:!1})},update:function(){var a="100%",b;this.overlay.width(a).height("100%");I?(b=Math.max(G.documentElement.offsetWidth,G.body.offsetWidth),
p.width()>b&&(a=p.width())):p.width()>n.width()&&(a=p.width());this.overlay.width(a).height(p.height())},onReady:function(a,b){var e=this.overlay;f(".fancybox-overlay").stop(!0,!0);e||this.create(a);a.locked&&(this.fixed&&b.fixed)&&(e||(this.margin=p.height()>n.height()?f("html").css("margin-right").replace("px",""):!1),b.locked=this.overlay.append(b.wrap),b.fixed=!1);!0===a.showEarly&&this.beforeShow.apply(this,arguments)},beforeShow:function(a,b){var e,c;b.locked&&(!1!==this.margin&&(f("*").filter(function(){return"fixed"===
    f(this).css("position")&&!f(this).hasClass("fancybox-overlay")&&!f(this).hasClass("fancybox-wrap")}).addClass("fancybox-margin"),this.el.addClass("fancybox-margin")),e=n.scrollTop(),c=n.scrollLeft(),this.el.addClass("fancybox-lock"),n.scrollTop(e).scrollLeft(c));this.open(a)},onUpdate:function(){this.fixed||this.update()},afterClose:function(a){this.overlay&&!b.coming&&this.overlay.fadeOut(a.speedOut,f.proxy(this.close,this))}};b.helpers.title={defaults:{type:"float",position:"bottom"},beforeShow:function(a){var d=
    b.current,e=d.title,c=a.type;f.isFunction(e)&&(e=e.call(d.element,d));if(q(e)&&""!==f.trim(e)){d=f('<div class="fancybox-title fancybox-title-'+c+'-wrap">'+e+"</div>");switch(c){case "inside":c=b.skin;break;case "outside":c=b.wrap;break;case "over":c=b.inner;break;default:c=b.skin,d.appendTo("body"),I&&d.width(d.width()),d.wrapInner('<span class="child"></span>'),b.current.margin[2]+=Math.abs(l(d.css("margin-bottom")))}d["top"===a.position?"prependTo":"appendTo"](c)}}};f.fn.fancybox=function(a){var d,
    e=f(this),c=this.selector||"",k=function(g){var h=f(this).blur(),j=d,k,l;!g.ctrlKey&&(!g.altKey&&!g.shiftKey&&!g.metaKey)&&!h.is(".fancybox-wrap")&&(k=a.groupAttr||"data-fancybox-group",l=h.attr(k),l||(k="rel",l=h.get(0)[k]),l&&(""!==l&&"nofollow"!==l)&&(h=c.length?f(c):e,h=h.filter("["+k+'="'+l+'"]'),j=h.index(this)),a.index=j,!1!==b.open(h,a)&&g.preventDefault())};a=a||{};d=a.index||0;!c||!1===a.live?e.unbind("click.fb-start").bind("click.fb-start",k):p.undelegate(c,"click.fb-start").delegate(c+
    ":not('.fancybox-item, .fancybox-nav')","click.fb-start",k);this.filter("[data-fancybox-start=1]").trigger("click");return this};p.ready(function(){var a,d;f.scrollbarWidth===v&&(f.scrollbarWidth=function(){var a=f('<div style="width:50px;height:50px;overflow:auto"><div/></div>').appendTo("body"),b=a.children(),b=b.innerWidth()-b.height(99).innerWidth();a.remove();return b});if(f.support.fixedPosition===v){a=f.support;d=f('<div style="position:fixed;top:20px;"></div>').appendTo("body");var e=20===
    d[0].offsetTop||15===d[0].offsetTop;d.remove();a.fixedPosition=e}f.extend(b.defaults,{scrollbarWidth:f.scrollbarWidth(),fixed:f.support.fixedPosition,parent:f("body")});a=f(r).width();J.addClass("fancybox-lock-test");d=f(r).width();J.removeClass("fancybox-lock-test");f("<style type='text/css'>.fancybox-margin{margin-right:"+(d-a)+"px;}</style>").appendTo("head")})})(window,document,jQuery);