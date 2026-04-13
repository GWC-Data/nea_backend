import {
  Endpoint,
  EndpointMethod,
  EndpointAuthType
} from 'node-server-engine';
import { emailTestHandler } from './mail.handler';
import { emailTestValidator } from './mail.validator';

export const emailTestEndpoint = new Endpoint({
  path: '/mail/test',
  method: EndpointMethod.GET,
  handler: emailTestHandler,
  authType: EndpointAuthType.NONE,
  validator: emailTestValidator
});
