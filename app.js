var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');




const neo4j = require('neo4j-driver').v1;
const driver = new neo4j.driver("bolt://localhost", neo4j.auth.basic("neo4j", "Sopra123!*"));
var session = driver.session();
/*
session
.run("MATCH (n) OPTIONAL MATCH (n)-[r]-() DELETE n,r")
.then(function(result) {
  console.log("suppression des noeuds");
  session
  .run("CREATE (Progos:Application { name: 'Progos', type : 'Application'}) \
  CREATE (GrandAngle:Application { name: 'Grand Angle', type : 'Application'})")
  .then(function(result) {
    
  })
  .catch((error) => {
    console.log(error);
  });
 })
.catch((error) => {
  console.log(error);
});
*/
function transform(object) {
  for (let property in object) {
    if (object.hasOwnProperty(property)) {
      const propertyValue = object[property];
      if (neo4j.isInt(propertyValue)) {
        object[property] = propertyValue.toString();
      } else if (typeof propertyValue === 'object') {
        transform(propertyValue);
      }
    }
  }
}

// fonction qui récupère les noeuds et leurs propriétés
function getData(callback)
{
var nodes = [];
session
.run("MATCH (n) RETURN (n)")
.then(function(result) {
  console.log("récupération des nodes");
  for(var i= 0; i < result.records.length; i++)
  { console.log("#######   "+JSON.stringify(result.records[i]._fields[0].properties));
    console.log("|||||||||||||||||||     "+result.records[i]._fields[0].identity);
    var nodeJson = JSON.stringify(result.records[i]._fields[0].properties);
    var nodeArray = [];
    console.log("#######   "+ nodeJson);
    nodeArray = [JSON.parse(nodeJson)];
    console.log("#######   "+ nodeArray[0].id);
    nodeArray[0].id = result.records[i]._fields[0].identity.low;
    console.log("#######   "+ JSON.stringify(nodeArray));
    nodes.push(nodeArray[0]);
    console.log(nodes.length);
  }
  return(callback(null,nodes));
 
  })
  .catch((error) => {
    console.log(error);
    return(callback(err,null));
  });
}

// fonction qui récupère les noeuds et leurs propriétés
function getEdge(callback)
{
var edges = [];
session
.run("MATCH (Application)<-[r]-(:Application) return r")
.then(function(result) {
  console.log("récupération des liens");
  console.log(JSON.stringify(result.records, null, 3));
  var fromId = "";
  var toId = "";
  var type ="";
  for(var i= 0; i < result.records.length; i++)
  { //edges.push(result.records[i]._fields[0].properties);
    fromId = result.records[i].get(0).start.low;
    toId = result.records[i].get(0).end.low;
    type = result.records[i].get(0).type;
    edges.push({from : fromId, to: toId, label:type})
  }
  return(callback(null,edges));
 
  })
  .catch((error) => {
    console.log(error);
    return(callback(err,null));
  });
}


var network=require('./networkNeo4j');
 var titre = 'carto';

var app = express();

// Load ejs views for rendering HTML
app.engine('ejs', require('ejs').renderFile);
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');


app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', function(req, res, next) {
  
  var finishRequest = function(noeuds, liens) {
    res.render('index', { title: "express", listeNoeuds: noeuds, listeEdge:  liens});
  };
   
  getData(function (err, rows) {
    if (!err) {
      getEdge(function (err, edges)
      {
        if (!err) {
          finishRequest(JSON.stringify(rows),JSON.stringify(edges));
        }
        else {
          console.log(err);
        }
      }
    );}
      else {
        console.log(err);  
    }
  });
  
});

const bodyParser = require("body-parser");
const urlencodedParser = bodyParser.json({ extended: false });

app.post('/save',urlencodedParser, (req, res) => {
  const click = {clickTime: new Date()};
  console.log(req.body);
  console.log("||||||       "+JSON.stringify(req.body));
  res.sendStatus(201);
  
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
