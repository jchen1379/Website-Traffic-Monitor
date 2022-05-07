function runAnalysis(data) {
  const result = {
    websiteVisitCount: 0,
    projectVisitCount: {}
  }

  data.forEach((data) => {
    computeTotalVisits(data, result);
    computeTotalProjectVisits(data, result);
  })

  return result;
}

function computeTotalVisits(data, result) {
  result['websiteVisitCount'] += data['websiteVisitCount'];
}

function computeTotalProjectVisits(data, result) {
  const projectVisitCount = data['projectVisitCount'];
  projectVisitCount.forEach((value, key)=>{
    if (!(key in result['projectVisitCount']))
      result['projectVisitCount'][key] = value;
    else
      result['projectVisitCount'][key] += value;
  })
}

function computeTotalVisitClients(data) {
  const clients = new Set();
  data.forEach(client => {
    for (const [key, value] of client['visitedClients']){
      clients.add(key);
    }
  })
  return {totalClients: clients.size};
}

module.exports = {
  runAnalysis,
  computeTotalVisitClients
}