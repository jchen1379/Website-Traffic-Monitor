const models = require('./MongoDBModels');
const Mongoose = require('mongoose').Mongoose;
const {
  getCurrentTimestamp,
  visitedLongAgo,
  getDateOfToday,
} = require("./Utils");


const trafficDataDBURL = process.env.WEBSITE_TRAFFIC_DATA_MONGODB;
const clientsDataDBURL = process.env.VISITED_CLIENTS_DATA_MONGODB;

if (!trafficDataDBURL || !clientsDataDBURL) {
  throw "WEBSITE_TRAFFIC_DATA_MONGODB or/and VISITED_CLIENTS_DATA_MONGODB NOT FOUND IN ENV";
}

let websiteTrafficDataModel = models.WebsiteTrafficData();
let clientVisitingDataModel = models.ClientVisitingData();

const websiteTrafficDatabase = new Mongoose();
websiteTrafficDatabase.connect(trafficDataDBURL, null, (error => {
  error ?
    console.log(error) :
    console.log("Website Traffic Database Connected!");
}));

const visitedClientsDatabase = new Mongoose();
visitedClientsDatabase.connect(clientsDataDBURL, null, (error => {
  error ?
    console.log(error) :
    console.log("Visited Clients Database Connected!");
}))

function initiateTrafficData(collection) {
  const trafficData = websiteTrafficDatabase.model(collection, websiteTrafficDataModel);
  const data = new trafficData();
  console.log("Initiating Traffic Data");
  return data.save();
}

function initiateVisitedIPData(collection) {
  const visitedIPData = visitedClientsDatabase.model(collection, clientVisitingDataModel);
  const data = new visitedIPData();
  console.log("Initiating Visited Client Data");
  return data.save();
}

function getTrafficDataByID(collection, objectId) {
  return websiteTrafficDatabase.model(collection, websiteTrafficDataModel).findById(objectId);
}

async function getTrafficDataByTimeRange(collection, timeRangeStart, timeRangeEnd, fields) {
  return websiteTrafficDatabase
    .model(collection, websiteTrafficDataModel)
    .find()
    .where(
      {
        _id: {
          $gte: timeRangeStart,
          $lte: timeRangeEnd || new Date().toISOString()
        }
      }
    )
    .select(fields);
}

async function getAllTrafficData(collection) {
  const cursor = websiteTrafficDatabase.model(collection, websiteTrafficDataModel).find().cursor();
  const result = [];
  for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
    result.push(doc);
  }
  return result;
}

function getClientVisitingData(collection, objectId) {
  return visitedClientsDatabase.model(collection, clientVisitingDataModel).findById(objectId);
}

async function getAllClientVisitingData(collection) {
  const cursor = visitedClientsDatabase.model(collection, clientVisitingDataModel).find().cursor();
  const result = [];
  for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
    result.push(doc);
  }
  return result;
}

function incrementWebsiteVisitCount(collection) {
  const updateRequest = {
    $inc: {
      websiteVisitCount: 1
    }
  }
  const trafficData = websiteTrafficDatabase.model(collection, websiteTrafficDataModel);
  trafficData.findByIdAndUpdate(getDateOfToday(), updateRequest, () => {
  });
}

async function updateWebsiteVisitCount(collection, clientIP) {
  const trafficData = await getTrafficDataByID(collection, getDateOfToday());
  if (!trafficData) {
    console.log(`Initiating data models for ${getDateOfToday()}`);
    await initiateTrafficData(collection);
    await initiateVisitedIPData(collection);
  }

  const clientLastVisitedTime = await getClientLastVisitedTime(collection, clientIP);
  if (!clientLastVisitedTime || visitedLongAgo(clientLastVisitedTime)) {
    incrementWebsiteVisitCount(collection);
  }
}

async function updateProjectVisitCount(collection, projectName) {
  const oldTrafficData = await getTrafficDataByID(collection, getDateOfToday());
  const projectVisitCount = oldTrafficData.projectVisitCount;

  if (!(projectVisitCount.get(projectName))) {
    projectVisitCount.set(projectName, 0);
  }

  const oldVisitCount = projectVisitCount.get(projectName);
  projectVisitCount.set(projectName, oldVisitCount + 1);

  const update = {
    $set: {
      projectVisitCount: projectVisitCount
    }
  }

  const trafficData = websiteTrafficDatabase.model(collection, websiteTrafficDataModel);
  trafficData.findByIdAndUpdate(getDateOfToday(), update, () => {
  });
}

async function updateClientVisitedProject(collection, clientIP, projectName) {
  const visitedClientsData = await getClientVisitingData(collection, getDateOfToday());
  const visitedClients = visitedClientsData.visitedClients;
  const visitedClient = visitedClients.get(clientIP);

  if (!visitedClient || visitedLongAgo(visitedClient.lastVisitedTime)) {
    visitedClients.set(clientIP, {
      lastVisitedTime: getCurrentTimestamp(),
      visitedProjects: projectName ? [projectName] : []
    });
    if (projectName)
      await updateProjectVisitCount(collection, projectName);
  } else {
    if (!visitedClient.visitedProjects.includes(projectName) && projectName) {
      visitedClient.visitedProjects.push(projectName);
      await updateProjectVisitCount(collection, projectName);
    }
    visitedClient.lastVisitedTime = getCurrentTimestamp();
  }

  const update = {
    $set: {
      visitedClients: visitedClients
    }
  }

  const visitedData = visitedClientsDatabase.model(collection, clientVisitingDataModel);
  visitedData.findByIdAndUpdate(getDateOfToday(), update, () => {
  });
}

async function getClientLastVisitedTime(collection, clientIP) {
  const clientVisitingData = await getClientVisitingData(collection, getDateOfToday());
  const visitedIP = clientVisitingData.visitedClients.get(clientIP);
  return visitedIP ? visitedIP.lastVisitedTime : null;
}

async function getAllTrackedDomainNames() {
  const collections = await websiteTrafficDatabase.connection.db.listCollections().toArray();
  const domains = [];
  collections.forEach((collection) => {
    domains.push(collection.name);
  })
  return domains;
}

function reRegisterDataModel() {
  Object.keys(websiteTrafficDatabase.connection.models).forEach(key => {
    delete websiteTrafficDatabase.connection.models[key];
  });
  Object.keys(visitedClientsDatabase.connection.models).forEach(key => {
    delete visitedClientsDatabase.connection.models[key];
  });
  websiteTrafficDataModel = models.WebsiteTrafficData();
  clientVisitingDataModel = models.ClientVisitingData();
}

module.exports = {
  updateWebsiteVisitCount,
  updateClientVisitedProject,
  getAllTrafficData,
  getAllTrackedDomainNames,
  initiateTrafficData,
  initiateVisitedIPData,
  reRegisterDataModel,
  getTrafficDataByTimeRange,
  getAllClientVisitingData
};