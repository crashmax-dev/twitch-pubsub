import { TwitchPubSub } from '../src'

const PubSub = new TwitchPubSub({
  oauth: '',
  subscriptions: [
    {
      topic: 'channel-points',
      channel: 'le_xot',
      userid: 155644238
    }
  ]
})

PubSub.on('connected', () => {
  console.log('PubSub connected')
})

PubSub.on('error', (error) => console.log(error))

PubSub.on('message', (msg) => {
  console.log(msg)
})
