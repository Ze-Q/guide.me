var request = require('request');
var _ = require('lodash');
var User = require('../models/User');

exports.getPhoto = function(req, res, next) {
    var token = _.find(req.user.tokens, { kind: 'facebook' });

    var listOfPhotos = [];
    request('https://graph.facebook.com/v2.5/' + req.user.facebook + '/photos?access_token='
        + token.accessToken + '&fields=source&limit=100&type=uploaded', function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var parsedBody = JSON.parse(body);
            for (var i = 0; i < parsedBody.data.length; i++) {
                listOfPhotos.push(parsedBody.data[i].source);
            }
            res.send(JSON.stringify(listOfPhotos));
        }
    });
};