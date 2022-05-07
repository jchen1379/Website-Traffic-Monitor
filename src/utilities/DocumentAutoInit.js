const dbClient = require('../database/MongoDBClient');
const cron = require('cron');

function initializeDataEveryday(){
  cron.job('0 0 0 * * *', async () => {
    dbClient.reRegisterDataModel();
    const domains = await dbClient.getAllTrackedDomainNames();
    for (const domain of domains) {
      await dbClient.initiateTrafficData(domain);
      await dbClient.initiateVisitedIPData(domain);
    }
  }, null, true);
}

module.exports = {initializeDataEveryday};