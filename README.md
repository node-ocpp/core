A Node.js-based library for implementing an OCPP _Central System (CS)_ providing an intuitive syntax for sending & handling messages. Currently supports OCPP-J (_JSON over WebSocket_) and includes message type definitions for 1.6 _Feature Profile 'Core'_.

# Usage example

```typescript
import { WsEndpoint, ocpp16 } from '@node-ocpp/core';

const cs = new WsEndpoint({ authRequired: false });

cs.handle<ocpp16.BootNotificationRequest>('BootNotification', async data => ({
  currentTime: new Date(),
  status: 'Accepted',
  interval: 120,
}));

cs.on('client_connected', async session => {
  const response = await cs.send<ocpp16.RemoteStartTransactionRequest>(
    session.client.id,
    'RemoteStartTransaction',
    { idTag: '1234567890' }
  );
  console.dir(response);
});

cs.listen();
```

# Configuration

| Key               | Type     | Purpose                                                                                                                                            | Default                                     |
| ----------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| `port`            | number   | TCP port on which the application should listen                                                                                                    | `8080` (development)<br />`80` (production) |
| `hostname`        | string   | Host name on which the application should listen                                                                                                   | `localhost`                                 |
| `route`           | string   | Route which clients should connect to, appended by their individual CP id                                                                          | `/ocpp`                                     |
| `protocols`       | string[] | WebSocket subprotocol versions for which upgrade requests should be allowed                                                                        | `ocpp1.2` - `ocpp2.0.1`                     |
| `actionsAllowed`  | string[] | OCPP actions which the CS should allow to be sent/received                                                                                         | _Actions for 1.6 Feature Profile 'Core'_    |
| `maxConnections`  | number   | Maximum number of clients which should be allowed to connect at the same time                                                                      | `511`                                       |
| `sessionTimeout`  | number   | Time in milliseconds after which a client session will be terminated if no further messages are received                                           | `30000`                                     |
| `authRequired`    | boolean  | Whether connection attempts should be denied unless explicitly accepted                                                                            | `true`                                      |
| `basicAuth`       | boolean  | Whether HTTP BASIC authentication mechanism should be allowed<br />(Only secure in combination with HTTPS)                                         | `true`                                      |
| `certificateAuth` | boolean  | Whether clients should be able to use SSL/TLS certificates for authentication<br />(It is recommended to use an e.g. Nginx proxy for this purpose) | `false`                                     |
| `validation`      | boolean  | Whether the contents of inbound & outbound messages should be validated against official JSON schemas                                              | `true`                                      |
