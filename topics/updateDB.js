var topics = require('./topics.js')
var mysql = require('mysql');

var connection = mysql.createConnection(
    {
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'youdingyue'
    }
)
function addTopic(topics) {
    var addTopicSql = 'insert into topics (name) values (?) on duplicate key update name = values(name)';
    for (var i in topics) {
        console.log(i);
        var addTopicSql_Params = [i];
        connection.query(addTopicSql, addTopicSql_Params, function(err, rows, fields) {
            if (err) throw err;
        })
    }
}
addTopic(topics);
