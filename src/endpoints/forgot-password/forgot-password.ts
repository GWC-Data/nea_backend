import {
  Endpoint,
  EndpointMethod,
  EndpointAuthType
} from 'node-server-engine';
import { forgotPasswordHandler } from './forgot-password.handler';
import { forgotPasswordValidator } from './forgot-password.validator';

export const forgotPasswordEndpoint = new Endpoint({
  path: '/auth/forgot-password',
  method: EndpointMethod.POST,
  handler: forgotPasswordHandler,
  authType: EndpointAuthType.NONE,
  validator: forgotPasswordValidator
});
