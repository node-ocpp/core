A Node.js-based library for implementing an OCPP Central System providing an intuitive syntax for sending & handling messages. Currently supports OCPP-J version >= 1.6 and includes TypeScript definitions for 1.6 and 2.0.1 messages.

# Usage example

```typescript
import WsEndpoint, { BootNotificationRequest } from 'node-ocpp';

const cs = new WsEndpoint({ authRequired: false });

cs.handle<BootNotificationRequest>('BootNotification', async data => ({
  currentTime: new Date(),
  status: 'Accepted',
  interval: 120,
}));

cs.on('client_connected', async (session: Session) => {
  const response = await cs.send<RemoteStartTransactionRequest>(
    session.client.id,
    'RemoteStartTransaction',
    {
      idTag: '1234567890',
    }
  );
  console.dir(response);
});

cs.listen();
```

# Configuration

| Key               | Type     | Purpose                                                      | Default                                                      |
| ----------------- | -------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| `port`            | number   | TCP port on which the application should listen              | `8080` (development)<br />`80` (production)                  |
| `hostname`        | string   | Host name on which the application should listen             | `localhost`                                                  |
| `route`           | string   | Route which clients should connect to, appended by their individual CP id | `/ocpp`                                                      |
| `protocols`       | string[] | WebSocket subprotocol versions for which upgrade requests should be allowed | `ocpp1.2`<br /> `ocpp1.5`<br /> `ocpp1.6` <br />`ocpp2.0`<br />`ocpp2.0.1` |
| `actionsAllowed`  | string[] | OCPP actions which the CS should allow to be sent/received<br />(By default, any action will be allowed) | `null`                                                       |
| `maxConnections`  | number   | Maximum number of clients which should be allowed to connect at the same time | `511`                                                        |
| `sessionTimeout`  | number   | Time in milliseconds after which a client session will be terminated if no further messages are received<br />(Disabled if a negative value is passed) | `30000`                                                      |
| `authRequired`    | boolean  | Whether connection attempts should be denied unless explicitly accepted | `true`                                                       |
| `basicAuth`       | boolean  | Whether HTTP BASIC authentication mechanism should be allowed<br />(Only secure in combination with HTTPS) | `true`                                                       |
| `certificateAuth` | boolean  | Whether clients should be able to use SSL/TLS certificates for authentication<br />(It is recommended to use an Nginx proxy for this purpose) | `false`                                                      |
| `validation`      | boolean  | Whether the contents of inbound & outbound messages should be validated against official JSON schemas | `true`                                                       |
