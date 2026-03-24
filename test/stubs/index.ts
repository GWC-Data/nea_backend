import sinon from 'sinon';

/**
 * Create a mock Sequelize model instance with common methods
 */
export function createMockModelInstance<T extends object>(data: T) {
  return {
    ...data,
    set: sinon.stub(),
    save: sinon.stub().resolves(),
    destroy: sinon.stub().resolves(),
    reload: sinon.stub().resolves(),
    toJSON: sinon.stub().returns(data)
  };
}

/**
 * Create a mock Express request object
 */
export function createMockRequest(overrides: any = {}) {
  return {
    body: {},
    params: {},
    query: {},
    headers: {},
    user: { id: 'test-user-123' },
    ...overrides
  };
}

/**
 * Create a mock Express response object
 */
export function createMockResponse() {
  const res: any = {
    statusCode: 200,
    json: sinon.stub().returnsThis(),
    status: sinon.stub().returnsThis(),
    send: sinon.stub().returnsThis(),
    sendStatus: sinon.stub().returnsThis(),
    setHeader: sinon.stub().returnsThis()
  };
  
  res.status.callsFake((code: number) => {
    res.statusCode = code;
    return res;
  });
  
  return res;
}

/**
 * Stub database model methods
 */
export function stubModelMethods<T>(Model: any, methods: {
  findAll?: T[];
  findOne?: T | null;
  findByPk?: T | null;
  create?: T;
  update?: [number, T[]];
  destroy?: number;
  count?: number;
}) {
  const stubs: any = {};
  
  if (methods.findAll !== undefined) {
    stubs.findAll = sinon.stub(Model, 'findAll').resolves(methods.findAll);
  }
  
  if (methods.findOne !== undefined) {
    stubs.findOne = sinon.stub(Model, 'findOne').resolves(methods.findOne);
  }
  
  if (methods.findByPk !== undefined) {
    stubs.findByPk = sinon.stub(Model, 'findByPk').resolves(methods.findByPk);
  }
  
  if (methods.create !== undefined) {
    stubs.create = sinon.stub(Model, 'create').resolves(methods.create);
  }
  
  if (methods.update !== undefined) {
    stubs.update = sinon.stub(Model, 'update').resolves(methods.update);
  }
  
  if (methods.destroy !== undefined) {
    stubs.destroy = sinon.stub(Model, 'destroy').resolves(methods.destroy);
  }
  
  if (methods.count !== undefined) {
    stubs.count = sinon.stub(Model, 'count').resolves(methods.count);
  }
  
  return stubs;
}
