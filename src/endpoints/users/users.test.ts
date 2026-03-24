import { expect } from 'chai';
import sinon from 'sinon';
import bcrypt from 'bcryptjs';
import { factory } from 'backend-test-tools';
import { createMockRequest, createMockResponse, createMockModelInstance } from 'test/stubs';
import { User, Audit } from 'db/models';
import {
  createUserHandler,
  getAllUsersHandler,
  getUserByIdHandler,
  updateUserHandler,
  deleteUserHandler
} from './users.handler';
import {
  USER_NOT_FOUND,
  USER_CREATION_ERROR,
  USER_UPDATE_ERROR,
  USER_DELETION_ERROR,
  USER_GET_ERROR
} from './users.const';
import { createUserValidator, updateUserValidator, deleteUserValidator } from './users.validator';

describe('Users Endpoints', () => {
  describe('User Constants', () => {
    it('should have correct error messages', () => {
      expect(USER_NOT_FOUND).to.equal('User not found');
      expect(USER_CREATION_ERROR).to.equal('Error creating user');
      expect(USER_UPDATE_ERROR).to.equal('Error updating user');
      expect(USER_DELETION_ERROR).to.equal('Error deleting user');
      expect(USER_GET_ERROR).to.equal('Error getting error');
    });
  });

  describe('User Validators', () => {
    it('should have createUserValidator with required fields', () => {
      expect(createUserValidator.firstName).to.exist;
      expect(createUserValidator.lastName).to.exist;
      expect(createUserValidator.email).to.exist;
      expect(createUserValidator.password).to.exist;
      expect(createUserValidator.roleId).to.exist;
    });

    it('should validate email with custom logic', () => {
      expect(createUserValidator.email.isEmail).to.exist;
      expect(createUserValidator.email.custom).to.exist;
    });

    it('should have updateUserValidator with id param', () => {
      expect(updateUserValidator.id).to.exist;
      expect(updateUserValidator.id.in).to.equal('params');
    });

    it('should have deleteUserValidator with id param', () => {
      expect(deleteUserValidator.id).to.exist;
      expect(deleteUserValidator.id.in).to.equal('params');
      expect(deleteUserValidator.id.isInt).to.exist;
    });
  });

  describe('User Handlers', () => {
  let req: any;
  let res: any;

  beforeEach(() => {
    req = createMockRequest();
    res = createMockResponse();
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('POST /users - createUserHandler', () => {
    it('should create a new user successfully', async () => {
      const mockUser = factory.build('user');
      
      req.body = {
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        email: mockUser.email,
        dateOfBirth: '1990-01-01',
        phoneNumber: '1234567890',
        password: 'password123',
        roleId: '1'
      };

      const bcryptHashStub = sinon.stub(bcrypt, 'hash').resolves('hashedPassword');
      const createStub = sinon.stub(User, 'create').resolves({
        id: 'user-123',
        ...req.body,
        password: 'hashedPassword',
        createdBy: 'admin-123'
      } as any);
      const auditCreateStub = sinon.stub(Audit, 'create').resolves({} as any);

      await createUserHandler(req, res);

      expect(bcryptHashStub).to.have.been.calledWith('password123', 10);
      expect(createStub).to.have.been.calledOnce;
      expect(auditCreateStub).to.have.been.calledOnce;
      expect(res.status).to.have.been.calledWith(200);
      expect(res.json).to.have.been.calledWith(
        sinon.match({
          message: 'User created successfully'
        })
      );
    });

    it('should return 500 on creation error', async () => {
      const mockUser = factory.build('user');
      
      req.body = {
        firstName: mockUser.firstName,
        email: mockUser.email,
        password: 'password123'
      };

      const error = new Error('Database error');
      sinon.stub(bcrypt, 'hash').resolves('hashedPassword');
      sinon.stub(User, 'create').rejects(error);

      await createUserHandler(req, res);

      expect(res.status).to.have.been.calledWith(500);
      expect(res.json).to.have.been.calledWith(
        sinon.match({
          message: USER_CREATION_ERROR,
          error
        })
      );
    });
  });

  describe('GET /users - getAllUsersHandler', () => {
    it('should return all users', async () => {
      const mockUsers = factory.buildMany('user', 2);

      const findAllStub = sinon.stub(User, 'findAll').resolves(mockUsers as any);

      await getAllUsersHandler(req, res);

      expect(findAllStub).to.have.been.calledOnce;
      expect(res.status).to.have.been.calledWith(200);
      expect(res.json).to.have.been.calledWith({ Users: mockUsers });
    });

    it('should return 404 when no users found', async () => {
      sinon.stub(User, 'findAll').resolves(null as any);

      await getAllUsersHandler(req, res);

      expect(res.status).to.have.been.calledWith(404);
      expect(res.json).to.have.been.calledWith({ message: USER_NOT_FOUND });
    });

    it('should return 500 on error', async () => {
      const error = new Error('Database error');
      sinon.stub(User, 'findAll').rejects(error);

      await getAllUsersHandler(req, res);

      expect(res.status).to.have.been.calledWith(500);
      expect(res.json).to.have.been.calledWith(
        sinon.match({
          message: USER_GET_ERROR,
          error
        })
      );
    });
  });

  describe('GET /users/:id - getUserByIdHandler', () => {
    it('should return user by id', async () => {
      const mockUser = factory.build('user', { id: 'user-123' });
      req.params.id = 'user-123';

      const findOneStub = sinon.stub(User, 'findOne').resolves(mockUser as any);

      await getUserByIdHandler(req, res);

      expect(findOneStub).to.have.been.calledWith({ where: { id: 'user-123' } });
      expect(res.status).to.have.been.calledWith(200);
      expect(res.json).to.have.been.calledWith({ user: mockUser });
    });

    it('should return 404 when user not found', async () => {
      req.params.id = 'nonexistent-id';
      sinon.stub(User, 'findOne').resolves(null);

      await getUserByIdHandler(req, res);

      expect(res.status).to.have.been.calledWith(404);
      expect(res.json).to.have.been.calledWith({ message: USER_NOT_FOUND });
    });

    it('should return 500 on error', async () => {
      req.params.id = 'user-123';
      const error = new Error('Database error');
      sinon.stub(User, 'findOne').rejects(error);

      await getUserByIdHandler(req, res);

      expect(res.status).to.have.been.calledWith(500);
      expect(res.json).to.have.been.calledWith({ message: USER_GET_ERROR });
    });
  });

  describe('PUT /users/:id - updateUserHandler', () => {
    it('should update user successfully', async () => {
      const mockUser = factory.build('user', { id: 'user-123' });
      req.params.id = 'user-123';
      req.body = {
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        email: 'john.updated@example.com',
        roleId: '2'
      };

      const mockUserInstance = createMockModelInstance({
        ...mockUser,
        roleId: '1'
      });

      const findByPkStub = sinon.stub(User, 'findByPk').resolves(mockUserInstance as any);
      const auditCreateStub = sinon.stub(Audit, 'create').resolves({} as any);

      await updateUserHandler(req, res);

      expect(findByPkStub).to.have.been.calledWith('user-123');
      expect(mockUserInstance.set).to.have.been.calledOnce;
      expect(mockUserInstance.save).to.have.been.calledOnce;
      expect(auditCreateStub).to.have.been.calledOnce;
      expect(res.status).to.have.been.calledWith(200);
      expect(res.json).to.have.been.calledWith(
        sinon.match({
          message: 'User updated successfully'
        })
      );
    });

    it('should return 404 when user not found', async () => {
      req.params.id = 'nonexistent-id';
      sinon.stub(User, 'findByPk').resolves(null);

      await updateUserHandler(req, res);

      expect(res.status).to.have.been.calledWith(404);
      expect(res.json).to.have.been.calledWith({ message: USER_NOT_FOUND });
    });

    it('should return 500 on update error', async () => {
      req.params.id = 'user-123';
      const error = new Error('Database error');
      sinon.stub(User, 'findByPk').rejects(error);

      await updateUserHandler(req, res);

      expect(res.status).to.have.been.calledWith(500);
      expect(res.json).to.have.been.calledWith(
        sinon.match({
          message: USER_UPDATE_ERROR,
          error
        })
      );
    });
  });

  describe('DELETE /users/:id - deleteUserHandler', () => {
    it('should delete user successfully', async () => {
      const mockUser = factory.build('user', { id: 'user-123' });
      req.params.id = 'user-123';
      const mockUserInstance = createMockModelInstance(mockUser);

      const findByPkStub = sinon.stub(User, 'findByPk').resolves(mockUserInstance as any);
      const auditCreateStub = sinon.stub(Audit, 'create').resolves({} as any);

      await deleteUserHandler(req, res);

      expect(findByPkStub).to.have.been.calledWith('user-123');
      expect(auditCreateStub).to.have.been.calledOnce;
      expect(mockUserInstance.destroy).to.have.been.calledOnce;
      expect(res.status).to.have.been.calledWith(200);
      expect(res.json).to.have.been.calledWith({ message: 'User deleted successfully' });
    });

    it('should return 404 when user not found', async () => {
      req.params.id = 'nonexistent-id';
      sinon.stub(User, 'findByPk').resolves(null);

      await deleteUserHandler(req, res);

      expect(res.status).to.have.been.calledWith(404);
      expect(res.json).to.have.been.calledWith({ message: USER_NOT_FOUND });
    });

    it('should return 500 on deletion error', async () => {
      req.params.id = 'user-123';
      const error = new Error('Database error');
      sinon.stub(User, 'findByPk').rejects(error);

      await deleteUserHandler(req, res);

      expect(res.status).to.have.been.calledWith(500);
      expect(res.json).to.have.been.calledWith(
        sinon.match({
          message: USER_DELETION_ERROR,
          error
        })
      );
    });
  });
  });
});
