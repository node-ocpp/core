**⚠️ This is project is still in development - README serves only as a draft ⚠️**



EVY-OCPP is an open-source Node.js/TypeScript library which provides an intuitive & type-safe programming interface for implementing an OCPP Central System. It conforms to the official OCPP specification and supports OCPPJ (JSON/WebSocket) as well as OCPPS (XML/SOAP).



# Features

- Message type definitions for OCPP version 1.2 - 2.0.1
- Middleware-like patterns for authentication & message handling
- Validation of inbound & outbound messages against official schemas



# Usage example

If you are looking for extensive documentation, please refer to [our wiki](#).

```typescript
import JsonEndpoint from 'evy-ocppj';
import SoapEndpoint from 'evy-ocpps';
import { BasicAuthenticationHandler, InboundMessageHandler } from 'evy-ocpp';
import { BootNofificationRequest } from 'evy-types:1.6';

// This handler will log and accept any incoming connection attempts
class SimpleAuthenticationHandler extends BasicAuthenticationHandler {
    handle(request: BasicAuthenticationRequest) {
        console.log(`Client ${request.id} attempting to authenticate
        			with password ${request.passsword}`);

        return request.accept(new OcppClient(request.id));
    }
}

// This handler will log inbound messages of any kind to console
class GenericMessageHandler extends InboundMessageHandler {
    handle(message: InboundMessage) {
        console.dir(message);
        return super.handle(message); // Pass message on to next handler
    }
}

// This handler will send a response to BootNofication messages only
@Action('BootNotification')
class BootNotificationHandler extends InboundMessageHandler {
    handle(message: BootNotificationRequest) {
        return message.respond({
            currentTime: new Date(),
            interval: 30,
            status: 'Accepted'
        });
    }
}

const authHandlers = [new SimpleAuthenticationHandler()];
const messageHandlers = [new GenericMessageHandler(), new BootNofificationHandler()];

const wsEndpoint = new WebSocketEndpoint({port: 80}, authHandlers, messageHandlers);
const soapEndpoint = new SoapEndpoint({port: 8080}, authHandlers, messageHandlers);
const logFunction = config => `Server is listening on port ${config.port}`
wsEndpoint.on('server_listening', logFunction);
soapEndrpoint.on('server_listening', logFunction)
wsEndpoint.listen();
soapEndpoint.listen();
```
