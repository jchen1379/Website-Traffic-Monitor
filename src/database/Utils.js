const VISITED_IP_EXPIRE_TIME = 30; // minutes

function visitedLongAgo(lastVisitedTime) {
  lastVisitedTime = new Date(lastVisitedTime);
  const currentTime = Date.now();
  const diff = currentTime - lastVisitedTime;
  return diff > 60e3 * VISITED_IP_EXPIRE_TIME;
}

function getCurrentTimestamp(){
  return new Date().toISOString();
}

function getDateOfToday(){
  return getCurrentTimestamp().substr(0, 10);
}

module.exports = {visitedLongAgo, getDateOfToday, getCurrentTimestamp}