var http = require('http');
var https = require('https');
var url = require('url');
var iconv = require('iconv-lite');
var crypto = require('crypto');
var mysql = require('mysql');
var parser = require('./parser/parser.js');
var topics = require('./topics/topics.js')

var connection = mysql.createConnection(
    {
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'youdingyue'
    }
)
var spider = {
    init: function() {
        this.runTask();
    },
    tasks: {
        'byr': [
            'https://bbs.byr.cn/rss/board-ParttimeJob',
            'https://bbs.byr.cn/rss/board-JobInfo',
            'https://bbs.byr.cn/rss/board-Job'
        ],
        'smth': [
            'http://www.newsmth.net/nForum/rss/board-Career_Campus',
            'http://www.newsmth.net/nForum/rss/board-Career_PHD',
            'http://www.newsmth.net/nForum/rss/board-Career_Plaza',
            'http://www.newsmth.net/nForum/rss/board-Career_Upgrade',
            'http://www.newsmth.net/nForum/rss/board-ExecutiveSearch'
        ],
        'v2ex': [
            'https://www.v2ex.com/feed/jobs.xml'
        ]
    },
    runTask: function() {
        var self = this;
        var httpModule, options, taskUrl, urlData;
        for(var i in self.tasks) {
            for(var j = 0; j < self.tasks[i].length; j++) {
                taskUrl = self.tasks[i][j];
                urlData = url.parse(taskUrl);
                httpModule = urlData.protocol == 'https:' ? https : http;
                options = {
                    hostname: urlData.hostname,
                    path: urlData.path
                }
                self.crawl(httpModule, options, i);
            }
        }
    },
    crawl: function(httpModule, options, source) {
        var self = this;
        var arr = [];
        httpModule.get(options, function(res) {
            res.on('data', function(chunk) {
                arr.push(chunk);
            });
            res.on('end', function(chunk) {
               if (source == 'v2ex') {
                   var body = Buffer.concat(arr).toString();
               } else {
                   var body = iconv.decode(Buffer.concat(arr), 'gb2312')
               }
               var jobs =  parser.parseXML(body);
               if (!jobs) {
                   return false;
               }
               var title, topic;
               for(var i = 0; i < jobs.length; i++) {
                   title = jobs[i].title;
                   topic = jobs[i].topic;
                   jobs[i].source = source;
                   self.matchTopic(title, topic, topics);
               }
               self.store(jobs);
            })
        })
    },
    matchTopic: function(jobTitle, jobTopic, taskTopics) {
        var jobTitle = jobTitle.toLowerCase();
        for( var i in taskTopics) {
            for(var j = 0; j < taskTopics[i].length; j++) {
                var keyword = taskTopics[i][j].toLowerCase();
                if(jobTitle.indexOf(keyword) != -1) {
                    jobTopic.push(i);
                    break;
                }
            }
        }
    },
    store: function(jobs) {
        var addJob = 'insert into jobs (jobid, title, content, source, url) values (?, ?, ?, ?, ?) on duplicate key update jobid = values(jobid)';
        var addJobTopic = 'insert into jobs_topic (topic, jobid) values (?, ?)';
        for (var i = 0; i < jobs.length; i++ ) {
            var topicsArr = jobs[i].topic;
            if (topicsArr.length > 0) {
                console.log(jobs[i].title, jobs[i].source)
                var str = jobs[i].title + jobs[i].source + jobs[i].url;
                var jobid = crypto.createHash('md5').update(str).digest('hex');
                var addJob_Params = [jobid, jobs[i].title, jobs[i].content, jobs[i].source, jobs[i].url];
                var doSql = function(jobid, topicsArr, addJob_Params) {
                    connection.query(addJob, addJob_Params,  function(err, rows, fields) {
                        if (err) {
                            console.log(err, addJob_Params);
                        } else {
                            if (rows.insertId) {
                                for (var j = 0; j < topicsArr.length; j++) {
                                    var addJobTopic_Params = [topicsArr[j], jobid];
                                    connection.query(addJobTopic, addJobTopic_Params, function(err, rows, fields) {
                                        if (err) throw err;
                                    })
                                }
                            }
                        }
                    })
                };
                doSql(jobid, topicsArr, addJob_Params);
            }
        }
    }
}
spider.init();


