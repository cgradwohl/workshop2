const APP_ROOT = '../../'
const _ = require('lodash')
const aws4 = require('aws4')
const URL = require('url')
const http = require('axios')

// used to differentiate between cases (call locally(integration) or call the deployed api(acceptence/e2e)) 
const mode = process.env.TEST_MODE

const viaHandler = async (event, functionName) => {
  const handler = require(`${APP_ROOT}/functions/${functionName}`).handler

  // pass empty context to the lambda
  const context = {}
  const response = await handler(event, context)
  const contentType = _.get(response, 'headers.content-type', 'application/json');

  // NOTE: the headers tell you if you need to parse ! (remember parsing stupidity from olympus)
  if (response.body && contentType === 'application/json') {
    response.body = JSON.parse(response.body);
  }
  return response
}


// format response into lambda-like response
const respondFrom = async (httpRes) => ({
  statusCode: httpRes.status,
  body: httpRes.data,
  headers: httpRes.headers
})

const signHttpRequest = (url) => {
  const urlData = URL.parse(url)
  const opts = {
    host: urlData.hostname,
    path: urlData.pathname
  }

  aws4.sign(opts)
  return opts.headers
}

/**
 * 
 * @param {*} relPath 
 * @param {*} method 
 * @param {*} opts { body: {}, auth: {}, iam_auth: bool }
 */
const viaHttp = async (relPath, method, opts) => {
  const url = `${process.env.REST_API_URL}/${relPath}`
  console.info(`invoking via HTTP ${method} ${url}`)

  try {
    const data = _.get(opts, "body")
    let headers = {}
    if (_.get(opts, "iam_auth", false) === true) {
      headers = signHttpRequest(url)
    }

    const authHeader = _.get(opts, "auth")
    if (authHeader) {
      headers.Authorization = authHeader
    }

    const httpReq = http.request({
      method, url, headers, data
    })

    const res = await httpReq
    return respondFrom(res)
  } catch (err) {
    if (err.status) {
      return {
        statusCode: err.status,
        headers: err.response.headers
      }
    } else {
      throw err
    }
  }
}

const we_invoke_get_index = async () => {
  switch (mode) {
    case 'integration': // integration
      return await viaHandler({}, 'get-index')
    case 'e2e': // e2e or acceptence
      return await viaHttp('', 'GET')
    default:
      throw new Error(`unsupported mode: ${mode}`)
  }
}

const we_invoke_get_restaurants = async () => {
  switch (mode) {
    case 'integration':
      return await viaHandler({}, 'get-restaurants')
    case 'e2e':
      return await viaHttp('restaurants', 'GET', { iam_auth: true })
    default:
      throw new Error(`unsupported mode: ${mode}`)
  }
}

const we_invoke_search_restaurants = async (theme, user) => {
  const body = JSON.stringify({ theme })

  switch (mode) {
    case 'integration':
      return await viaHandler({ body }, 'search-restaurants')
    case 'e2e':
      const auth = user.idToken
      return await viaHttp('restaurants/search', 'POST', { body, auth })
    default:
      throw new Error(`unsupported mode: ${mode}`)
  }
}
module.exports = {
  we_invoke_get_index,
  we_invoke_get_restaurants,
  we_invoke_search_restaurants
}
