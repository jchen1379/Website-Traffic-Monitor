const port = process.env.PORT || 3000;
const express = require('express');
const dbClient = require('./src/database/MongoDBClient');
const bodyParser = require('body-parser');
const dataAnalyticsTool = require('./src/utilities/DataAnalytics');
const {validateRequest} = require("./src/utilities/Validation");

const app = express();

app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization');

  if (req.method === 'OPTIONS') {
    res.header('Accept-Control-Methods', 'PUT,POST,PATCH,DELETE,GET');
    return res.status(200).json({})
  }
  next();
})

app.get('/', (req, res) => {
  return res.status(200).json('Welcome to use the website traffic monitor!');
})

app.get('/get_all_traffic_data', async (req, res) => {
  try {
    await dbClient.connectDbOnDemand();
    const domains = await dbClient.getAllTrackedDomainNames();
    const data = new Map();
    for (const domain of domains) {
      const result = await dbClient.getAllTrafficData(domain);
      data.set(domain, result);
    }
    return res.status(200).json(Object.fromEntries(data));
  } catch (e) {
    console.log(e);
    return res.status(500).json(JSON.stringify(e));
  }
})

app.get('/get_all_traffic_data/:domain', async (req, res) => {
  const domain = req.params['domain'];
  try {
    await dbClient.connectDbOnDemand();
    const data = await dbClient.getAllTrafficData(domain);
    return res.status(200).json(data);
  } catch (e) {
    console.log(e);
    return res.status(500).json(JSON.stringify(e));
  }
})

app.get('/get_traffic_data/visits/days/:days', async (req, res) => {
  const days = req.params['days'];
  try {
    await dbClient.connectDbOnDemand();
    const domains = await dbClient.getAllTrackedDomainNames();
    const data = new Map();
    const endDate = new Date();
    const startDate = new Date()
    startDate.setDate(endDate.getDate() - days);

    for (const domain of domains) {
      const result = await dbClient.getTrafficDataByTimeRange(domain, startDate.toISOString(), endDate.toISOString(), 'websiteVisitCount');
      data.set(domain, result);
    }
    return res.status(200).json(Object.fromEntries(data));
  } catch (e) {
    console.log(e);
    return res.status(500).json(JSON.stringify(e));
  }
})

app.get('/get_traffic_data/visits/domain/:domain/days/:days', async (req, res) => {
  const {domain, days} = req.params;
  const endDate = new Date();
  const startDate = new Date()
  startDate.setDate(endDate.getDate() - days);
  try {
    await dbClient.connectDbOnDemand();
    const result = await dbClient.getTrafficDataByTimeRange(domain, startDate.toISOString(), endDate.toISOString(), 'websiteVisitCount');
    return res.status(200).json(result);
  } catch (e) {
    console.log(e);
    return res.status(500).json(JSON.stringify(e));
  }
})

app.get('/get_traffic_data/visits/domain/:domain/range/:start/:end?', async (req, res) => {
  const {domain, start, end} = req.params;
  try {
    await dbClient.connectDbOnDemand();
    const trafficData = await dbClient.getTrafficDataByTimeRange(domain, start, end, 'websiteVisitCount');
    return res.status(200).json(trafficData);
  } catch (e) {
    console.log(e);
    return res.status(500).json(JSON.stringify(e));
  }
})

app.get('/get_traffic_data/analytics/domain/:domain/range/:start/:end?', async (req, res) => {
  const {domain, start, end} = req.params;
  try {
    await dbClient.connectDbOnDemand();
    const trafficData = await dbClient.getTrafficDataByTimeRange(domain, start, end);
    const result = dataAnalyticsTool.runAnalysis(trafficData);
    return res.status(200).json(result);
  } catch (e) {
    console.log(e);
    return res.status(500).json(JSON.stringify(e));
  }
})

app.get('/get_client_data/number_of_clients/domain/:domain', async (req, res) => {
  const domain = req.params['domain'];
  try {
    await dbClient.connectDbOnDemand();
    const clientData = await dbClient.getAllClientVisitingData(domain);
    const result = dataAnalyticsTool.computeTotalVisitClients(clientData);
    return res.status(200).json(result);
  } catch (e) {
    console.log(e);
    return res.status(500).json(JSON.stringify(e));
  }
})

app.get('/get_traffic_data/analytics/domain/:domain/all', async (req, res) => {
  const domain = req.params['domain'];
  try {
    await dbClient.connectDbOnDemand();
    const trafficData = await dbClient.getAllTrafficData(domain);
    const result = dataAnalyticsTool.runAnalysis(trafficData);
    return res.status(200).json(result);
  } catch (e) {
    console.log(e);
    return res.status(500).json(JSON.stringify(e));
  }
})

app.post('/website_traffic_monitor', async (req, res) => {
  const clientIP = process.env.NODE_ENV === 'dev' ?
    req.socket.remoteAddress :
    req.headers['x-forwarded-for'].split('.').join('-');

  const domain = req.body['domain'];
  const project = req.body['project'];

  if (!domain)
    return res.status(400).json("INVALID REQUEST BODY!");

  await dbClient.connectDbOnDemand();

  await dbClient.updateWebsiteVisitCount(domain, clientIP).catch((err) => {
    console.log(err);
    return res.status(500).json(JSON.stringify(err));
  });

  await dbClient.updateClientVisitedProject(domain, clientIP, project).catch((err) => {
    console.log(err);
    return res.status(500).json(JSON.stringify(err));
  });

  return res.status(200).json();
})

app.post('/init_documents', async (req, res) => {
  try {
    validateRequest(req);
    await dbClient.connectDbOnDemand();
    dbClient.reRegisterDataModel();
    const domains = await dbClient.getAllTrackedDomainNames();
    for (const domain of domains) {
      await dbClient.initiateTrafficData(domain);
      await dbClient.initiateVisitedIPData(domain);
    }
    return res.status(200).json();
  } catch (e) {
    console.log(e);
    return res.status(500).json(JSON.stringify(e));
  }
})

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
})

module.exports = app;