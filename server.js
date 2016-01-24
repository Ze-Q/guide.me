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
  // console.log(results);
  var myMap = {};
  results.reduce(function (map, obj) {
    // console.log("MAP: " + map);
    // console.log("OBJ: " + obj);
    var classes = obj.result.tag.classes;
    var probs = obj.result.tag.probs;
    classes.forEach(function (value, i) {
      // console.log('%d: %s ', i, value, probs[i]);
      if (!(value in map)) {
        map[value] = probs[i];
      } else {
        map[value] += probs[i];
      }
      // console.log(map);
    });
    return map;
  }, myMap);
  return myMap;
}

function tagMultipleURL() {
  // var testImageURLs = [
  // "http://www.clarifai.com/img/metro-north.jpg",
  // "http://www.clarifai.com/img/metro-north.jpg" ];
  var urls = getUserUrls("");
  var ourIds =  [ "1", "2", "3", "4", "5" ]; // this is any string that identifies the image to your system

  Clarifai.tagURL( urls , ourIds, commonResultHandler );
}

// exampleFeedback() shows how to send feedback (add or remove tags) from
// a list of docids. Recall that the docid uniquely identifies an image previously
// presented for tagging to one of the tag methods.
function exampleFeedback() {
// these are docids that just happen to be in the database right now. this test should get
// upgraded to tag images and use the returned docids.
var docids = [
  "15512461224882630000",
  "9549283504682293000"
  ];
  var addTags = [
  "addTag1",
  "addTag2"
  ];
  Clarifai.feedbackAddTagsToDocids( docids, addTags, null, function( err, res ) {
    if( opts["print-results"] ) {
      console.log( res );
    };
  } );

  var removeTags = [
  "removeTag1",
  "removeTag2"
  ];
  Clarifai.feedbackRemoveTagsFromDocids( docids, removeTags, null, function( err, res ) {
    if( opts["print-results"] ) {
      console.log( res );
    };
  } );
}

function getUserUrls(user_token) {
  urls = [
    "https://scontent-sea1-1.xx.fbcdn.net/hphotos-frc3/v/t1.0-9/10574333_790759987622042_5993114939034607283_n.jpg?oh=fd9db529e8aa986039c55063e44749d1&oe=57371CC3",
    "https://scontent-sea1-1.xx.fbcdn.net/hphotos-xlt1/v/t1.0-9/10462803_790761037621937_5571451144804357940_n.jpg?oh=601612d71f3919fe2b7ec068eff248df&oe=57325CC0",
    "https://scontent-sea1-1.xx.fbcdn.net/hphotos-xtf1/v/t1.0-9/10557180_790760750955299_3387434584462729996_n.jpg?oh=c01ce65dbff73a2d4b50abec7826c4ed&oe=5700B0B3",
    "https://scontent-sea1-1.xx.fbcdn.net/hphotos-xpa1/v/t1.0-9/17320_10207245950646020_2831079388823585805_n.jpg?oh=ba68abf463d099da798a83c47f79490d&oe=572D2CFD",
    "https://scontent-sea1-1.xx.fbcdn.net/hphotos-xfa1/v/t1.0-9/10553454_10152188874706971_2758727942823215891_n.jpg?oh=561bc02a8a777194b8adc9ee1067ce49&oe=5749C7A3"
  ]
  return urls;
}

// function tagSinglePhoto() {
//   var testImageURL = 'http://www.clarifai.com/img/metro-north.jpg';
//   var ourId = "train station 1"; // this is any string that identifies the image to your system

//   // Clarifai.setRequestTimeout( 100 ); // in ms - expect: force a timeout response
//   // Clarifai.setRequestTimeout( 100 ); // in ms - expect: ensure no timeout



// // exampleTagSingleURL();
// tagMultipleURL();
// // exampleFeedback();
// Clarifai.clearThrottleHandler();


var sExpediaKey = "Rb4v7KFeKxU0bTOjqFg9kDTrzZgSQpWc";
var sExpediaRequestRoot = "http://terminal2.expedia.com/x/nlp/results?q=";
var sCompleteKey = "&apikey=" + sExpediaKey;

var sQuery1 = "people"+ "landscape "+ "group "+ "daylight "+ "adult "+ "rock "+ "seashore "+ "travel "+ "environment "+ "recreation "+ "tourism "+ "man "+ "mountain "+ "outdoors "+ "many "+ "scenic " + "motion "+ "tourist "+ "sky "+ "adventure ";
var sQuery2 = "beach "+  "water "+  "people "+  "sea "+  "seashore "+  "travel "+  "ocean "+  "leisure "+  "recreation "+  "sand "+  "group "+  "outdoors "+  "man "+  "adult "+  "daylight "+  "lifestyle "+  "vacation "+  "landscape "+  "sky "+  "summer ";
var sQuery3 = "indoors "+"window "+"interior design "+"furniture "+"no person "+"room "+"contemporary "+"seat "+"house "+"chair "+"curtain "+"home "+"table "+"luxury "+"wood "+"easy chair "+"apartment "+"architecture "+"rug "+"family"
var sQuery4 = "architecture winter snow outdoors travel church religion no person sky traditional building cross cold Christmas old tourism Orthodox landmark spirituality city";
var sQuery5 = "vehicle people competition race group festival many group transportation system adult man track race rally auto racing championship action road woman hurry"

var sFinalQuery = sExpediaRequestRoot + sQuery5 + sCompleteKey
// console.log(sFinalQuery);

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
    aLocations[index].sImageUrl = oImageInfo.photos[0].photo_file_url;
    iCounter++;
    if (iCounter === aLocations.length) {
      printArray(aLocations);
    }
  };

  aLocations.forEach(function(location, index) {
    requestCall(location.sImageUrl, fnGetImageInfoSuccess, index);
  })
}

function getPanoramioQuery(iLatitude, iLongitude) {
  var iThhold = 0.05;
  var iMinx = iLongitude - iThhold;
  var iMaxx = iLongitude + iThhold;
  var iMiny = iLatitude - iThhold;
  var iMaxy = iLatitude + iThhold;

  var queryPanoramioRoot = "http://www.panoramio.com/map/get_panoramas.php?order=popularity&set=public&from=0&to=1"
    + "&minx=" + iMinx + "&miny=" + iMiny + "&maxx=" + iMaxx + "&maxy=" + iMaxy; 
    // ??&callback=MyCallback";
  return queryPanoramioRoot;
}

// console.log(getPanoramioQuery(45.5017, -73.5673));
// Expedia requests
requestCall(sFinalQuery, parseExpediaResponse);



















