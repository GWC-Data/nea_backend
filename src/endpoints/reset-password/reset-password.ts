import {
  Endpoint,
  EndpointMethod,
  EndpointAuthType
} from 'node-server-engine';
import { resetPasswordHandler } from './reset-password.handler';
import { resetPasswordValidator } from './reset-password.validator';

export const resetPasswordEndpoint = new Endpoint({
  path: '/auth/reset-password/:token',
  method: EndpointMethod.POST,
  handler: resetPasswordHandler,
  authType: EndpointAuthType.NONE,
  validator: resetPasswordValidator
});
