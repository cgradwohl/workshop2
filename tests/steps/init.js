const { promisify } = require('util')
const awscred = require('awscred')

// pull .env variables onto process.env
require('dotenv').config()

let initialized = false

const init = async () => {
  if (initialized) {
    return
  }
  
  const { credentials, region } = await promisify(awscred.load)()
  
  // pull additional secrets onto process.env using awscred package
  process.env.AWS_ACCESS_KEY_ID     = credentials.accessKeyId
  process.env.AWS_SECRET_ACCESS_KEY = credentials.secretAccessKey
  process.env.AWS_REGION            = region

  // required if your authenticated as an IAM role (instead of an IAM user)
  if (credentials.sessionToken) {
    process.env.AWS_SESSION_TOKEN = credentials.sessionToken
  }

  console.log('AWS credential loaded from environment and awscred')

  initialized = true
}

module.exports = {
  init
}
