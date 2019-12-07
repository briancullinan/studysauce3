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