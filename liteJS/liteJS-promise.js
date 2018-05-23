//q promise services
liteJS.module("ltPromise").service("q", function () {
    function Promise() { }
    Promise.prototype.success = function (callback) {
        this.successCall = callback;
        return this;
    }
    Promise.prototype.error = function (callback) {
        this.errorCall = callback;
        return this;
    }
    function Deferred() {
        this.promise = new Promise();
    }
    Deferred.prototype.resolve = function (data) {
        //push will not be there without promise;
        if (this.promise.push) {
            this.promise.push(data);
        }
        if (this.promise.successCall) {
            this.promise.successCall(data);
        }

    };
    Deferred.prototype.reject = function (data) {
        this.promise.hasError = true;
        if (this.promise.push) {
            this.promise.push(data);
        }
        if (this.promise.errorCall) {
            this.promise.errorCall(data);
        }
    };

    /**
     * Defer class
     * @param {*} funcs: List of function which promise will call
     */
    function Defer(funcs) {
        var promises = [],
            taskDone = [],
            fullFilled = funcs.length,
            hasError = false,
            self = this;

        function pushPromiseData(i, args) {
            if (self.cancelled) {
                return;
            }
            taskDone[i] = args;
            hasError = this.hasError || hasError;
            fullFilled--;
            if (self.updateProgress) {
                self.updateProgress(i, args);
            }
            if (!fullFilled) {
                if (hasError) {
                    self.errorCall.apply({}, taskDone);
                } else {
                    self.successCall.apply({}, taskDone);
                }
            }
        }
        this.call = function (params) {
            var promise;
            for (var i = 0; i < funcs.length; i++) {
                //jQuery ajax promise support
                if (typeof funcs[i] == "object" && "done" in funcs[i] && "fail" in funcs[i]) {
                    var deferred = new Deferred();
                    promises.push(deferred.promise);
                    deferred.promise.push = pushPromiseData.bind(deferred.promise, i);

                    funcs[i].done(function (response) {
                        deferred.resolve(response);
                    }).fail(function (response) {
                        deferred.promise.hasError = true;
                        deferred.reject(response);
                    });
                    continue;
                }
                if (params[i]) {
                    promise = funcs[i].apply(self, params[i]);
                } else {
                    promise = funcs[i]();
                }
                promise.push = pushPromiseData.bind(promise, i);
                promises.push(promise);
            }
        }
    };
    Defer.prototype.success = function (func) {
        this.successCall = func;
        return this;
    };
    Defer.prototype.error = function (func) {
        this.errorCall = func;
        return this;
    };
    Defer.prototype.progress = function (func) {
        this.updateProgress = func;
        return this;
    }
    Defer.prototype.cancel = function () {
        this.cancelled = true;
        return this;
    };
    Defer.prototype.params = function () {
        this.params = arguments;
        return this;
    }

    function when(args) {
        var defer = new Defer(args);
        setTimeout(function () {
            defer.call(defer.params);
        }, 0);
        return defer;
    }
    this.export = {
        when: function () {
            return when(arguments);
        },
        Deferred: Deferred,

        /**
         * dynamicPromise convert the normal function to promise function
         * function return value will be passed in promise resolve
         * and any exception will be be passed in promise reject
         */
        dynamic: function (func) {
            return function () {
                var deferred = new Deferred(),
                    args = arguments;
                setTimeout(function () {
                    try {
                        var returnVal = func.apply({}, args);
                        deferred.resolve(returnVal);
                    } catch (ex) {
                        deferred.reject(ex);
                    }
                }, 0);

                return deferred.promise;
            };
        }
    }
});