(function (hostObj) {

	'use strict';

	var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

	function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

	function isPushStateAvailable() {
		return !!(typeof window !== 'undefined' && hostObj.history && hostObj.history.pushState);
	}

	hostObj.Navigo = function (r, useHash, hash) {
		this.root = null;
		this._routes = [];
		this._useHash = useHash;
		this._hash = typeof hash === 'undefined' ? '#' : hash;
		this._destroyed = false;
		this._lastRouteResolved = null;
		this._notFoundHandler = null;
		this._defaultHandler = null;
		this._usePushState = !useHash && isPushStateAvailable();
		this._onLocationChange = this._onLocationChange.bind(this);
		this._historyAPIUpdateMethod = 'pushState';

		if (r) {
			this.root = useHash ? r.replace(/\/$/, '/' + this._hash) : r.replace(/\/$/, '');
		} else if (useHash) {
			this.root = this._cLoc().split(this._hash)[0].replace(/\/$/, '/' + this._hash);
		}

		this._listen();
		this.updatePageLinks();
	}

	function clean(s) {
		if (s instanceof RegExp) return s;
		return s.replace(/\/+$/, '').replace(/^\/+/, '^/');
	}

	function regExpResultToParams(match, names) {
		if (names.length === 0) return null;
		if (!match) return null;
		return match.slice(1, match.length).reduce(function (params, value, index) {
			if (params === null) params = {};
			params[names[index]] = decodeURIComponent(value);
			return params;
		}, null);
	}

	function replaceDynamicURLParts(route) {
		var paramNames = [],
			regexp;

		if (route instanceof RegExp) {
			regexp = route;
		} else {
			regexp = new RegExp(route.replace(Navigo.PARAMETER_REGEXP, function (full, dots, name) {
				paramNames.push(name);
				return Navigo.REPLACE_VARIABLE_REGEXP;
			}).replace(Navigo.WILDCARD_REGEXP, Navigo.REPLACE_WILDCARD) + Navigo.FOLLOWED_BY_SLASH_REGEXP, Navigo.MATCH_REGEXP_FLAGS);
		}
		return { regexp: regexp, paramNames: paramNames };
	}

	function getUrlDepth(url) {
		return url.replace(/\/$/, '').split('/').length;
	}

	function compareUrlDepth(urlA, urlB) {
		return getUrlDepth(urlB) - getUrlDepth(urlA);
	}

	function findMatchedRoutes(url) {
		var routes = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];

		return routes.map(function (route) {
			var _replaceDynamicURLPar = replaceDynamicURLParts(clean(route.route)),
				regexp = _replaceDynamicURLPar.regexp,
				paramNames = _replaceDynamicURLPar.paramNames;

			var match = url.replace(/^\/+/, '/').match(regexp);
			var params = regExpResultToParams(match, paramNames);

			return match ? { match: match, route: route, params: params } : false;
		}).filter(function (m) {
			return m;
		});
	}

	function match(url, routes) {
		return findMatchedRoutes(url, routes)[0] || false;
	}

	function root(url, routes) {
		var matched = routes.map(function (route) {
			return route.route === '' || route.route === '*' ? url : url.split(new RegExp(route.route + '($|\/)'))[0];
		});
		var fallbackURL = clean(url);

		if (matched.length > 1) {
			return matched.reduce(function (result, url) {
				if (result.length > url.length) result = url;
				return result;
			}, matched[0]);
		} else if (matched.length === 1) {
			return matched[0];
		}
		return fallbackURL;
	}

	function isHashChangeAPIAvailable() {
		return !!(typeof window !== 'undefined' && 'onhashchange' in window);
	}

	function extractGETParameters(url) {
		return url.split(/\?(.*)?$/).slice(1).join('');
	}

	function getOnlyURL(url, useHash, hash) {
		var onlyURL = url.split(/\?(.*)?$/)[0],
			split;

		if (typeof hash === 'undefined') {
			// To preserve BC
			hash = '#';
		}

		if (isPushStateAvailable() && !useHash) {
			onlyURL = onlyURL.split(hash)[0];
		} else {
			split = onlyURL.split(hash);
			onlyURL = split.length > 1 ? onlyURL.split(hash)[1] : split[0];
		}

		return onlyURL;
	}

	function isHashedRoot(url, useHash, hash) {
		if (isPushStateAvailable() && !useHash) {
			return false;
		}

		if (!url.match(hash)) {
			return false;
		}

		var split = url.split(hash);

		if (split.length < 2 || split[1] === '') {
			return true;
		}

		return false;
	};

	Navigo.prototype = {
		helpers: {
			match: match,
			root: root,
			clean: clean
		},
		navigate: function navigate(path, absolute) {
			var to;

			path = path || '';
			if (this._usePushState) {
				to = (!absolute ? this._getRoot() + '/' : '') + path.replace(/^\/+/, '/');
				to = to.replace(/([^:])(\/{2,})/g, '$1/');
				history[this._historyAPIUpdateMethod]({}, '', to);
				this.resolve();
			} else if (typeof window !== 'undefined') {
				path = path.replace(new RegExp('^' + this._hash), '');
				hostObj.location.href = hostObj.location.href.replace(/#$/, '').replace(new RegExp(this._hash + '.*$'), '') + this._hash + path;
			}
			return this;
		},
		on: function on() {
			var _this = this;

			for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
				args[_key] = arguments[_key];
			}

			if (typeof args[0] === 'function') {
				this._defaultHandler = { handler: args[0] };
			} else if (args.length >= 2) {
				if (args[0] === '/') {
					var func = args[1];

					if (_typeof(args[1]) === 'object') {
						func = args[1].uses;
					}

					this._defaultHandler = { handler: func };
				} else {
					this._add(args[0], args[1], args[2]);
				}
			} else if (_typeof(args[0]) === 'object') {
				var orderedRoutes = Object.keys(args[0]).sort(compareUrlDepth);

				orderedRoutes.forEach(function (route) {
					_this.on(route, args[0][route]);
				});
			}
			return this;
		},
		notFound: function notFound(handler) {
			this._notFoundHandler = { handler: handler };
			return this;
		},
		resolve: function resolve(current) {
			var _this2 = this;

			var handler, m;
			var url = (current || this._cLoc()).replace(this._getRoot(), '');

			if (this._useHash) {
				url = url.replace(new RegExp('^\/' + this._hash), '/');
			}

			var GETParameters = extractGETParameters(current || this._cLoc());
			var onlyURL = getOnlyURL(url, this._useHash, this._hash);

			if (this._lastRouteResolved && onlyURL === this._lastRouteResolved.url && GETParameters === this._lastRouteResolved.query) {
				return false;
			}

			m = match(onlyURL, this._routes);

			if (m) {
				this._lastRouteResolved = { url: onlyURL, query: GETParameters, params: m.params };
				handler = m.route.handler;
				m.route.route instanceof RegExp ? handler.apply(undefined, _toConsumableArray(m.match.slice(1, m.match.length))) : handler(m.params, GETParameters);
				return m;
			} else if (this._defaultHandler && (onlyURL === '' || onlyURL === '/' || onlyURL === this._hash || isHashedRoot(onlyURL, this._useHash, this._hash))) {
				_this2._lastRouteResolved = { url: onlyURL, query: GETParameters };
				_this2._defaultHandler.handler(GETParameters);
				return true;
			} else if (this._notFoundHandler) {
				_this2._lastRouteResolved = { url: onlyURL, query: GETParameters };
				_this2._notFoundHandler.handler(GETParameters);
			}
			return false;
		},
		destroy: function destroy() {
			this._routes = [];
			this._destroyed = true;
			clearTimeout(this._listenningInterval);
			if (typeof window !== 'undefined') {
				hostObj.removeEventListener('popstate', this._onLocationChange);
				hostObj.removeEventListener('hashchange', this._onLocationChange);
			}
		},
		updatePageLinks: function updatePageLinks() {
			var self = this;

			if (typeof document === 'undefined') return;

			this._findLinks().forEach(function (link) {
				if (!link.hasListenerAttached) {
					link.addEventListener('click', function (e) {
						if (!self._destroyed) {
							e.preventDefault();
							self.navigate(link.getAttribute('href').replace(/\/+$/, '').replace(/^\/+/, '/'));
						}
					});
					link.hasListenerAttached = true;
				}
			});
		},
		generate: function generate(name) {
			var data = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

			var result = this._routes.reduce(function (result, route) {
				var key;

				if (route.name === name) {
					result = route.route;
					for (key in data) {
						result = result.toString().replace(':' + key, data[key]);
					}
				}
				return result;
			}, '');

			return this._useHash ? this._hash + result : result;
		},
		link: function link(path) {
			return this._getRoot() + path;
		},
		historyAPIUpdateMethod: function historyAPIUpdateMethod(value) {
			if (typeof value === 'undefined') return this._historyAPIUpdateMethod;
			this._historyAPIUpdateMethod = value;
			return value;
		},
		lastRouteResolved: function lastRouteResolved() {
			return this._lastRouteResolved;
		},
		_add: function _add(route) {
			var handler = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;

			if (typeof route === 'string') {
				route = encodeURI(route);
			}
			if ((typeof handler === 'undefined' ? 'undefined' : _typeof(handler)) === 'object') {
				this._routes.push({
					route: route,
					handler: handler.uses,
					name: handler.as
				});
			} else {
				this._routes.push({ route: route, handler: handler });
			}
			return this._add;
		},
		_getRoot: function _getRoot() {
			if (this.root !== null) return this.root;
			this.root = root(this._cLoc().split('?')[0], this._routes);
			return this.root;
		},
		_listen: function _listen() {
			var _this3 = this;

			if (this._usePushState) {
				hostObj.addEventListener('popstate', this._onLocationChange);
			} else if (isHashChangeAPIAvailable()) {
				hostObj.addEventListener('hashchange', this._onLocationChange);
			} else {
				var cached = this._cLoc(),
					current = void 0,
					_check = void 0;

				_check = function check() {
					current = _this3._cLoc();
					if (cached !== current) {
						cached = current;
						_this3.resolve();
					}
					_this3._listenningInterval = setTimeout(_check, 200);
				};
				_check();
			}
		},
		_cLoc: function _cLoc() {
			if (typeof window !== 'undefined') {
				if (typeof hostObj.__NAVIGO_WINDOW_LOCATION_MOCK__ !== 'undefined') {
					return hostObj.__NAVIGO_WINDOW_LOCATION_MOCK__;
				}
				return clean(hostObj.location.href);
			}
			return '';
		},
		_findLinks: function _findLinks() {
			return [].slice.call(document.querySelectorAll('[lt-route]'));
		},
		_onLocationChange: function _onLocationChange() {
			this.resolve();
		}
	};

	Navigo.PARAMETER_REGEXP = /([:*])(\w+)/g;
	Navigo.WILDCARD_REGEXP = /\*/g;
	Navigo.REPLACE_VARIABLE_REGEXP = '([^\/]+)';
	Navigo.REPLACE_WILDCARD = '(?:.*)';
	Navigo.FOLLOWED_BY_SLASH_REGEXP = '(?:\/$|$)';
	Navigo.MATCH_REGEXP_FLAGS = '';
}(window));