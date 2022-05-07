const cron = require('cron');
const axios = require('axios');

const APP_URLs = [
  'https://website-traffic-monitor.herokuapp.com/'
];

function keepHerokuAppAwake(){
  cron.job('*/10 * * * *', () => {
    APP_URLs.forEach((URL)=>{
      axios.get(URL).then(r => {
        console.log(`Pinging ${URL}`);
      });
    })
  }, null, true);
}

module.exports = {keepHerokuAppAwake};