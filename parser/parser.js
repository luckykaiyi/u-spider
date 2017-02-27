var feed = require('feed-read');
var parser = {
    parseXML: function (str) {
        var type = feed.identify(str);
        if (!type) {
            return;
        }
        var jobs = [];
        feed[type](str, function(err, articles) {
            for(var i = 0; i < articles.length; i++) {
                jobs.push({
                    'title': articles[i].title,
                    'content': articles[i].content,
                    'url': articles[i].link,
                    'topic':[]
                })
            }
        })
        return jobs;
    } 
}
module.exports = parser;
