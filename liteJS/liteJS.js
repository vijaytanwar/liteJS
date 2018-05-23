/*!/
 * liteJS framework v1.0
 * https://bitbucket.org/lite-js/litejs
 *
 * Copyright liteJS
 * Released under the MIT license
 * Dependencies: navigo router, https://github.com/krasimir/navigo/
 */
(function (window, document) {
    var liteJSModules = {},
        allModuleDependencies = [],
        componentDefinitions = {},
        instanceRepository = {},
        configService = {},
        customElements = {},
        readyCallbacks = [],
        query;

    //liteJS event system
    var eventSystem = {
        on: function (event, callback, obj, subscriberKey) {
            obj.events = obj.events || {};
            if (!obj.events[event]) {
                obj.events[event] = [];
            }

            var eventToken = query.token();
            obj.events[event].push({
                subscriberKey: subscriberKey,
                callback: callback,
                eventToken: eventToken
            });
            return eventToken;
        },
        off: function (eventName, obj, subscriberKey) {
            if (!obj.events) { return; }
            var event = obj.events[eventName];
            if (event) {
                for (var i = 0; i < event.length; i++) {
                    if (event[i].subscriberKey === subscriberKey) {
                        event.splice(i, 1);
                        break;
                    }
                }
            } else {
                for (var key in obj.events) {
                    for (var j = 0; j < obj.events[key].length; j++) {
                        if (obj.events[key][j].eventToken = eventName) {
                            obj.events[key].splice(j, 1);
                            return;
                        }
                    }
                }
            }
        },
        publish: function (eventName, params, obj) {
            if (!obj.events) { return; }
            var event = obj.events[eventName];
            if (event) {
                for (var i = 0; i < event.length; i++) {
                    if (event[i].subscriberKey in instanceRepository) {
                        if (typeof params == "object") {
                            if (params && params.deferred) {
                                var deferred = params.deferred;
                                delete params.deferred;
                                event[i].callback({ data: params.data, deferred: deferred });
                            } else {
                                event[i].callback({ data: params });
                            }
                        } else {
                            event[i].callback({ data: params });
                        }
                    } else {
                        obj.off(eventName, obj, event[i].subscriberKey)
                    }
                }
            }
        }
    };

    //base component definition
    var BaseComponent = function () { };
    BaseComponent.prototype = {
        init: function () { },
        destroy: function () { },
        on: function (event, callback, subscriberKey) {
            if (!subscriberKey) {
                console.error("subscriber key is not passed ex: .on(eventName, callback, this.key). " + moreInfo("subscriberKeyMissing"));
            }
            return eventSystem.on(event, callback, this, subscriberKey);
        },
        off: function (event, subscriberKey) {
            eventSystem.off(event, this, subscriberKey);
        },
        trigger: function (event, params) {
            eventSystem.publish(event, params, this);
        },
        completeOff: function () {
            if (this.events) {
                for (var key in this.events) {
                    for (var i = 0; i < this.events[key].length; i++) {
                        if (typeof this.events[key] !== "function") {
                            eventSystem.off(key, this, this.events[key][i].subscriberKey);
                        }
                    }
                }
            }
        }
    }

    //UI Component represents all User interface logic
    var UIComponent = function (parent) {
        this.notifyParent = function (event, data) {
            parent.trigger(event, data);
        }
        this.notifyParentExP = function (event, data) {
            var d = instanceFactory.get("q");
            var deferred = new d.Deferred();
            parent.trigger(event, { data: data, deferred: deferred });
            return deferred.promise;
        }
    };

    UIComponent.prototype = {
        render: function (templateName, obj, append) {
            this.config = {
                template: templateName,
                append: append
            };
            if (!configService.templateFunc) {
                console.error("templateFunc is missing." + moreInfo("templateFuncMissing"));
            }
            if (append) {
                var lpTemplate = query(this.element).find("[lpTemplate]");
                if (lpTemplate.elements.length) {
                    lpTemplate.html(configService.templateFunc(templateName, obj));
                } else {
                    this.element.innerHTML += "<div lpTemplate>" + configService.templateFunc(templateName, obj) + "</div>";
                }
            } else {
                this.element.innerHTML = configService.templateFunc(templateName, obj);
            }
            bindEvents(this);
        },
        reRender: function (data) {
            this.render(this.config.template, data, this.config.append);
        },
        addHtmlString: function (str, append) {
            if (append) {
                this.element.innerHTML += str;
            } else {
                this.element.innerHTML = str;
            }
        },
        bindEvents: function () {
            bindEvents();
        },
        /**
         * Renders the child directly embedded in template as data-component
         */
        initChildrenComponent: function () {
            var self = this;
            var children = query(this.element).find("[data-component]");
            var length = children.elements.length;
            for (var i = 0; i < length; i++) {
                var element = children.elements[i];
                self.createChild(element.getAttribute("data-component"), JSON.parse(element.getAttribute("data-init")), element);
            }
        },
        createChild: function (childComponent, obj, element) {
            if (!childComponent) {
                console.error("child component name argument missing. " + moreInfo("childComponentNameMissing"));
            }
            if (!element) {
                console.error("child element agrument missing. " + moreInfo("missingChildElement"));
            }
            var childInstance = instanceFactory.get(childComponent, element, this);
            childInstance.init(obj);
            return childInstance;
        },
        appendChild: function (childElement, targetContainer) {
            if (!childElement) {
                console.error("child element is missing " + moreInfo("missingChildElement"));
            }
            if (targetContainer) {
                targetContainer.appendChild(childElement);
            } else {
                this.element.appendChild(childElement);
            }
        },
        createAppendChild: function (childComponent, obj, element, targetContainer) {
            if (!childComponent) {
                console.error("child component name argument missing. " + moreInfo("childComponentNameMissing"));
            }
            if (!element) {
                console.error("child element argument missing. " + moreInfo("missingChildElement"));
            }
            var childInstance = this.createChild(childComponent, obj, element);
            if (targetContainer) {
                targetContainer.appendChild(element);
            } else {
                this.element.appendChild(element);
            }
            return childInstance;
        },
        removeChild: function (element, directParent) {
            if (directParent) {
                directParent.removeChild(element);
            } else {
                this.element.removeChild(element);
            }
        },
        remove: function () {
            this.element.parentNode.removeChild(this.element);
        }
    };

    //extends UIComponent prototype with BaseComponent prototype
    for (var protoKey in BaseComponent.prototype) {
        UIComponent.prototype[protoKey] = BaseComponent.prototype[protoKey];
    }

    /**
     * function will bind the events
     * @param {*} obj object to bind the events on.
     */
    function bindEvents(obj) {
        var events = obj.events;
        if (events) {
            for (var eventsKey in events) {
                var eventKeyArray = eventsKey.split(',');
                for (var i = 0; i < eventKeyArray.length; i++) {
                    var eventConfig = eventKeyArray[i].trim().split(' ');

                    var event = eventConfig[0],
                        selector = eventConfig[1];

                    var queryElement = query(obj.element);
                    if (query.matchesSelector(obj.element, selector)) {
                        queryElement.on(event, events[eventsKey]);
                    }
                    var children = queryElement.find(selector);
                    var length = children.elements.length;
                    for (var j = 0; j < length; j++) {
                        var element = children.elements[j];
                        query.DOMFeatures.addEventListener ?
                            element.addEventListener(event, events[eventsKey]) :
                            element.attachEvent("on" + event, events[eventsKey]);
                    }
                }
            }
        }
    }

    if (console) {
        console.error = function (msg) {
            throw msg;
        }
    }
    /**
     * Will help developer to find more info about error
     * @param {*} hash 
     */
    function moreInfo(hash) {
        return "https://bitbucket.org/lite-js/litejs#" + hash;
    }
    //Instance factory
    var _lastKey = 0;
    var instanceFactory = {
        export: function (obj) {
            for (var key in obj.export) {
                if (typeof obj.export[key] === "function") {
                    obj.export[key] = obj.export[key].bind(obj);
                }
            }
            return obj.export;
        },
        /**
         * will find or create instance of required component
         */
        get: function (componentName, uiElement, parent) {
            var instance,
                component = componentDefinitions[componentName];

            //for not single ton instance or first time call
            if (component) {
                instance = instanceRepository[component.name];
            } else {
                //singleTon Instances are deleted from componentDefinitions to reduce the memory usage
                instance = instanceRepository[componentName];
            }

            //if instance found return instance
            if (instance) {
                if (instance instanceof Function || !instance.export) {
                    return instance;
                } else {
                    return this.export(instance);
                }
            } else {
                if (!component) {
                    console.error("component " + componentName + " is not found. " + moreInfo("componentNameMissing"));
                }
                var dependencies = [];
                //for syntax like app.component("componentName", function(){})
                if (typeof component.dependencies === "function") {
                    component.class = component.dependencies;
                    component.dependencies = null;
                }

                //Get all dependencies before creating instance of current instance.
                if (component.dependencies && typeof component.dependencies !== "function") {
                    var length = component.dependencies.length;
                    for (var i = 0; i < length; i++) {
                        var comp = componentDefinitions[component.dependencies[i]]
                        if (comp && !comp.isSingleton) {
                            console.error(comp.name + " UI component can't be injected, instead use service/func or provider " + moreInfo("uiComponentMisuse"));
                        }
                        var dependency = this.get(component.dependencies[i]);
                        dependencies.push(dependency);
                    }
                }

                var instanceKey;
                if (!component.isFunction) {
                    //if component is UI specific component
                    if (uiElement) {
                        if (uiElement.getAttribute("data-instance") !== null) {
                            console.error(uiElement, " is already used for other component " + componentName + ". " + moreInfo("elementIsAlreadyInUser"));
                        }
                        instance = new UIComponent(parent);
                        instanceKey = "key_" + (_lastKey++);
                        instance.key = instanceKey;
                        instance.element = uiElement;

                        instanceRepository[instanceKey] = instance;
                        uiElement.setAttribute("data-instance", instanceKey);
                    } else {
                        instance = new BaseComponent();
                        instance.key = component.name;
                    }
                    component.class.apply(instance, dependencies);
                } else {
                    instance = component.class.apply({}, dependencies);
                }
                instance.typeof = component.name;
                if (component.isProvider) {
                    instance.isProvider = component.isProvider;
                }

                if (component.isSingleton) {
                    //no need to keep singleton in componentDefinitions
                    delete componentDefinitions[componentName];
                }

                //UI Elements will be saved by tracking key, so that they can be tracked when html node is deleted.
                //Singleton UI component will not be tracked
                if (!uiElement) {
                    instanceRepository[component.name] = instance;
                }

                if (component.isFunction || !instance.export) {
                    return instance;
                } else {
                    return this.export(instance);
                }
            }
        },
        /**
         * Will update the provider will leave on $keep method
         */
        updateProvider: function () {
            for (var key in componentDefinitions) {
                if (componentDefinitions[key].isProvider) {
                    instanceFactory.get(key);
                }
            }
            for (key in instanceRepository) {
                if (instanceRepository[key].isProvider) {
                    for (var key2 in instanceRepository[key].export) {
                        if (key2 !== "$keep") {
                            delete instanceRepository[key].export[key2];
                        }
                    }
                    if (instanceRepository[key].export) {
                        instanceRepository[key].export = instanceRepository[key].export.$keep;
                    }
                }
            }
        },
        /**
         * This method will register all third party components
         */
        registerHComponents: function () {
            for (var key in componentDefinitions) {
                if (componentDefinitions[key].hComponent) {
                    instanceFactory.get(key);
                }
            }
        }
    };

    //Garbage collection functions
    var garbageElements = [];
    var garbageCollector = {
        lock: false,
        push: function (element) {
            garbageElements.push(element);
        },
        init: function () {
            var interval = setInterval(function () {
                if (!garbageCollector.lock && garbageElements.length) {
                    removeObjects();
                }
            }, 2000);
            function removeObjects() {
                var length = garbageElements.length;
                var key;
                while (key = garbageElements.pop()) {
                    var obj = instanceRepository[key];
                    if (obj) {
                        obj.completeOff();
                        obj.destroy();
                        var events = obj.events;
                        if (events) {
                            for (var eventsKey in events) {
                                var eventKeyArray = eventsKey.split(',');
                                for (var i = 0; i < eventKeyArray.length; i++) {
                                    var eventConfig = eventKeyArray[i].trim().split(' ');

                                    var event = eventConfig[0],
                                        selector = eventConfig[1];

                                    var queryElement = query(obj.element);
                                    if (query.matchesSelector(obj.element, selector)) {
                                        queryElement.off(event, events[eventsKey]);
                                    }
                                    var children = queryElement.find(selector),
                                        elementLength = children.elements.length;
                                    for (var j = 0; j < elementLength; j++) {
                                        var element = children.elements[j];
                                        query.DOMFeatures.removeEventListener ?
                                            element.removeEventListener(event, events[eventsKey]) :
                                            element.detachEvent("on" + event, events[eventsKey]);
                                    }
                                }
                            }
                        }
                        delete instanceRepository[key];
                    }
                }
                garbageCollector.lock = true;
            }
        }
    };

    /**
    * Remove instance associated with DOM element when that element is removed 
    */
    function elementRemoved(e) {
        var element = query(e.target),
            instanceKey = element.data("instance");

        if (instanceKey) {
            //lock gc if adding elements to garbage list
            garbageCollector.lock = true;
            garbageCollector.push(instanceKey);
            garbageCollector.lock = false;
        }
        if (e.target && e.target.innerHTML) {
            element.find("[data-instance]").each(function (childComponent) {
                var childInstanceKey = query(childComponent).data("instance");
                garbageCollector.push(childInstanceKey);
            });
            garbageCollector.lock = false;
        }
    }

    /**
     * Initialize the default element having data-component name
     * @param {*} elements elements having data-component
     */
    function initUIComponents(elements) {
        elements.each(function (element) {
            var componentName = element.getAttribute("data-component"),
                data = element.getAttribute("data-init"),
                instance = instanceFactory.get(componentName, element);

            instance.element = element;
            instance.name = componentName;

            instance.init(JSON.parse(data));
        });
    }

    /**
     * Create custom components
     */
    function defineCustomComponent(elementStr) {
        var protoType = Object.create(HTMLElement.prototype);
        protoType.attachedCallback = function () {
            if (!query(this).attr("data-instance")) {
                var component;
                //init custom component
                var parentEl = query(this).parent("[data-instance]");
                if (parentEl) {
                    var parentInstance = instanceRepository[parentEl.attr("data-instance")];
                    component = instanceFactory.get(customElements[this.tagName], this, parentInstance);
                } else {
                    component = instanceFactory.get(customElements[this.tagName], this);
                }

                var data = JSON.parse(this.getAttribute("data-init"));
                component.init(data);
            }
        }
        protoType.detachedCallback = function () {
        }
        if ('registerElement' in document) {
            document.registerElement(elementStr, { prototype: protoType });
        } else {
            console.log("Custom component not supported, please load https://cdn.jsdelivr.net/webcomponentsjs/0.7.24/webcomponents-lite.min.js libs.");
        }
    }
    /**
     * register custom elements
     */
    function registerCustomComponents() {
        for (var key in customElements) {
            defineCustomComponent(key);
        }
    }
    /**
     * call app run func
     * @param {*} dependencies 
     * @param {*} callback 
     */
    function callAppRunFunc(dependencies, callback) {
        var dependenciesInstances = [];
        if (dependencies) {
            dependenciesInstances = [];
            for (var i = 0; i < dependencies.length; i++) {
                dependenciesInstances.push(instanceFactory.get(dependencies[i]));
            }
        }
        callback.apply(this, dependenciesInstances);
    }

    /**
     * fill app dependencies
     */
    function fillDependencies(moduleName) {
        var module = liteJSModules[moduleName];
        if (!module) {
            console.error(moduleName + " is not loaded");
        } else if (typeof module.dependencies !== "undefined") {
            for (var i = 0; i < module.dependencies.length; i++) {
                if (allModuleDependencies.indexOf(module.dependencies[i]) == -1) {
                    allModuleDependencies.push(module.dependencies[i]);
                    fillDependencies(module.dependencies[i]);
                }
            }
        }
        if (allModuleDependencies.indexOf(moduleName) == -1) {
            allModuleDependencies.push(moduleName);
        }
    }

    /**
     * fill all the components in component definitions, which are required.
     */
    function fillComponentDefinitions() {
        var moduleName;
        while (moduleName = allModuleDependencies.pop()) {
            var registeredComps = liteJSModules[moduleName].registeredComps,
                length = registeredComps.length;
            for (var i = 0; i < length; i++) {
                if (componentDefinitions[registeredComps[i].name]) {
                    console.warning("duplicate component ", registeredComps[i].name, "found in modules");
                } else {
                    componentDefinitions[registeredComps[i].name] = registeredComps[i];
                }
            }
            //key registeredComps is not required as this is already pushed to componentDefinitions;
            delete liteJSModules[moduleName];
        }
    }
    /**
     * liteJS class
     */
    function liteJS(appName, dependencies) {
        this.appName = appName;
        this.dependencies = dependencies;
        this.registeredComps = [];
    }
    /**
     * Add lite JS comps
     * @param {*} componentName
     * @param {*} dependencies
     * @param {*} componentClass
     * @param {*} isSingleton
     * @param {*} isFunction
     * @param {*} isProvider
     */
    liteJS.prototype = {
        addComponent: function (componentName, dependencies, componentClass, isSingleton, isFunction, isProvider) {
            this.registeredComps.push({
                name: componentName,
                class: componentClass,
                dependencies: dependencies,
                isSingleton: isSingleton,
                isFunction: isFunction,
                isProvider: isProvider
            });
            return this;
        },
        component: function (componentName, dependencies, componentClass, isCustomElement) {
            if (typeof dependencies === "function") {
                isCustomElement = componentClass;
                componentClass = dependencies;
                dependencies = undefined;
            }
            if (isCustomElement) {
                if (!(/[A-Z]/.test(componentName))) {
                    console.error("custom element name is invalid. " + moreInfo("invalidComponentName"));
                }
                var generatedElementName = componentName.replace(/([A-Z])/g, "-$1").toUpperCase();
                customElements[generatedElementName] = componentName;
            }
            return this.addComponent(componentName, dependencies, componentClass);
        },
        hComponent: function (componentName, dependencies, componentClass) {
            if (typeof dependencies === "function") {
                componentClass = dependencies;
                dependencies = undefined;
            }
            this.registeredComps.push({
                name: componentName,
                class: componentClass,
                dependencies: dependencies,
                hComponent: true,
                isSingleton: true
            });
            return this;
        },
        service: function (serviceName, dependencies, serviceClass) {
            return this.addComponent(serviceName, dependencies, serviceClass, true);
        },
        provider: function (providerName, dependencies, serviceClass) {
            return this.addComponent(providerName, dependencies, serviceClass, true, false, true);
        },
        func: function (functionName, dependencies, functionDef) {
            return this.addComponent(functionName, dependencies, functionDef, true, true);
        },
        run: function (hostSelector, dependencies, callback) {
            var self = this;
            document.addEventListener("DOMContentLoaded", function () {
                configService.hostSelector = hostSelector;
                var appModule = liteJSModules[self.appName];
                appModule.dependencies = appModule.dependencies || [];
                appModule.dependencies.push("ltQuery", "ltPromise");
                appModule.service("config", [], function () {
                    this.export = configService;
                });
                appModule.service("instanceFactory", [], function () {
                    this.export = {
                        initUIComponents: initUIComponents
                    };
                });

                fillDependencies(self.appName);
                fillComponentDefinitions();
                query = instanceFactory.get("query");

                callAppRunFunc(dependencies, callback);

                //update providers
                instanceFactory.updateProvider();

                //register all third party library components
                instanceFactory.registerHComponents();

                //initialize instance garbage collector
                garbageCollector.init();

                //subscribe to document node remove event
                query(document).on("DOMNodeRemoved", function (e) {
                    if (e.target.getAttribute) {
                        elementRemoved(e);
                    }
                });
                //register all component inside ltApp or hostSelector
                registerCustomComponents();

                var container = query(configService.hostSelector);
                if (container.elements.length === 0) {
                    throw "Cannot find " + configService.hostSelector + " liteJS app host element";
                }
                initUIComponents(container.find("[data-component]"));
                //call all liteReady function
                for (var i = 0; i < readyCallbacks.length; i++) {
                    readyCallbacks[i]();
                }
            });
            return this;
        },
        ready: function (callback) {
            readyCallbacks.push(callback);
        }
    };
    window.liteJS = {
        module: function (appName, dependencies) {
            var module = new liteJS(appName, dependencies);
            if (!liteJSModules[appName]) {
                liteJSModules[appName] = module;
            }
            return module;
        }
    };

}(window, document));
