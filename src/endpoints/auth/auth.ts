import {
  Endpoint,
  EndpointMethod,
  EndpointAuthType
} from 'node-server-engine';
import { loginValidator } from './auth.validator';
import { loginHandler } from './auth.handler';

export const loginEndpoint = new Endpoint({
  path: '/auth/login',
  method: EndpointMethod.POST,
  handler: loginHandler,
  authType: EndpointAuthType.NONE,
  validator: loginValidator
});
