const models = require('./mongoDBModels');
const mongoose = require('mongoose');
const config = require('config');

const dbURL = config.get('jchen1379.dbConfig.dbURL');

const VISITED_IP_COLLECTION_POSTFIX = '_Visited_Clients';
const VISITED_IP_EXPIRE_TIME = 30; // minutes

const CURRENT_TIMESTAMP = new Date().toISOString();
const DATE_OF_TODAY = CURRENT_TIMESTAMP.substr(0, 10);

mongoose.connect(dbURL).then(() => {
  console.log("Database Connected");
}).catch((err) => {
  console.log("Database Not Connected:" + err);
});

function initiateTrafficData(collection) {
  const trafficData = mongoose.model(collection, models.WebsiteTrafficData);
  const data = new trafficData();
  console.log("Initiating Traffic Data");
  return data.save();
}

function initiateVisitedIPData(collection) {
  collection = collection + VISITED_IP_COLLECTION_POSTFIX;
  const visitedIPData = mongoose.model(collection, models.ClientVisitingData);
  const data = new visitedIPData();
  console.log("Initiating Visited IP Data");
  return data.save();
}

function getTrafficData(collection, objectId) {
  return mongoose.model(collection, models.WebsiteTrafficData).findById(objectId);
}

function getClientVisitingData(collection, objectId) {
  collection = collection + VISITED_IP_COLLECTION_POSTFIX;
  return mongoose.model(collection, models.ClientVisitingData).findById(objectId);
}

async function getClientLastVisitedTime(collection, clientIP) {
  const clientVisitingData = await getClientVisitingData(collection, DATE_OF_TODAY);
  const visitedIP = clientVisitingData.visitedClients.get(clientIP);
  return visitedIP ? visitedIP.lastVisitedTime : null;
}

function incrementWebsiteVisitCount(collection) {
  const updateRequest = {
    $inc: {
      websiteVisitCount: 1
    }
  }
  const trafficData = mongoose.model(collection, models.WebsiteTrafficData);
  trafficData.findByIdAndUpdate(DATE_OF_TODAY, updateRequest, () => {});
}

function visitedLongAgo(lastVisitedTime) {
  const d1 = new Date(lastVisitedTime);
  const d2 = Date.now();
  const diff = d2 - d1;
  // TODO: commented out for testing purpose
  // return diff > 60e3 * VISITED_IP_EXPIRE_TIME;
  return true;
}

async function updateWebsiteVisitCount(collection, clientIP) {
  const trafficData = await getTrafficData(collection, DATE_OF_TODAY);
  if (!trafficData) {
    console.log(`Initiating data models for ${DATE_OF_TODAY}`);
    await initiateTrafficData(collection);
    await initiateVisitedIPData(collection);
  }

  const clientLastVisitedTime = await getClientLastVisitedTime(collection, clientIP);
  if (!clientLastVisitedTime || visitedLongAgo(clientLastVisitedTime)) {
    incrementWebsiteVisitCount(collection);
  }
}

async function updateProjectVisitCount(collection, projectName) {
  const oldTrafficData = await getTrafficData(collection, DATE_OF_TODAY);
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

  const trafficData = mongoose.model(collection, models.WebsiteTrafficData);
  trafficData.findByIdAndUpdate(DATE_OF_TODAY, update, () => {});
}

async function updateIPVisitedProject(collection, clientIP, projectName) {
  const visitedClientsData = await getClientVisitingData(collection, DATE_OF_TODAY);
  const visitedClients = visitedClientsData.visitedClients;
  const visitedClient = visitedClients.get(clientIP);

  if (!visitedClient || visitedLongAgo(visitedClient.lastVisitedTime)) {
    visitedClients.set(clientIP, {
      lastVisitedTime: CURRENT_TIMESTAMP,
      visitedProjects: projectName ? [projectName] : []
    });
    if (projectName)
      await updateProjectVisitCount(collection, projectName);
  } else {
    if (!visitedClient.visitedProjects.includes(projectName) && projectName) {
      visitedClient.visitedProjects.push(projectName);
      await updateProjectVisitCount(collection, projectName);
    }
    visitedClient.lastVisitedTime = CURRENT_TIMESTAMP;
  }

  const update = {
    $set: {
      visitedClients: visitedClients
    }
  }

  collection = collection + VISITED_IP_COLLECTION_POSTFIX;
  const visitedData = mongoose.model(collection, models.ClientVisitingData);
  visitedData.findByIdAndUpdate(DATE_OF_TODAY, update, () => {});
}

module.exports = {updateWebsiteVisitCount, updateIPVisitedProject};