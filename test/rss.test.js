const { JSDOM } = require('jsdom');
const sampleFeed = require('fs').readFileSync(__dirname + '/fixtures/contentful.rss.xml').toString();
const sampleFeedParsed = require('./fixtures/contentful.rss.json');
const { expect } = require('chai');
const fetch = require('node-fetch');
const moment = global.moment = require('moment');
const { stub } = require('sinon');
const { version } = require('../package.json');
const RSS = require('../dist/rss.node.min');

describe('rss', () => {
    let $, element, originalGetJson, window;

    const feedUrl = 'https://www.contentful.com/blog/feed.xml';
    const fakeGetJson = (rss, content) => {
        rss._fetchFeed = async () => ({
            responseData: {
                feed: {
                    entries: [{
                        content: content,
                        contentSnippet: content
                    }]
                }
            }
        });
    };

    before(() => {
        const jsdom = new JSDOM(`<!DOCTYPE html>`);

        global.window = window = jsdom.window;
        global.document = window.document;
        global.fetch = fetch;
    });

    beforeEach(() => {
        element = window.document.createElement('div');
        window.document.body.appendChild(element);
    });

    afterEach(() => {
        if (typeof originalGetJson === 'function') {
            $.getJSON = originalGetJson;
            originalGetJson = null;
        }
    });

    it('renders an unordered list by default', () => {
        return new RSS(element, feedUrl, {}).render().then(function () {
            var renderedContent = element.innerHTML.replace(/\n/g, '');

            expect(renderedContent).to.match(/<ul>.*<\/ul>/);
        });
    });

    it('renders 2 list entries if limit is set to 2', () => {
        return new RSS(element, feedUrl, {
            limit: 2
        }).render().then(() => {
            expect(element.querySelectorAll('li').length).to.equal(2);
        });
    });

    it('renders the defined entry template', () => {
        return new RSS(element, feedUrl, {
            limit: 1,
            entryTemplate: '<li>foo</li>'
        }).render().then(() => {
            var renderedContent = element.outerHTML.split('\n').map(s => s.trim()).join('').trim();

            expect(renderedContent).to.match(/<ul><li>foo<\/li><\/ul>/);
        });
    });

    it('renders the defined layout template', () => {
        return new RSS(element, feedUrl, {
            limit: 1,
            layoutTemplate: 'foo<ul>{entries}</ul>bar'
        }).render().then(() => {
            var renderedContent = element.innerHTML.replace(/\n/g, '');

            expect(renderedContent).to.match(/foo<ul>.*<\/ul>/);
        });
    });

    it('supports custom tokens', () => {
        return new RSS(element, feedUrl, {
            limit: 1,
            entryTemplate: '<li>{myCustomStaticToken} {myCustomDynamicToken}</li>',
            tokens: {
                myCustomStaticToken: 'static',
                myCustomDynamicToken: function () {
                    return 'dynamic';
                }
            }
        }).render().then(() => {
            var renderedContent = element.outerHTML.split('\n').map(s => s.trim()).join('').trim();

            expect(renderedContent).to.match(new RegExp('<ul><li>static dynamic</li></ul>'));
        });
    });

    it('removes p-tags but not the content', () => {
        const rss = new RSS(element, feedUrl, {
            limit: 1,
            entryTemplate: '<li>{bodyPlain}</li>'
        });

        fakeGetJson(rss, '<p>May the fourth be with you!</p>');

        return rss.render().then(() => {
            var renderedContent = element.innerHTML.split('\n').map(function (s) {
                return s.trim();
            }).join('').trim();

            expect(renderedContent).to.match(/<ul><li>May the fourth be with you!<\/li><\/ul>/);
        });
    });

    it('calls the error callback if something went wrong', () => {
        return new Promise((resolve, reject) => {
            new RSS(element, 'https://google.com').render().then(reject, resolve);
        });
    });

    it('calls the success callback', () => {
        return new RSS(element, feedUrl, { limit: 1 }).render();
    });

    it('renders the defined entry template in the layout template', () => {
        return new RSS(element, feedUrl, {
            limit: 1,
            entryTemplate: '<li>bazinga</li>',
            layoutTemplate: '<ul><li>topic</li>{entries}</ul>'
        }).render().then(() => {
            var renderedContent = element.innerHTML.replace(/\n/g, '');

            expect(renderedContent).to.equal('<ul><li>topic</li><li>bazinga</li></ul>');
        });
    });

    it('renders when layout template only contains the entries token', () => {
        const table = document.createElement('table')
        element.appendChild(table);

        return new RSS(table, feedUrl, {
            limit: 1,
            layoutTemplate: '{entries}',
            entryTemplate: '<tr><td>{title}</td></tr>'
        }).render().then(() => {
            var renderedContent = table.outerHTML.replace(/\n/g, '');

            expect(renderedContent).to.equal('<table><tbody><tr><td>Using fat bears to explain my take on the future of digital marketing</td></tr></tbody></table>');
        });
    });

    // it('sends the lib version during feedrapp requests', (done) => {
    //     const ajaxStub = stub($, 'getJSON').callsFake(function (apiUrl) {
    //         expect(apiUrl).to.match(new RegExp(`version=${version}`));
    //         ajaxStub.restore();
    //         done();
    //     });

    //     element.rss(feedUrl, { ssl: true });
    // });

    // describe('support', () => {
    //     it('sends the enables support by default', (done) => {
    //         const ajaxStub = stub($, 'getJSON').callsFake(function (apiUrl) {
    //             expect(apiUrl).to.match(/support=true/);
    //             ajaxStub.restore();
    //             done();
    //         });

    //         element.rss(feedUrl, { ssl: true });
    //     });

    //     it('turns of support if configured respectively', (done) => {
    //         const ajaxStub = stub($, 'getJSON').callsFake(function (apiUrl) {
    //             expect(apiUrl).to.match(/support=false/);
    //             ajaxStub.restore();
    //             done();
    //         });

    //         element.rss(feedUrl, { ssl: true, support: false });
    //     })
    // });

    // describe('ssl', function () {
    //     it('rewrites the host to feedrapp.info if not specified differently', function (done) {
    //         const ajaxStub = stub($, 'getJSON').callsFake(function (apiUrl) {
    //             expect(apiUrl).to.match(/https:\/\/www\.feedrapp\.info/);
    //             ajaxStub.restore();
    //             done();
    //         });

    //         element.rss(feedUrl, { ssl: true });
    //     });

    //     it('uses feedrapp.info if ssl is turned off', function (done) {
    //         const ajaxStub = stub($, 'getJSON').callsFake(function (apiUrl) {
    //             expect(apiUrl).to.match(/http:\/\/www\.feedrapp\.info/);
    //             ajaxStub.restore();
    //             done();
    //         });

    //         element.rss(feedUrl, { ssl: false });
    //     });

    //     it('does not overwrite the host if it was specified manually', function (done) {
    //         const ajaxStub = stub($, 'getJSON').callsFake(function (apiUrl) {
    //             expect(apiUrl).to.match(/https:\/\/foo\.com/);
    //             ajaxStub.restore();
    //             done();
    //         });

    //         element.rss(feedUrl, { ssl: true, host: 'foo.com' });
    //     });
    // });

    // describe('tokens', function () {
    //     describe('> feed', function () {
    //         it('returns all feed tokens but entries', function (done) {
    //             var $container = element;

    //             $container.rss(feedUrl, {
    //                 limit: 1,
    //                 entryTemplate: '<li>{something}</li>',
    //                 layoutTemplate: '<ul>{entries}</ul>',
    //                 tokens: {
    //                     something: function (entry, tokens) {
    //                         expect(tokens.feed.entries).to.be.undefined;
    //                         return tokens.feed.title;
    //                     }
    //                 }
    //             }).render().then( () => {
    //                 var renderedContent = element.innerHTML.replace(/\n/g, '');

    //                 expect(renderedContent).to.equal('<ul><li>Contentful - Blog</li></ul>');
    //                 done();
    //             });
    //         });
    //     });

    //     describe('> bodyPlain', function () {
    //         describe('> XSS >', function () {
    //             after(function (done) {
    //                 var $container = element;

    //                 $container.rss(feedUrl, {
    //                     limit: 1,
    //                     entryTemplate: '<li>{bodyPlain}</li>'
    //                 }).render().then( () => {
    //                     var renderedContent = element.innerHTML.split('\n').map(function (s) {
    //                         return s.trim();
    //                     }).join('').trim();

    //                     expect(renderedContent).to.match(/<ul><li>.*<\/li><\/ul>/);

    //                     done();
    //                 });
    //             });

    //             it('removes script tags if they are plain', function () {
    //                 fakeGetJson('<script>alert(1)</script>');
    //             });

    //             it('removes script tags with attributes', function () {
    //                 fakeGetJson('<script type="text/javascript">alert(1)</script>');
    //             });

    //             it('removes script tags with capital letters', function () {
    //                 fakeGetJson('<SCRIPT SRC=http://ha.ckers.org/xss.js>hallo</SCRIPT>');
    //             });

    //             it('strips unsecure image tags with embedded linebreak', function () {
    //                 fakeGetJson('<IMG SRC="jav&#x09;ascript:alert(\'XSS\');">');
    //             });

    //             it('strips unsecure image tags with embedded carriage return', function () {
    //                 fakeGetJson('<IMG SRC="jav&#x0D;ascript:alert(\'XSS\');">');
    //             });

    //             it('strips unsecure image tags with real carriage return', function () {
    //                 /* jshint ignore:start */
    //                 /* jscs:disable */
    //                 fakeGetJson('<IMG\nSRC\n=\n"\nj\na\nv\na\ns\nc\nr\ni\np\nt\n:\na\nl\ne\nr\nt\n(\n\'\nX\nS\nS\n\'\n)\n"\n>\n');
    //                 /* jscs:enable */
    //                 /* jshint ignore:end */
    //             });

    //             it('strips unsecure image tags with \0 in \'javascript\'', function () {
    //                 fakeGetJson('<IMG SRC=java\0script:alert("XSS")>');
    //             });

    //             it('strips unsecure image tags with meta char before javascript tag', function () {
    //                 fakeGetJson('<IMG SRC=" &#14;  javascript:alert(\'XSS\');">');
    //             });

    //             it('strips script/xss tags', function () {
    //                 fakeGetJson('<SCRIPT/XSS SRC="http://ha.ckers.org/xss.js"></SCRIPT>');
    //             });

    //             it('strips script/src tags', function () {
    //                 fakeGetJson('<SCRIPT/SRC="http://ha.ckers.org/xss.js"></SCRIPT>');
    //             });

    //             it('strips unsecure body tag', function () {
    //                 fakeGetJson('<BODY onload!#$%&()*~+-_.,:;?@[/|\]^`=alert("XSS")>');
    //             });

    //             it('strips the unclosed script tag', function () {
    //                 fakeGetJson('<SCRIPT SRC=http://ha.ckers.org/xss.js?<B>');
    //             });

    //             it('strips unclosed script tags without protocol in src', function () {
    //                 fakeGetJson('<SCRIPT SRC=//ha.ckers.org/.j>');
    //             });

    //             it('strips script tags with line breaks in between', function () {
    //                 fakeGetJson('<SCRIPT>a=/XSS/\nalert(a.source)</SCRIPT>');
    //             });

    //             it('strips script tags when the come after a closing title tag', function () {
    //                 fakeGetJson('</TITLE><SCRIPT>alert("XSS");</SCRIPT>');
    //             });

    //             it('strips input tags with javascript in src attribute', function () {
    //                 fakeGetJson('<INPUT TYPE="IMAGE" SRC="javascript:alert(\'XSS\');">');
    //             });

    //             it('strips body tag with background attribute', function () {
    //                 fakeGetJson('<BODY BACKGROUND="javascript:alert(\'XSS\')">');
    //             });

    //             it('strips body tag with onload attribute', function () {
    //                 fakeGetJson('<BODY ONLOAD=alert(\'XSS\')>');
    //             });

    //             it('strips tags with html quotation', function () {
    //                 fakeGetJson('<SCRIPT a=">" SRC="http://ha.ckers.org/xss.js"></SCRIPT>');
    //             });
    //         });

    //         describe('> XSS 2 >', function () {
    //             var tests = [{
    //                 name: 'strips unsecure image tags with \0 in \'script\'',
    //                 test: '<SCR\0IPT>alert("XSS")</SCR\0IPT>',
    //                 result: 'alert("XSS")'
    //             }, {
    //                 name: 'strips script tags with extraneous open brackets',
    //                 test: '<<SCRIPT>alert("XSS");//<</SCRIPT>',
    //                 result: '&lt;'
    //             }, {
    //                 name: 'strips half open html/javascript xss vector',
    //                 test: '<IMG SRC="javascript:alert(\'XSS\')"',
    //                 result: ' SRC="javascript:alert(\'XSS\')"'
    //             }, {
    //                 name: 'strips half open iframe tags',
    //                 test: '<iFraMe SRC="javascript:alert(\'XSS\')"',
    //                 result: ' SRC="javascript:alert(\'XSS\')"'
    //             }, {
    //                 name: 'strips half open iframe tag with double open bracket',
    //                 test: '<iframe src=http://ha.ckers.org/scriptlet.html <',
    //                 result: ' src=http://ha.ckers.org/scriptlet.html &lt;'
    //             }, {
    //                 name: 'strips meta tags with content',
    //                 test: '<META HTTP-EQUIV="Link" Content="<http://ha.ckers.org/xss.css>; REL=stylesheet">',
    //                 result: '; REL=stylesheet"&gt;'
    //             }];

    //             tests.forEach(function (test) {
    //                 it(test.name, function (done) {
    //                     var $container = element;
    //                     var self = this;

    //                     fakeGetJson(test.test);

    //                     $container.rss(feedUrl, {
    //                         limit: 1,
    //                         entryTemplate: '<li>{bodyPlain}</li>'
    //                     }).render().then( () => {
    //                         $.getJSON = self.originalGetJSON;

    //                         var renderedContent = element.innerHTML.split('\n').map(function (s) {
    //                             return s.trim();
    //                         }).join('').trim();

    //                         expect(renderedContent).to.equal('<ul><li>' + test.result + '</li><\/ul>');

    //                         done();
    //                     });
    //                 });
    //             });
    //         });
    //     });

    //     describe('> date', function () {
    //         it('renders english dates by default', function (done) {
    //             var $container = element;

    //             $container.rss(feedUrl, {}).render().then( () => {
    //                 var renderedContent = element.innerHTML.replace(/\n/g, '');

    //                 expect(renderedContent).to.match(/<a href=".*">\[.*(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday) .*\].*<\/a>/);
    //                 done();
    //             });
    //         });

    //         it('renders german dates if enabled', function (done) {
    //             var $container = element;

    //             $container.rss(feedUrl, { dateLocale: 'de' }).render().then( () => {
    //                 var renderedContent = element.innerHTML.replace(/\n/g, '');

    //                 expect(renderedContent).to.match(/<a href=".*">\[.*(Montag|Dienstag|Mittwoch|Donnerstag|Freitag|Samstag|Sonntag).*\].*<\/a>/);
    //                 done();
    //             });
    //         });
    //     });
    // });
});
