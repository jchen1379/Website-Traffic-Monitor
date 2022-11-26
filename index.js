const port = process.env.PORT || 3000;
const express = require('express');
const dbClient = require('./src/database/MongoDBClient');
const bodyParser = require('body-parser');
const dbDataInitialization = require('./src/utilities/DocumentAutoInit');
const dataAnalyticsTool = require('./src/utilities/DataAnalytics');

const app = express();

app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));

dbDataInitialization.initializeDataEveryday();

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
    const domains = await dbClient.getAllTrackedDomainNames();
    const data = new Map();
    for (const domain of domains) {
      const result = await dbClient.getAllTrafficData(domain);
      data.set(domain, result);
    }
    return res.status(200).json(Object.fromEntries(data));
  } catch (e) {
    return res.status(500).json(e);
  }
})

app.get('/get_all_traffic_data/:domain', async (req, res) => {
  const domain = req.params['domain'];
  try {
    const data = await dbClient.getAllTrafficData(domain);
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json(e);
  }
})

app.get('/get_traffic_data/visits/days/:days', async (req, res) => {
  const days = req.params['days'];
  try {
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
    return res.status(500).json(e);
  }
})

app.get('/get_traffic_data/visits/domain/:domain/days/:days', async (req, res) => {
  try {
    const {domain, days} = req.params;

    const endDate = new Date();
    const startDate = new Date()
    startDate.setDate(endDate.getDate() - days);
    const result = await dbClient.getTrafficDataByTimeRange(domain, startDate.toISOString(), endDate.toISOString(), 'websiteVisitCount');
    return res.status(200).json(result);
  } catch (e) {
    return res.status(500).json(e);
  }
})

app.get('/get_traffic_data/visits/domain/:domain/range/:start/:end?', async (req, res) => {
  try {
    const {domain, start, end} = req.params;
    const trafficData = await dbClient.getTrafficDataByTimeRange(domain, start, end, 'websiteVisitCount');
    return res.status(200).json(trafficData);
  } catch (e) {
    return res.status(500).json(e);
  }
})

app.get('/get_traffic_data/analytics/domain/:domain/range/:start/:end?', async (req, res) => {
  try {
    const {domain, start, end} = req.params;
    const trafficData = await dbClient.getTrafficDataByTimeRange(domain, start, end);
    const result = dataAnalyticsTool.runAnalysis(trafficData);
    return res.status(200).json(result);
  } catch (e) {
    return res.status(500).json(e);
  }
})

app.get('/get_client_data/number_of_clients/domain/:domain', async (req, res) => {
  const domain = req.params['domain'];
  try {
    const clientData = await dbClient.getAllClientVisitingData(domain);
    const result = dataAnalyticsTool.computeTotalVisitClients(clientData);
    return res.status(200).json(result);
  } catch (e) {
    return res.status(500).json(e);
  }
})

app.get('/get_traffic_data/analytics/domain/:domain/all', async (req, res) => {
  const domain = req.params['domain'];
  try {
    const trafficData = await dbClient.getAllTrafficData(domain);
    const result = dataAnalyticsTool.runAnalysis(trafficData);
    return res.status(200).json(result);
  } catch (e) {
    return res.status(500).json(e);
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

  await dbClient.updateWebsiteVisitCount(domain, clientIP).catch((err) => {
    console.log(err);
    return res.status(500).json(err);
  });

  await dbClient.updateClientVisitedProject(domain, clientIP, project).catch((err) => {
    console.log(err);
    return res.status(500).json(err);
  });

  return res.status(200).json();
})

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
})

module.exports = app;