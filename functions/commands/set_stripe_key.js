const storage = require('../../helpers/storage');

/**
* /set_stripe_key
*
*   See https://api.slack.com/slash-commands for more details.
*
* @param {string} user The user id of the user that invoked this command (name is usable as well)
* @param {string} channel The channel id the command was executed in (name is usable as well)
* @param {string} text The text contents of the command
* @param {object} command The full Slack command object
* @param {string} botToken The bot token for the Slack bot you have activated
* @returns {object}
*/
module.exports = (
  user,
  channel,
  text = '',
  command = {},
  botToken = null,
  callback
) => {
  storage.setStripeKey(command.team_id, text, err => {
    if (err) {
      callback(null, {
        text: `<@${user}> There was a problem setting that key.`,
      });
      return;
    }

    callback(null, {
      text: `<@${user}> Got it, thanks!`,
    });
  });
};
