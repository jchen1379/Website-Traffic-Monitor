const hostname = 'localhost';
const port = process.env.PORT || 3000;
const express = require('express');
const dbClient = require('./database/mongoDBClient');

const app = express();

app.use(express.json());

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

app.post('/website_traffic_monitor', async (req, res) => {
  const clientIP = req.ip.replaceAll('.', '-');
  const domain = req.body['domain'];
  const project = req.body['project'];

  if (!domain)
    return res.status(400).json("INVALID REQUEST BODY!");

  await dbClient.updateWebsiteVisitCount(domain, clientIP);

  await dbClient.updateIPVisitedProject(domain, clientIP, project);

  return res.status(200).json();
})

app.listen(port, hostname, () => {
  console.log(`Server is running on port ${port}`);
})
