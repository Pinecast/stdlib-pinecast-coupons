const {DateTime} = require('luxon');
const lib = require('lib')({token: process.env.STDLIB_TOKEN});

const storage = require('../../helpers/storage');

const VALUES = {
  '1mo': {
    duration: 'once',
    max_redemptions: 1,
    amount_off: 500,
    currency: 'usd',
  },
  '2mo': {
    duration: 'repeating',
    duration_in_months: 2,
    max_redemptions: 1,
    amount_off: 500,
    currency: 'usd',
  },
};

const EXPIRATIONS = {
  '1mo': () => ({
    redeem_by: Math.floor(Date.now() / 1000 + 86400 * 30),
  }),
  '2mo': () => ({
    redeem_by: Math.floor(Date.now() / 1000 + 86400 * 30 * 2),
  }),
};

/**
* /coupon
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
  const [couponName, couponValue = '1mo', expiration = '1mo'] = text.split(' ');

  if (!VALUES.hasOwnProperty(couponValue)) {
    callback(null, {
      text: `<@${user}> That's not a valid coupon value. Try one of these: ${Object.keys(
        VALUES
      ).join(', ')}`,
      attachments: [],
    });
    return;
  }
  if (!EXPIRATIONS.hasOwnProperty(expiration)) {
    callback(null, {
      text: `<@${user}> That's not a valid coupon expiration. Try one of these: ${Object.keys(
        EXPIRATIONS
      ).join(', ')}`,
      attachments: [],
    });
    return;
  }

  storage.getStripeKey(command.team_id, (err, stripeKey) => {
    if (err || !stripeKey) {
      callback(null, {
        text: `<@${user}> We have no Stripe API key on file for your Slack. Use the /set_stripe_key command.`,
      });
      return;
    }

    const stripe = require('stripe')(stripeKey);
    stripe.coupons
      .create(
        Object.assign(
          {
            id: couponName,
            metadata: {createdWith: text, createdBy: user, createdIn: channel},
          },
          VALUES[couponValue],
          EXPIRATIONS[expiration]()
        )
      )
      .then(
        coupon => {
          callback(null, {
            text: `<@${user}> Your coupon code has arrived!`,
            attachments: [
              {
                color: '#52d1c7',
                title: 'Stripe coupon code',
                title_link: `https://dashboard.stripe.com/coupons/${encodeURIComponent(
                  couponName
                )}`,
                text: coupon.id,
                fields: [
                  {
                    title: 'Expires',
                    value: DateTime.fromMillis(
                      coupon.redeem_by * 1000
                    ).toFormat('MMM d, y'),
                    short: true,
                  },
                  {
                    title: 'Max uses',
                    value: coupon.max_redemptions,
                    short: true,
                  },
                  coupon.amount_off && {
                    title: 'Amount',
                    value: `$${(coupon.amount_off / 100).toFixed(2)}`,
                    short: true,
                  },
                  coupon.duration === 'repeating'
                    ? {
                        title: 'Duration',
                        value: `${coupon.duration_in_months} months`,
                        short: true,
                      }
                    : {
                        title: 'Duration',
                        value: 'Once',
                        short: true,
                      },
                ].filter(x => x),
              },
            ],
          });
        },
        err => {
          callback(null, {
            text: `<@${user}> There was a problem creating the coupon code.`,
            attachments: [
              {
                color: 'danger',
                title: 'Stripe error',
                text: err.message || 'Unknown error 🤷‍♂️',
              },
            ],
          });
        }
      );
  });
};
