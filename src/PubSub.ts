import WebSocket from 'websocket'
import EventEmitter from 'events'

interface PubSubscriptions {
  topic: string
  channel: string
  userid: number
}

interface PubSubOptions {
  oauth: string
  subscriptions: PubSubscriptions[]
}

export class TwitchPubSub extends EventEmitter {
  private oauth: string
  private subscriptions: PubSubscriptions[]
  private ws: WebSocket.w3cwebsocket
  private heartbeatInterval: NodeJS.Timeout

  private PING = 1000 * 60
  private RECONNECT = 1000 * 3

  constructor(opts: PubSubOptions) {
    super()

    this.oauth = opts.oauth
    this.subscriptions = opts.subscriptions

    this._connect()
  }

  async _connect() {
    this.ws = new WebSocket.w3cwebsocket('wss://pubsub-edge.twitch.tv')

    this.ws.onopen = () => {
      this.heartbeat()

      this.subscriptions.forEach(sub => {
        const topic = sub.topic
        const channel = sub.channel
        const id = sub.userid

        this._listen(topic, channel, id)
      })

      this.heartbeatInterval = setInterval(this.heartbeat, this.PING)
      this.emit('connected')
    }

    this.ws.onerror = (error) => {
      this.emit('error', error)
    }

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data as string)

      if (message.type === 'RESPONSE') {
        this.emit('error', message.error)
      }

      if (message.type === 'RECONNECT') {
        this.emit('error', 'Reconnecting...')
        setTimeout(this._connect, this.RECONNECT)
      }

      if (message.type === 'MESSAGE') {
        this.emit('message', message.data)
      }
    }

    this.ws.onclose = () => {
      this.emit('disconnect')

      clearInterval(this.heartbeatInterval)
      setTimeout(this._connect, this.RECONNECT)
    }
  }

  private heartbeat() {
    const message = {
      type: 'PING',
      data: {
        auth_token: this.oauth
      }
    }

    if (this.ws.readyState === WebSocket.w3cwebsocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    }
  }

  private async _listen(topic: string, channel: string, id: number) {
    switch (topic) {
      case 'channel-bits':
        topic = 'channel-bits-events-v1'
        break
      case 'channel-points':
        topic = 'channel-points-channel-v1'
        break
      case 'channel-subscriptions':
        topic = 'channel-subscribe-events-v1'
        break
      case 'channel-bits-badge':
        topic = 'channel-bits-badge-unlocks'
        break
      case 'chat-moderator-actions':
        topic = 'chat_moderator_actions'
        break
      case 'whispers':
        topic = 'whispers'
        break
    }

    const message = {
      type: 'LISTEN',
      nonce: this.nonce(15),
      data: {
        topics: [`${topic}.${id}`],
        auth_token: this.oauth
      }
    }

    if (this.ws.readyState === WebSocket.w3cwebsocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    }
  }

  private nonce(length: number): string {
    let text = ''
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

    for (let i = 0; i < length; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length))
    }

    return text
  }
}