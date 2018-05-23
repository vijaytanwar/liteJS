liteJS.module("ltAjax", ["ltPromise"]).provider("ajax", ["q"], function (q) {
    var self = this;
    self.settings = {};

    function ajax(obj) {
        var request = window.XMLHttpRequest ? new window.XMLHttpRequest() : new ActiveXObject("Microsoft.XMLHTTP"),
            headers = obj.headers,
            deferred = new q.Deferred();
        if (headers) {
            for (var i = 0; i < headers.length; i++) {
                request.setRequestHeader(headers[i].key, headers[i].value);
            }
        }
        request.open(obj.method, obj.url, obj.async || true);
        if (obj.before) {
            obj.before(request);
        }
        if (self.settings.before) {
            self.settings.before(request);
        }
        request.onreadystatechange = function () {
            switch (request.readyState) {
                case 2: (obj.sent && obj.sent(request));
                    break;
                case 4:
                    if (self.settings.after) {
                        self.settings.after(request.responseText, request.status, request);
                    }
                    var jsonData,
                        contentTypeHeader = request.getResponseHeader("content-type");
                    if (contentTypeHeader && contentTypeHeader.toLowerCase().indexOf("json") != -1) {
                        jsonData = JSON.parse(request.responseText);
                    }
                    if (request.status == 200) {
                        if (obj.success) {
                            obj.success(jsonData || request.responseText, request, request.status);
                        }
                        deferred.resolve(jsonData || request.responseText);
                    } else {
                        if (obj.error) {
                            obj.error(jsonData || request.responseText, request, request.status);
                        }
                        deferred.reject(request);
                    }
                    break;
            }

        }
        setTimeout(function () {
            request.send();
        }, 0);
        return function () {
            return deferred.promise;
        };
    }
    this.export = {
        $keep: {
            get: function (obj) {
                obj.method = "GET";
                return ajax(obj);
            },
            put: function (obj) {
                obj.method = "PUT";
                return ajax(obj);
            },
            post: function (obj) {
                obj.method = "POST";
                return ajax(obj);
            },
            delete: function (obj) {
                obj.method = "DELETE";
                return ajax(obj);
            }
        },
        before: function (callback) {
            self.settings.before = callback;
        },
        after: function (callback) {
            self.settings.after = callback;
        }
    }
});