const mongoose = require('mongoose');
const {getCurrentTimestamp,
  getDateOfToday,
} = require("./Utils");


const Schema = mongoose.Schema;

function WebsiteTrafficData(){
  return new Schema({
    _id: {
      type: String,
      default: getDateOfToday()
    },
    websiteVisitCount: {
      type: Number,
      default: 0
    },
    projectVisitCount: {
      type: Map,
      of: Number,
      default: {}
    }
  })
}

function ClientVisitingData(){
  return new Schema({
    _id: {
      type: String,
      default: getDateOfToday()
    },
    visitedClients:{
      type: Map,
      of: {
        lastVisitedTime: {
          type: String,
          default: getCurrentTimestamp()
        },
        visitedProjects: []
      },
      default: {}
    }
  })
}

module.exports = {WebsiteTrafficData, ClientVisitingData};