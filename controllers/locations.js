var Location = require('../models/LocationModel.js');
var _ = require('lodash');
var User = require('../models/User');
var stdio = require('stdio');
var request = require("request")

exports.getLocations = function(req, res) {
  var token = _.find(req.user.tokens, { kind: 'facebook' });

  var listOfPhotos = [];
  request('https://graph.facebook.com/v2.5/' + req.user.facebook + '/photos?access_token='
      + token.accessToken + '&fields=source&limit=100&type=uploaded', function (error, response, body) {
      if (!error && response.statusCode == 200) {
          var parsedBody = JSON.parse(body);
          for (var i = 0; i < parsedBody.data.length; i++) {
              listOfPhotos.push(parsedBody.data[i].source);
          }
          var Clarifai = require('../clarifai_node.js');
          Clarifai.initAPI(process.env.CLIENT_ID, process.env.CLIENT_SECRET);
          // support some command-line options
          var opts = stdio.getopt( {
            'print-results' : { description: 'print results'},
            'print-http' : { description: 'print HTTP requests and responses'},
            'verbose' : { key : 'v', description: 'verbose output'}
          });
          var verbose = opts["verbose"];
          Clarifai.setVerbose( verbose );
          if( opts["print-http"] ) {
            Clarifai.setLogHttp( true ) ;
          }

          if(verbose) console.log("using CLIENT_ID="+Clarifai._clientId+", CLIENT_SECRET="+Clarifai._clientSecret);

          // Setting a throttle handler lets you know when the service is unavailable because of throttling. It will let
          // you know when the service is available again. Note that setting the throttle handler causes a timeout handler to
          // be set that will prevent your process from existing normally until the timeout expires. If you want to exit fast
          // on being throttled, don't set a handler and look for error results instead.

          Clarifai.setThrottleHandler( function( bThrottled, waitSeconds ) {
            console.log( bThrottled ? ["throttled. service available again in",waitSeconds,"seconds"].join(' ') : "not throttled");
          });

          function commonResultHandler( err, res ) {
            if( err != null ) {
              if( typeof err["status_code"] === "string" && err["status_code"] === "TIMEOUT") {
                console.log("TAG request timed out");
              }
              else if( typeof err["status_code"] === "string" && err["status_code"] === "ALL_ERROR") {
                console.log("TAG request received ALL_ERROR. Contact Clarifai support if it continues.");
              }
              else if( typeof err["status_code"] === "string" && err["status_code"] === "TOKEN_FAILURE") {
                console.log("TAG request received TOKEN_FAILURE. Contact Clarifai support if it continues.");
              }
              else if( typeof err["status_code"] === "string" && err["status_code"] === "ERROR_THROTTLED") {
                console.log("Clarifai host is throttling this application.");
              }
              else {
                console.log("TAG request encountered an unexpected error: ");
                console.log(err);
              }
            }
            else {
              if( opts["print-results"] ) {
                // if some images were successfully tagged and some encountered errors,
                // the status_code PARTIAL_ERROR is returned. In this case, we inspect the
                // status_code entry in each element of res["results"] to evaluate the individual
                // successes and errors. if res["status_code"] === "OK" then all images were
                // successfully tagged.
                if( typeof res["status_code"] === "string" &&
                  ( res["status_code"] === "OK" || res["status_code"] === "PARTIAL_ERROR" )) {

                  // the request completed successfully
                  for( i = 0; i < res.results.length; i++ ) {
                    if( res["results"][i]["status_code"] === "OK" ) {
                      console.log( 'docid='+res.results[i].docid +
                        ' local_id='+res.results[i].local_id +
                        ' tags='+res["results"][i].result["tag"]["classes"] )
                    }
                    else {
                      console.log( 'docid='+res.results[i].docid +
                        ' local_id='+res.results[i].local_id +
                        ' status_code='+res.results[i].status_code +
                        ' error = '+res.results[i]["result"]["error"] )
                    }
                  }

                }
              }

              var map = getMostFrequentTags(res.results);
              var sortedArray = sortMapByValue(map);
              console.log(map);
              console.log(sortedArray);
              // var topTags = getTopNTagsAsString(sortedArray, 10);
              var topTags = getMiddleNTagsAsString(sortedArray, 10);
              console.log(topTags);
              getDestination(topTags);
            }
          }

          function sortMapByValue(map) {
              var tupleArray = [];
              for (var key in map) tupleArray.push([key, map[key]]);
              tupleArray.sort(function (a, b) { return b[1] - a[1] });
              return tupleArray;
          }

          function getMostFrequentTags(results) {
            var myMap = {};
            results.reduce(function (map, obj) {
              var classes = obj.result.tag.classes;
              var probs = obj.result.tag.probs;
              classes.forEach(function (value, i) {
                if (!(value in map)) {
                  map[value] = probs[i];
                } else {
                  map[value] += probs[i];
                }
              });
              return map;
            }, myMap);
            return myMap;
          }

          function tagMultipleURL() {
            var urls = getUserUrls("");
            var ourIds = new Array(urls.length);
            for (var i = 0; i < ourIds.length; i++) {
              ourIds[i] = i;
            }
            Clarifai.tagURL(urls , ourIds, commonResultHandler);
          }

          function getRandom(arr, n) {
              var result = new Array(n),
                  len = arr.length,
                  taken = new Array(len);
              if (n > len)
                  throw new RangeError("getRandom: more elements taken than available");
              while (n--) {
                  var x = Math.floor(Math.random() * len);
                  result[n] = arr[x in taken ? taken[x] : x];
                  taken[x] = --len;
              }
              return result;
          }

          function getUserUrls(user_token) {
            var urls = listOfPhotos;
            return getRandom(urls, 10);
          }

          function getTopNTagsAsString(array, N) {
            var result = "";
            console.log(array.length);
            for (var i = 0; i < N && i < array.length; i++) {
              result += array[i][0];
              result += " ";
            }
            return result;
          }

          function getMiddleNTagsAsString(array, N) {
            if (N > array.length)
                throw new RangeError("More elements taken than available");
            var result = "";
            var half_length = Math.floor(array.length / 2);
            var half_N = Math.floor(N / 2);
            console.log("ARRAY LENGTH" + array.length);
            for (var i = half_length - half_N; i < half_length + half_N; i++) {
              console.log("I: " + i);
              result += array[i][0];
              result += " ";
            }
            return result;
          }

          function getDestination(query) {
            var sExpediaKey = "Rb4v7KFeKxU0bTOjqFg9kDTrzZgSQpWc";
            var sExpediaRequestRoot = "http://terminal2.expedia.com/x/nlp/results?q=";
            var sCompleteKey = "&apikey=" + sExpediaKey;
            var sFinalQuery = sExpediaRequestRoot + query + sCompleteKey
            console.log(sFinalQuery);

            requestCall(sFinalQuery, parseExpediaResponse);
          }

          function getPanoramioQuery(iLatitude, iLongitude) {
            var iThhold = 0.003;
            var iMinx = iLongitude - iThhold;
            var iMaxx = iLongitude + iThhold;
            var iMiny = iLatitude - iThhold;
            var iMaxy = iLatitude + iThhold;

            var queryPanoramioRoot = "http://www.panoramio.com/map/get_panoramas.php?order=popularity&set=public&from=0&to=1"
              + "&minx=" + iMinx + "&miny=" + iMiny + "&maxx=" + iMaxx + "&maxy=" + iMaxy;
              // ??&callback=MyCallback";
            return queryPanoramioRoot;
          }

          function printArray(array) {
            array.forEach(function(element) {
              console.log(element);
            });
          }

          function getIdNamesAndCoordinates(aPlace) {
            // TODO: clusters
            var aLocations = [];
            aPlace.forEach(function(oPlace) {
              var oLocation = {};
              oLocation.sid = oPlace.id;
              oLocation.sName = oPlace.name;
              // if (oLocation.center !== undefined) {
                var iLatitude = oPlace.center.lat;
                var iLongitude = oPlace.center.lng;

                oLocation.sImageUrl = getPanoramioQuery(iLatitude, iLongitude);
              // }
              aLocations.push(oLocation);
            });
            // printArray(aLocations);

            return aLocations;
          }

          function requestCall(sUrl, fnCallback, index) {
              request({
               url: sUrl,
               json: true
            }, function (error, response, body) {
               if (!error && response.statusCode === 200) {
                  fnCallback(body, index);
               }
            })
          }

          function parseExpediaResponse(oResponse) {
            var oResponseResult = oResponse.result;
            var aLocations = undefined;
            var iCounter = 0;
            if (oResponseResult.pois !== undefined) {
              // console.log(oResponseResult.pois);
              aLocations = getIdNamesAndCoordinates(oResponseResult.pois);
            }
            else if (oResponseResult.regions !== undefined) {
              // console.log(oResponseResult.pois);
              aLocations = getIdNamesAndCoordinates(oResponseResult.regions);
            }
            else if (oResponseResult.clusters !== undefined) {
              // console.log(oResponseResult.pois);
            }
            else {
              console.log("Error");
            }

            var fnGetImageInfoSuccess = function(oImageInfo, index) {
              // console.log(oImageInfo.photos[0].photo_file_url);
              if (!oImageInfo.photos[0]) {
                tagMultipleURL();
                console.log("Error: oImageInfo.photos[0] is undefined");
                return;
              }
              aLocations[index].sImageUrl = oImageInfo.photos[0].photo_file_url;
              iCounter++;
              if (iCounter === aLocations.length) {
                printArray(aLocations);

                res.render('locations', {locations: aLocations});
              }
            };

            if (!aLocations) {
              tagMultipleURL();
              console.log("Error: aLocations is undefined");
              return;
            }

            aLocations.forEach(function(location, index) {
              requestCall(location.sImageUrl, fnGetImageInfoSuccess, index);
            })
          }
          tagMultipleURL();

      }
  });
};