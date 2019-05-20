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
  { //console.log("#######   "+JSON.stringify(result.records[i]._fields[0].properties));
    //console.log("|||||||||||||||||||     "+result.records[i]._fields[0].identity);
    var nodeJson = JSON.stringify(result.records[i]._fields[0].properties);
    var nodeArray = [];
    console.log("#######   "+ nodeJson);
    nodeArray = [JSON.parse(nodeJson)];
    console.log("#######   "+ nodeArray[0].id);
    nodeArray[0].id = result.records[i]._fields[0].identity.low;
    nodeArray[0].shape = "icon";
    console.log(nodeArray[0].color);
    switch (nodeArray[0].typeNode) {   
      case 'person':
        nodeArray[0].icon = {face: 'FontAwesome', code: "\uf0c0", color:nodeArray[0].color};
        break;
      case 'software':
        nodeArray[0].icon = {face: 'FontAwesome', code: "\uf0ac", color:nodeArray[0].color};
        break;
      case 'database':
        nodeArray[0].icon = {face: 'FontAwesome', code: "\uf1c0", color:nodeArray[0].color};
       break;
      case 'flux':
        nodeArray[0].icon = {face: 'FontAwesome', code: "\uf085", color:nodeArray[0].color};
      break;
      case 'report':
        nodeArray[0].icon = { face: 'FontAwesome', code: '\uf201', color:nodeArray[0].color };
      break;
      case 'cube':
        nodeArray[0].icon = { face: 'FontAwesome', code: '\uf1b2', color:nodeArray[0].color };
      break;      
      case 'excel':
        nodeArray[0].icon = { face: 'FontAwesome', code: '\uf1c3', color:nodeArray[0].color };
      break;
      case 'application':
        nodeArray[0].icon = {face: 'FontAwesome', code: "\uf108", color:nodeArray[0].color};
      break;
      case 'SI externe':
        nodeArray[0].icon = {face: 'FontAwesome', code: "\uf1ad", color:nodeArray[0].color};
      break;
      default:
        nodeArray[0].icon = {face: 'FontAwesome', code: "\uf0ac", color:nodeArray[0].color};
    }
    //console.log("#######   "+ JSON.stringify(nodeArray));
    nodes.push(nodeArray[0]);
    console.log(nodes.length);
  }
  console.log("nnnnnnnn   "+JSON.stringify(nodes));
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
  var commentaire="";
  for(var i= 0; i < result.records.length; i++)
  { //edges.push(result.records[i]._fields[0].properties);
    fromId = result.records[i].get(0).start.low;
    toId = result.records[i].get(0).end.low;
    type = result.records[i].get(0).type;
   
    commentaire = typeof result.records[i].get(0).properties.comment !== "undefined" ? result.records[i].get(0).properties.comment : "";
    console.log("!!!!!!!!!!!!!!!   "+commentaire)
    if (type != "DEFAULT")
    { edges.push({from : fromId, to: toId, label:type, comment: commentaire})
    }
    else
    {
      edges.push({from : fromId, to: toId, comment:"", type:""})
    }
  }
  console.log("eeeeeeeeeeeee   "+JSON.stringify(edges));
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
  //console.log("test1");
  var nodesJSON = JSON.parse(JSON.stringify(req.body.nodes));
  var edgesJSON = JSON.parse(JSON.stringify(req.body.edges));
  //console.log(monJson._data["29"]);
  var tx = session.beginTransaction();

  try {
    console.log("|||||||||||   Avant delete");
    var txSuppr =  
    tx.run('MATCH (n) OPTIONAL MATCH (n)-[r]-() DELETE n,r')
        .catch((err) => {
            throw 'Problem in first query. ' + err
        })
      }
      catch (e) {
        tx.rollback()
        throw 'someQuery# ' + e
    }
  for(var key in nodesJSON._data)
  {
    var properties = nodesJSON._data[key];
    var icon ="";
    // creation du noeuds dans nodejs
    console.log("|||||||||||   Debut enregistrement");
    if (properties["icon"])  {  icon = properties["icon"].code ;}

     try {
         const props = {
             name: properties["label"],
             key : key ,
             domaine : properties["domaine"],
             icon : icon,
             typeNode : properties["typeNode"],
             color : properties["color"],
             comment: properties["comment"]
         }
         
         var tx2 =  tx
             .run('CREATE (a:Application { name: $props.name, type : \'Application\', \
             label: $props.name, key:$props.key, domaine: $props.domaine , icon: $props.icon, typeNode: $props.typeNode, color: $props.color, comment:  $props.comment})' 
             , { props })
             .catch((err) => {
                 throw 'Problem in second query. ' + e
             })

         
     } catch (e) {
         tx.rollback()
         throw 'someQuery# ' + e
     }
    }

// chargement des liens 
console.log("chargement des liens");

for(var key in edgesJSON._data)
  {
    var properties = edgesJSON._data[key];
    console.log('@@@@@@@@@@     '+properties["label"]);
    try {
      const props = {
          name: properties["label"],
          to: properties["to"],
          from: properties["from"],
          comment: properties["comment"]
    }
    console.log("apres les propriétés");
    var strQuery = "";
    if (properties["label"] == "" || properties["label"] == undefined)
    { 
      
      strQuery = 'MATCH (u:Application {key: \''+props.from+'\' }), (r:Application { key: \''+props.to+'\' })  \
    CREATE (u)-[:DEFAULT]->(r)';
    }
    else
    { strQuery = 'MATCH (u:Application {key: \''+props.from+'\' }), (r:Application { key: \''+props.to+'\' })  \
    CREATE (u)-[:'+props.name+' {comment: \''+props.comment+'\'}]->(r)';
    }

    console.log(strQuery);
    var tx3 =  tx
    .run(strQuery)
    .catch((err) => {
        throw 'Problem in third query. ' + err
    })

      
  } catch (e) {
      tx.rollback()
      throw 'someQuery# ' + e
  }


         
    }

    tx.commit()
    res.status(200).send({ contenu: 'mon message' });
 
  
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
