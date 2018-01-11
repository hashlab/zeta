const Promise = require('bluebird')

function successMessage (response, message) {
  return new Promise((resolve) => {
    response.send({
      room: response.message.user.room
    }, {
      as_user: true,
      attachments: [
        {
          title: 'Success',
          text: message,
          color: 'good',
          mrkdwn_in: ['text']
        }
      ]
    }, () => resolve())
  })
}

function infoMessage (response, message) {
  return new Promise((resolve) => {
    response.send({
      room: response.message.user.room
    }, {
      as_user: true,
      attachments: [
        {
          title: 'Information',
          text: message,
          color: '#1e90ff',
          mrkdwn_in: ['text']
        }
      ]
    }, () => resolve())
  })
}

function errorMessage (response, message) {
  return new Promise((resolve) => {
    response.send({
      room: response.message.user.room
    }, {
      as_user: true,
      attachments: [
        {
          title: 'Error',
          text: message,
          color: 'danger',
          mrkdwn_in: ['text']
        }
      ]
    }, () => resolve())
  })
}

module.exports = function respondToUser (robot, response, error, message, type) {
  const errStatusCode = error && error.response ? error.response.status : ''
  const errResponse = 'An error has occurred on request error handler.'
  const errResponseStatusCode = `Response status code: \`${errStatusCode}\``
  let errMessage = error

  if (error && error.message) {
    errMessage = `An error has occurred on the global error handler: ${error.message}.`
  }

  if (error && error.message && /ECONNREFUSED/.test(error.message)) {
    errMessage = `An error has occurred while downloading the csv file: ${error.message}`
  }

  if (error && error.response) {
    robot.logger.error(errResponse)
    robot.logger.error(errResponseStatusCode)
    robot.logger.error(error.response.data)
  } else {
    robot.logger.error(errMessage)
  }

  return Promise.bind(this)
    .then(() => {
      if (error && error.response) {
        return errorMessage(response, `${errResponse}\n${errResponseStatusCode}`)
          .then(() => errorMessage(response, `\`\`\`\n${JSON.stringify(error.response.data)}\n\`\`\``))
          .then(() => errorMessage(response, `\`\`\`\n${JSON.stringify(error.response.config)}\n\`\`\``))
      } else if (error && !error.response) {
        return errorMessage(response, errMessage)
      }

      return null
    })
    .then(() => {
      if (type === 'success') {
        robot.logger.info(message)
        return successMessage(response, message)
      }

      return null
    })
    .then(() => {
      if (type === 'info') {
        robot.logger.info(message)
        return infoMessage(response, message)
      }

      return null
    })
}
