**⚠️ This is project is still in development ⚠️**

EVY-OCPP is an open-source Node.js/TypeScript library which provides an intuitive & type-safe programming interface for implementing an OCPP Central System. It conforms to the official OCA OCPP specification and currently supports only OCPPJ (JSON over WebSocket).



# Features

- Message type definitions for OCPP version <= 1.6 Core
- Middleware-like patterns for BASIC authentication & message handling
- Validation of inbound & outbound messages against official schemas



# Usage example

```typescript
// This handler will log and accept any incoming connection attempts
class AuthenticationHandler extends OcppAuthenticationHandler {
  async handle(request: OcppAuthenticationRequest) {
    request.accept();
    return await super.handle(request);
  }
}

// This handler will send a response to BootNofication messages
class BootNotificationHandler extends InboundOcppMessageHandler {
  async handle(message: BootNotificationRequest) {
    if (message.action !== 'BootNotification') {
      return await super.handle(message);
    }

    message.respond(
      new OutboundOcppCallResult(message.sender, message.id, {
        currentTime: new Date(),
        interval: 120,
        status: 'Accepted',
      })
    );

    return await super.handle(message);
  }
}

const wsEndpoint = new WebSocketEndpoint(
  { basicAuth: false },
  [ new AuthenticationHandler() ],
  [ new BootNotificationHandler() ]
);

wsEndpoint.listen();

wsEndpoint.on('server_listening', config =>
  console.log(`Server is listening on port ${config.port}`)
);
```
