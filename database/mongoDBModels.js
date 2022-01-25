const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const objectID = new Date().toISOString().substr(0, 10);
const timestamp = new Date().toISOString();

const WebsiteTrafficData = new Schema({
  _id: {type: String, default: objectID},
  websiteVisitCount: {type: Number, default: 0},
  projectVisitCount: {
    type: Map,
    of: Number,
    default: {}
  }
})

const ClientVisitingData = new Schema({
  _id: {type: String, default: objectID},
  visitedClients:{
    type: Map,
    of: {
      lastVisitedTime: {type: String, default: timestamp},
      visitedProjects: []
    },
    default: {}
  }
})

module.exports = {WebsiteTrafficData, ClientVisitingData};