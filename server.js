// node_example.js - Example showing use of Clarifai node.js API

var env = require('./env.js');
var Clarifai = require('./clarifai_node.js');
Clarifai.initAPI(process.env.CLIENT_ID, process.env.CLIENT_SECRET);


var stdio = require('stdio');
var request = require("request")


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
    var topTags = getTopNTagsAsString(sortedArray, 10);
    console.log(topTags);
    getDestination(topTags);
  }
}

// exampleTagSingleURL() shows how to request the tags for a single image URL
function exampleTagSingleURL() {
  // var testImageURL = 'http://www.clarifai.com/img/metro-north.jpg';
  var testImageURL = 'https://scontent-sea1-1.xx.fbcdn.net/hphotos-xtf1/v/t1.0-9/10557291_790760364288671_3921226209702919389_n.jpg?oh=a0bc4ce1da64a4ab3e5f7ad3cdc6c812&oe=573290BC'

  var ourId = "train station 1"; // this is any string that identifies the image to your system

  // Clarifai.setRequestTimeout( 100 ); // in ms - expect: force a timeout response
  // Clarifai.setRequestTimeout( 100 ); // in ms - expect: ensure no timeout

  Clarifai.tagURL( testImageURL , ourId, commonResultHandler );
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
  Clarifai.tagURL( urls , ourIds, commonResultHandler );
}

function getUserUrls(user_token) {
  var urls = require("./test.json");
  var half_length = Math.ceil(urls.length / 2);

  var leftSide = urls.splice(0,half_length);
  return leftSide;
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

// function tagSinglePhoto() {
//   var testImageURL = 'http://www.clarifai.com/img/metro-north.jpg';
//   var ourId = "train station 1"; // this is any string that identifies the image to your system

//   // Clarifai.setRequestTimeout( 100 ); // in ms - expect: force a timeout response
//   // Clarifai.setRequestTimeout( 100 ); // in ms - expect: ensure no timeout



// exampleTagSingleURL();
tagMultipleURL();
// exampleFeedback();
Clarifai.clearThrottleHandler();

function printArray(array) {
  array.forEach(function(element) {
    console.log(element);
  });
}

function getNames(aElement) {
  var aName = aElement.map(function(aElement){
    return aElement.name;
  });
  printArray(aName);
}

function parseExpediaResponse(oResponse) {
  var oResponseResult = oResponse.result;
  if (oResponseResult.pois !== undefined) {
    // console.log(oResponseResult.pois);
    getNames(oResponseResult.pois);
  }
  else if (oResponseResult.regions !== undefined) {
    // console.log(oResponseResult.pois);
    getNames(oResponseResult.regions);
  }
  else if (oResponseResult.clusters !== undefined) {
    // console.log(oResponseResult.pois);
  }
  else {
    console.log("Error");
  }
}

function getDestination(query) {
  var sExpediaKey = "Rb4v7KFeKxU0bTOjqFg9kDTrzZgSQpWc";
  var sExpediaRequestRoot = "http://terminal2.expedia.com/x/nlp/results?q=";
  var sCompleteKey = "&apikey=" + sExpediaKey;

  // var sQuery1 = "people"+ "landscape "+ "group "+ "daylight "+ "adult "+ "rock "+ "seashore "+ "travel "+ "environment "+ "recreation "+ "tourism "+ "man "+ "mountain "+ "outdoors "+ "many "+ "scenic " + "motion "+ "tourist "+ "sky "+ "adventure ";
  // var sQuery2 = "beach "+  "water "+  "people "+  "sea "+  "seashore "+  "travel "+  "ocean "+  "leisure "+  "recreation "+  "sand "+  "group "+  "outdoors "+  "man "+  "adult "+  "daylight "+  "lifestyle "+  "vacation "+  "landscape "+  "sky "+  "summer ";
  // var sQuery3 = "indoors "+"window "+"interior design "+"furniture "+"no person "+"room "+"contemporary "+"seat "+"house "+"chair "+"curtain "+"home "+"table "+"luxury "+"wood "+"easy chair "+"apartment "+"architecture "+"rug "+"family"
  // var sQuery4 = "architecture winter snow outdoors travel church religion no person sky traditional building cross cold Christmas old tourism Orthodox landmark spirituality city";
  // var sQuery5 = "vehicle people competition race group festival many group transportation system adult man track race rally auto racing championship action road woman hurry"

  var sFinalQuery = sExpediaRequestRoot + query + sCompleteKey
  console.log(sFinalQuery);

  request({
     url: sFinalQuery,
     json: true
  }, function (error, response, body) {
     if (!error && response.statusCode === 200) {
        // console.log(body.result.pois) // Print the json response
        parseExpediaResponse(body);
     }
  })
}













