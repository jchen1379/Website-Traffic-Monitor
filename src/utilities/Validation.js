function validateRequest(req) {
  const { authorization } = req.headers;

  if (authorization !== `Bearer ${process.env.API_SECRET_KEY}`) {
    throw Error("Illegal Request!");
  }
}

module.exports = {
  validateRequest
}