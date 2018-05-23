# LiteJS #

LiteJS is light weight javascript framework to create client side application. It is 5.3KB when gzipped and 16kb when just minified. 

It uses the MVC design pattern to structure the web application code. You can create plugable modules, services, components and providers and many others to structure your application code. You can also create plugins which can you reuse in other projects. 

It took some of the priciples from angularJS to create components and some principles from backboneJS to bind the DOM events on DOM nodes. 

LiteJS does not have templating engion, but it provide very simple interface to configure your template engion to render your htmls. It allows you to choose any templating engion of your choice, might be handlebarJs, rivetsJs, VueJS any engion you are comfortable with. 
LiteJS does not use any third party library to run, but if you want to give support for olders browsers as well then you might have to include Webcomponent.js and Polyfill.js.


## Default Service Provided By LiteJS ##
* Depedency Injection
* Auto instance creation when required.
* Memory management by removing instances if associated DOM element is removed.
* Communcation between component by standard channels
* Events binding on DOM elements
* Updating DOM with the help of templating engion
* Custom DOM events
* Light weight ajax

## Component Type list ##

* Modules
* Providers
* Components as UI Component
* Services
* Func as Injectable Functions

## LiteJS default services ##

* ltPromise
* ltRouter
* ltAjax
* ltQuery(light weight DOM query with utility function)

### How do I get set up? ###

You can include the liteJS in your default html page your application.
```javascript

<script src="litejs.min.js"></script>

```

### Contribution guidelines ###

* Write documentation for LiteJS
* Someone can perform code reviews.
* Can help to improve this framework.

### Contact Info. ###
```html
litejs@gmail.com
```