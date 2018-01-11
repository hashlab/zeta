// Description:
//   Script for managing and deploying sites on Netlify
//
// Dependencies:
//   "ramda": "0.25.0"
//   "axios": "0.16.2"
//   "bluebird": "3.5.1"
//
// Configuration:
//   HUBOT_NETLIFY_ACCESS_TOKEN
//
// Commands:
//   hubot netlify sites - Get a list of all sites hosted on Netlify
//
// Author:
//   chris@hashlab.com.br

const Request = require('axios')
const Promise = require('bluebird')
const CheckEnv = require('../helpers/check-env')
const FormatJSON = require('../helpers/format-json')
const ErrorHandler = require('../helpers/error-handler')
const CheckPermission = require('../helpers/check-permission')

Promise.config({
  cancellation: true
})

// Private

const Opts = {
  baseURL: 'https://api.netlify.com/api/v1/',
  headers: {
    common: {
      Authorization: `Bearer ${process.env.HUBOT_NETLIFY_ACCESS_TOKEN}`,
      'User-Agent': `${process.env.HUBOT_NAME} (${process.env.HUBOT_MAINTAINER})`,
      'Content-Type': 'application/json'
    }
  }
}

const NetlifyClient = Request.create(Opts)

// Public

module.exports = function netlifyScript (robot) {
  return robot.respond(/netlify sites/i, (res) => {
    if (!CheckEnv(robot, 'HUBOT_NETLIFY_ACCESS_TOKEN')) {
      return null
    }

    const NetlifyPromise = Promise.resolve()
      .tap(checkUserPermission)
      .then(getSites)
      .then(respond)
      .catch(ErrorHandler(robot, res, 'netlify sites'))

    function checkUserPermission () {
      return Promise.resolve()
        .then(CheckPermission(robot, res))
        .tap((hasPermission) => {
          if (!hasPermission) {
            return NetlifyPromise.cancel()
          }
          return null
        })
    }

    function getSites () {
      return NetlifyClient.get('/sites')
    }

    function respond (response) {
      return res.send(FormatJSON(response.data))
    }

    return NetlifyPromise
  })
}
