const R = require('ramda')
const Promise = require('bluebird')
const Staff = require('./staff')

exports.notifyUser = function notifyUser (robot, username, message) {
  return Promise.resolve()
    .then(getUser)
    .then(getChannel)
    .then(sendMessage)

  function getUser () {
    return new Promise((resolve, reject) => {
      robot.adapter.client.web.users.list((err, res) => {
        if (err) {
          return reject(err)
        }

        if (!res.ok) {
          return reject(new Error('An error has occurred while fetching users list.'))
        }

        return resolve(R.find(R.propEq('name', username), res.members))
      })
    })
  }

  function getChannel (user) {
    return new Promise((resolve, reject) => {
      robot.adapter.client.web.im.list((err, res) => {
        if (err) {
          return reject(err)
        }

        if (!user) {
          return reject(new Error(`User ${username} not found.`))
        }

        if (!res.ok) {
          return reject(new Error('An error has occurred while fetching im list.'))
        }

        const Im = R.find(R.propEq('user', user.id), res.ims)

        if (!Im) {
          return reject(new Error(`User ${username} was not found in im list.`))
        }

        return resolve(Im)
      })
    })
  }

  function sendMessage (im) {
    return new Promise((resolve, reject) => {
      robot.adapter.client.web.chat.postMessage(im.id, message, {
        as_user: true,
        link_names: true,
        unfurl_links: true
      }, (err, res) => {
        if (err) {
          return reject(err)
        }

        return resolve(res)
      })
    })
  }
}

exports.notifyStaff = function notifyStaff (robot, message) {
  return Promise.resolve()
    .return(Staff())
    .each(username => exports.notifyUser(robot, username, message))
}
