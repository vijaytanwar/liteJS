(function () {
    var routerModule = liteJS.module("ltRouter");
    routerModule.provider("router", ["query", "config", "instanceFactory"], function (query, config, instanceFactory) {
        var routes,
            cachedView,
            ltView,
            cachedLayout,
            componentsName = [],
            lastComponent,
            navigoRouter = new Navigo(config.routePath, config.useHash, config.routerHash),
            currentRouteInfo,
            currentRouterParams;

        var self = this;

        function registerRoutes(_routes) {
            if (!config.defaultLayout) {
                console.error("default layout template name missing. https://vijaytanwar.github.com/liteJS#defaultLayoutTemplateMissing");
            }
            routes = _routes;
        }

        function createComponentInstance(data) {
            ltView = cachedView.find("[ltView]");
            var component = query.new("div", true);
            component.attr("data-component", data.route.component);
            component.attr("data-init", JSON.stringify(data.params));
            component.addClass((data.route.animation || config.defaultAnimation) || "");
            config.keepComponentOnRouteChange ? ltView.append(component) : ltView.html(component);
            instanceFactory.initUIComponents(component);
            return component;
        }
        function renderLtView(data) {
            if (config.keepComponentOnRouteChange) {
                if (lastComponent) {
                    lastComponent.css("display", "none");
                }
                if (componentsName.indexOf(data.route.component) == -1) {
                    componentsName.push(data.route.component);
                    lastComponent = createComponentInstance(data);
                } else {
                    lastComponent = ltView.find("[data-component=" + data.route.component + "]");
                }
                lastComponent.css("display", "block");
            } else {
                createComponentInstance(data);
            }
        }
        function bindRouteChangeEvent() {
            query(document).on("change_app_route", function (e) {
                var obj = e.data;
                var routeConfig = obj.route;
                if (!cachedView) {
                    cachedView = query.new("div", true);
                    query(config.hostSelector).append(cachedView);
                }
                cachedLayout = cachedView.attr("layout");

                if (!cachedLayout) {
                    cachedView.html(config.templateFunc(routeConfig.layout || config.defaultLayout));
                    cachedView.attr("layout", routeConfig.layout || config.defaultLayout);
                    instanceFactory.initUIComponents(cachedView.find("[data-component]"));
                    renderLtView(e.data);

                } else {
                    var layoutChanged;
                    if (routeConfig.layout && cachedLayout !== routeConfig.layout) {
                        cachedView.html(config.templateFunc(routeConfig.layout));
                        cachedView.attr("layout", routeConfig.layout);
                        layoutChanged = true;
                    }
                    if (!routeConfig.layout && cachedLayout !== config.defaultLayout) {
                        cachedView.html(config.templateFunc(config.defaultLayout));
                        cachedView.attr("layout", config.defaultLayout);
                        layoutChanged = true;
                    }
                    if (layoutChanged) {
                        //empty existing component before re-instantiating data components
                        cachedView.find("[ltView]").html("");
                        lastComponent = null;
                        componentsName = [];

                        instanceFactory.initUIComponents(cachedView.find("[data-component]"));
                    }
                    renderLtView(e.data);
                }

                e.data.done({ params: e.data.params, route: e.data.route });
            });
        }

        function afterRouteChanged(obj) {
            self.trigger("after_route_change", obj);
            navigoRouter.updatePageLinks();
        }
        function afterBeforeDone() {
            query(document).trigger("change_app_route", {
                route: currentRouterInfo,
                params: currentRouterParams,
                done: afterRouteChanged
            });
        }
        function componentCaller() {
            var lastRouteInfo = navigoRouter.lastRouteResolved();
            this.url = lastRouteInfo.url;
            this.query = lastRouteInfo.query;

            currentRouterInfo = this;
            currentRouterParams = arguments.length > 0 ? arguments[0] : null;
            self.events && self.events["before_route_change"] ?
                self.trigger("before_route_change", { route: this, done: afterBeforeDone })
                :
                afterBeforeDone();
        }
        function bindNavigo() {
            for (var key in routes) {
                navigoRouter.on(key, componentCaller.bind(routes[key]));
            }
            navigoRouter.resolve();
        }
        routerModule.ready(function () {
            bindRouteChangeEvent();
            bindNavigo();
        });

        this.export = {
            registerRoutes: function (routes) {
                registerRoutes(routes);
            },
            beforeRouteChange: function (callback) {
                self.on("before_route_change", callback, self.key);
            },
            afterRouteChange: function (callback) {
                self.on("after_route_change", callback, self.key);
            },
            $keep: {
                goTo: function (url) {
                    navigoRouter.navigate(url);
                }
            }
        };
    });
}());