var Location = require('../models/LocationModel.js');
var request = require('request');

// tmp variables
var sExpediaKey = "Rb4v7KFeKxU0bTOjqFg9kDTrzZgSQpWc";
var sExpediaRequestRoot = "http://terminal2.expedia.com/x/nlp/results?q=";
var sCompleteKey = "&apikey=" + sExpediaKey;

var sQuery1 = "people"+ "landscape "+ "group "+ "daylight "+ "adult "+ "rock "+ "seashore "+ "travel "+ "environment "+ "recreation "+ "tourism "+ "man "+ "mountain "+ "outdoors "+ "many "+ "scenic " + "motion "+ "tourist "+ "sky "+ "adventure ";
var sQuery2 = "beach "+  "water "+  "people "+  "sea "+  "seashore "+  "travel "+  "ocean "+  "leisure "+  "recreation "+  "sand "+  "group "+  "outdoors "+  "man "+  "adult "+  "daylight "+  "lifestyle "+  "vacation "+  "landscape "+  "sky "+  "summer ";
var sQuery3 = "indoors "+"window "+"interior design "+"furniture "+"no person "+"room "+"contemporary "+"seat "+"house "+"chair "+"curtain "+"home "+"table "+"luxury "+"wood "+"easy chair "+"apartment "+"architecture "+"rug "+"family"
var sQuery4 = "architecture winter snow outdoors travel church religion no person sky traditional building cross cold Christmas old tourism Orthodox landmark spirituality city";
var sQuery5 = "vehicle people competition race group festival many group transportation system adult man track race rally auto racing championship action road woman hurry"

var sFinalQuery = sExpediaRequestRoot + sQuery5 + sCompleteKey

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

exports.getLocations = function(req, res) {
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
       
        res.render('locations', {locations: aLocations});
      }
    };

    aLocations.forEach(function(location, index) {
      requestCall(location.sImageUrl, fnGetImageInfoSuccess, index);
    })
  }
  requestCall(sFinalQuery, parseExpediaResponse);
};