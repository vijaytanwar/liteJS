//query service
liteJS.module("ltQuery").func("query", [], function () {
    var readyCallbacks = [],
        callbacks = [];

    var supportedFeatures = {
        addEventListener: "addEventListener" in document,
        removeEventListener: "removeEventListener" in document,
        createEvent: "createEvent" in document,
    };

    //basic Polyfill
    (function () {
        if (!Element.prototype.matches) {
            Element.prototype.matches =
                Element.prototype.matchesSelector ||
                Element.prototype.mozMatchesSelector ||
                Element.prototype.msMatchesSelector ||
                Element.prototype.oMatchesSelector ||
                Element.prototype.webkitMatchesSelector ||
                function (s) {
                    var matches = (this.document || this.ownerDocument).querySelectorAll(selector),
                        i = matches.length;
                    while (--i >= 0 && matches.item(i) !== this) { }
                    return i > -1;
                };
        }
    }());

    //returns the selected elements using selector from document or object
    function find(selector, object) {
        if (object) {
            if (object.elements.length > 0) {
                return object.elements[0].querySelectorAll(selector);
            } else {
                return [];
            }
        } else {
            return document.querySelectorAll(selector);
        }
    }
    //find selected parent of element
    function parent(el, selector) {
        while ((el = el.parentElement) && !(queryFunc.matchesSelector(el, selector)));
        return el;
    }
    function liteQueryElement(selector) {
        if (typeof selector == "object") {
            switch (selector) {
                case document: {
                    this.ready = function (callback) {
                        readyCallbacks.push(callback);
                    }
                }
            }

            //for NodeList fix
            if (selector.length >= 0) {
                this.elements = selector;
            } else {
                this.elements = [selector];
            }
        } else if (typeof selector === "string") {
            this.elements = find(selector);
        } else {
            this.elements = selector;
        }
    }
    liteQueryElement.prototype = {
        find: function (selector) {
            return new liteQueryElement(find(selector, this));
        },
        get: function (index) {
            return this.elements[index];
        },
        first: function () {
            return new liteQueryElement(this.elements.length > 0 ? this.elements[0] : {});
        },
        addClass: function (className) {
            var length = this.elements.length,
                elements = this.elements;
            for (var i = 0; i < length; i++) {
                elements[i].classList.add(className);
            }
            return this;
        },
        removeClass: function (className) {
            var length = this.elements.length;
            for (var i = 0; i < length; i++) {
                this.elements[i].classList.remove(className);
            }
            return this;
        },
        hasClass: function (className) {
            return this.get(0).classList.contains(className);
        },
        append: function (html) {
            var length = this.elements.length;
            for (var i = 0; i < length; i++) {
                if (typeof html === "string") {
                    this.elements[i].innerHTML = this.elements[i].innerHTML + html;
                } else {
                    if (html.elements.length & html.elements.length > 0)
                        for (var j = 0; j < html.elements.length; j++) {
                            this.elements[i].appendChild(html.get(j));
                        }
                }
            }
            return this;
        },
        html: function (html) {
            if (html || html === "") {
                var length = this.elements.length;
                for (var i = 0; i < length; i++) {
                    if (typeof html === "string") {
                        this.elements[i].innerHTML = html;
                    } else {
                        this.elements[i].innerHTML = "";
                        if (html.elements.length & html.elements.length > 0) {
                            for (var j = 0; j < html.elements.length; j++) {
                                this.elements[i].appendChild(html.get(j));
                            }
                        }
                    }
                }
                return this;
            } else {
                return this.get(0).innerHTML;
            }
        },
        on: function (event, callback) {
            for (var i = 0; i < this.elements.length; i++) {
                if (supportedFeatures.addEventListener)
                    this.elements[i].addEventListener(event, callback);
                else
                    this.elements[i].attachEvent("on" + event, callback);
            }
        },
        off: function (event, callback) {
            for (var i = 0; i < this.elements.length; i++) {
                if (supportedFeatures.removeEventListener) {
                    this.elements[i].removeEventListener(event, callback);
                }
                else {
                    this.elements[i].detachEvent("on" + event, callback);
                }
            }
        },
        each: function (callback) {
            var length = this.elements.length;
            for (var i = 0; i < length; i++) {
                callback(this.elements[i], i);
            }
        },
        trigger: function (event, data) {
            for (var i = 0; i < this.elements.length; i++) {
                var evt = document.createEvent("HTMLEvents");
                evt.initEvent(event, true, true);
                evt.data = data
                this.elements[i].dispatchEvent(evt);
            }
        },
        prop: function (name, value) {
            if (typeof value !== "undefined") {
                var length = this.elements.length;
                for (var i = 0; i < length; i++) {
                    this.elements[i][name] = value;
                }
                return this;
            } else {
                return this.elements[0][name];
            }
        },
        attr: function (name, value) {
            if (typeof value !== "undefined") {
                var length = this.elements.length;
                for (var i = 0; i < length; i++) {
                    this.elements[i].setAttribute(name, value);
                }
                return this;
            } else {
                return this.elements[0].getAttribute(name);
            }
        },
        data: function (name, value) {
            return this.attr("data-" + name, value);
        },
        css: function (obj, value) {
            if (typeof obj === "string") {
                this.each(function (element) {
                    element.style[obj] = value;
                });
            } else {
                for (var key in obj) {
                    this.each(function (element) {
                        element.style[key] = obj[key];
                    });
                }
            }
        },
        parent: function (selector) {
            if (selector) {
                var parentElement = parent(this.elements[0], selector);
                if (parentElement) {
                    return new liteQueryElement(parentElement);
                } else {
                    return new liteQueryElement({});
                }
            } else {
                return new liteQueryElement(this.get(0).parentElement);
            }
        }
    }
    document.addEventListener("DOMContentLoaded", function () {
        for (var i = 0; i < readyCallbacks.length; i++) {
            readyCallbacks[i].call();
        }
    });
    var queryFunc = function (selector) {
        return new liteQueryElement(selector);
    };
    queryFunc.extend = function () {
        var extended = {};
        for (key in arguments) {
            var argument = arguments[key];
            for (prop in argument) {
                if (Object.prototype.hasOwnProperty.call(argument, prop)) {
                    extended[prop] = argument[prop];
                }
            }
        }
        return extended;
    };
    queryFunc.queryParam = function (url) {
        var params = {}, pieces, parts, i;
        var question = url.lastIndexOf("?");
        if (question !== -1) {
            url = url.slice(question + 1);
            pieces = url.split("&");
            for (i = 0; i < pieces.length; i++) {
                parts = pieces[i].split("=");
                if (parts.length < 2) {
                    parts.push("");
                }
                params[decodeURIComponent(parts[0])] = decodeURIComponent(parts[1]);
            }
        }
        return params;
    }
    queryFunc.new = function (element, queryElement) {
        if (queryElement) {
            return queryFunc(document.createElement(element));
        }
        return document.createElement(element);
    };
    queryFunc.token = function () {
        return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
    };
    queryFunc.matchesSelector = function (elem, selector) {
        return elem.matches(selector);
    }
    queryFunc.DOMFeatures = supportedFeatures;
    return queryFunc;
});