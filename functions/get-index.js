const fs = require("fs")
const Mustache = require('mustache')
const http = require('axios')
const aws4 = require('aws4')
const URL = require('url')

const restaurantsApiRoot = process.env.restaurants_api
const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const template = fs.readFileSync('static/index.html', 'utf-8')

const getRestaurants = async () => {
  console.log(`loading restaurants from ${restaurantsApiRoot}...`)
  const url = URL.parse(restaurantsApiRoot) // restaurantsApiRoot --> https://#{ApiGatewayRestApi}.execute-api.#{AWS::Region}.amazonaws.com/${self:provider.stage}/restaurants
  
  const opts = {
    host: url.hostname,
    path: url.pathname
  }

  // provide the IAM Users acess keys by signing the request to get past the aws_iam authorizer
  // NOTE:#1 aws4 library grabs the execution role credentials from environment variables, and sign the request.
  aws4.sign(opts)

  // NOTE:#1
  // HERE WE ARE MAKING A REQUEST TO A LAMBDA FROM THIS LAMBDA
  const httpReq = http.get(restaurantsApiRoot, {
    headers: opts.headers
  })
  return (await httpReq).data
}

module.exports.handler = async (event, context) => {
  const restaurants = await getRestaurants()
  console.log(`found ${restaurants.length} restaurants`)  
  const dayOfWeek = days[new Date().getDay()]
  const html = Mustache.render(template, { dayOfWeek, restaurants })
  const response = {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/html; charset=UTF-8'
    },
    body: html
  }

  return response
}