# 任务 3：Services 层测试补充技术方案

> 文档版本：v1.0  
> 作者：系统架构师  
> 日期：2026-04-10  
> 任务：补充 services 层测试

---

## 一、现状分析

### 1.1 现有 Services 清单

| 文件 | 功能 | 测试覆盖率 |
|------|------|-----------|
| `server/services/AuthService.js` | 认证服务 | 0% |
| `server/services/UserService.js` | 用户管理 | 0% |
| `server/services/OfficeService.js` | Office 智能体工坊 | 0% |
| `server/services/MyWorldService.js` | MyWorld 虚拟公司 | 0% |
| `server/services/AlertService.js` | 告警服务 | 0% |

### 1.2 测试缺口

- 所有服务缺少单元测试
- 缺少数据库交互测试
- 缺少外部 API 调用 mock 测试

---

## 二、测试架构设计

### 2.1 服务测试分层

```
┌─────────────────────────────────────────────────────┐
│              Services 测试架构                        │
│                                                      │
│  ┌─────────────────────────────────────────────┐   │
│  │            Integration Tests                 │   │
│  │  - 真实数据库交互                            │   │
│  │  - 完整业务流程验证                          │   │
│  └─────────────────────────────────────────────┘   │
│                        ↑                           │
│  ┌─────────────────────────────────────────────┐   │
│  │              Unit Tests                      │   │
│  │  - 单函数逻辑验证                            │   │
│  │  - Mock 数据库/外部 API                       │   │
│  └─────────────────────────────────────────────┘   │
│                        ↑                           │
│  ┌─────────────────────────────────────────────┐   │
│  │            Test Utilities                    │   │
│  │  - Factories (测试数据生成)                  │   │
│  │  - Fixtures (测试 fixtures)                  │   │
│  │  - Helpers (测试辅助函数)                    │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### 2.2 测试策略

| 服务类型 | 测试重点 | Mock 策略 |
|---------|---------|----------|
| AuthService | 密码验证、Token 生成 | Mock bcrypt、JWT |
| UserService | CRUD 操作、权限检查 | Mock 数据库查询 |
| OfficeService | 场景编排、Agent 通信 | Mock WebSocket RPC |
| AlertService | 规则匹配、Webhook 发送 | Mock HTTP 客户端 |

---

## 三、测试用例设计

### 3.1 AuthService 测试

```javascript
// tests/services/AuthService.test.js

const AuthService = require('../../server/services/AuthService');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

jest.mock('bcrypt');
jest.mock('jsonwebtoken');

describe('AuthService', () => {
  describe('validateCredentials', () => {
    test('should return user info for valid credentials', async () => {
      const mockUser = {
        id: 'user1',
        username: 'test',
        password_hash: '$2b$12$hashedpassword',
        role: 'admin'
      };
      
      bcrypt.compare.mockResolvedValue(true);
      
      const result = await AuthService.validateCredentials('test', 'password123');
      
      expect(result).toEqual({
        id: 'user1',
        username: 'test',
        role: 'admin'
      });
    });
    
    test('should throw error for invalid credentials', async () => {
      bcrypt.compare.mockResolvedValue(false);
      
      await expect(
        AuthService.validateCredentials('test', 'wrongpass')
      ).rejects.toThrow('Invalid credentials');
    });
  });
  
  describe('generateToken', () => {
    test('should generate valid JWT token', () => {
      const mockToken = 'mock.jwt.token';
      jwt.sign.mockReturnValue(mockToken);
      
      const token = AuthService.generateToken('user1', 'admin');
      
      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user1', role: 'admin' }),
        expect.any(String),
        expect.objectContaining({ expiresIn: '24h' })
      );
      expect(token).toBe(mockToken);
    });
  });
});
```

### 3.2 UserService 测试

```javascript
// tests/services/UserService.test.js

const UserService = require('../../server/services/UserService');
const db = require('../../server/database');

jest.mock('../../server/database');

describe('UserService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('createUser', () => {
    test('should create user with hashed password', async () => {
      const mockUser = { id: 'user1', username: 'test', role: 'viewer' };
      
      db.prepare.mockReturnValue({
        run: () => { lastID: 'user1' },
        get: () => mockUser
      });
      
      const result = await UserService.createUser({
        username: 'test',
        password: 'password123',
        role: 'viewer'
      });
      
      expect(result).toHaveProperty('id');
      expect(result.username).toBe('test');
    });
    
    test('should throw error for duplicate username', async () => {
      db.prepare.mockReturnValue({
        run: () => { throw new Error('UNIQUE constraint failed') }
      });
      
      await expect(
        UserService.createUser({ username: 'existing', password: 'pass' })
      ).rejects.toThrow('Username already exists');
    });
  });
  
  describe('updateUser', () => {
    test('should update user fields', async () => {
      db.prepare.mockReturnValue({
        run: () => {},
        get: () => ({ id: 'user1', display_name: 'New Name' })
      });
      
      const result = await UserService.updateUser('user1', {
        display_name: 'New Name'
      });
      
      expect(result.display_name).toBe('New Name');
    });
  });
});
```

### 3.3 OfficeService 测试

```javascript
// tests/services/OfficeService.test.js

const OfficeService = require('../../server/services/OfficeService');
const gateway = require('../../server/gateway');

jest.mock('../../server/gateway');

describe('OfficeService', () => {
  describe('createScene', () => {
    test('should create scene with agents', async () => {
      const sceneData = {
        name: 'Test Scene',
        agents: [{ agent_id: 'agent1', role: 'coordinator' }]
      };
      
      const result = await OfficeService.createScene(sceneData, 'user1');
      
      expect(result).toHaveProperty('id');
      expect(result.name).toBe('Test Scene');
    });
  });
  
  describe('executeScene', () => {
    test('should spawn sessions for each agent', async () => {
      const mockScene = {
        id: 'scene1',
        agents: [
          { agent_id: 'agent1', role: 'coordinator' },
          { agent_id: 'agent2', role: 'worker' }
        ]
      };
      
      gateway.sessionsSpawn.mockResolvedValue({ success: true });
      
      const result = await OfficeService.executeScene('scene1', 'user1');
      
      expect(gateway.sessionsSpawn).toHaveBeenCalledTimes(2);
      expect(result.status).toBe('executing');
    });
  });
});
```

### 3.4 AlertService 测试

```javascript
// tests/services/AlertService.test.js

const AlertService = require('../../server/services/AlertService');
const axios = require('axios');

jest.mock('axios');

describe('AlertService', () => {
  describe('checkAndTriggerAlerts', () => {
    test('should trigger webhook for matching rule', async () => {
      const mockEvent = {
        type: 'gateway_disconnect',
        gateway_id: 'gw1'
      };
      
      const mockRules = [{
        id: 'rule1',
        event_type: 'gateway_disconnect',
        channel_ids: ['channel1'],
        enabled: 1
      }];
      
      const mockChannels = [{
        id: 'channel1',
        channel_type: 'webhook',
        config: { url: 'https://example.com/webhook' }
      }];
      
      axios.post.mockResolvedValue({ status: 200 });
      
      // Mock database queries
      db.prepare.mockImplementation((query) => {
        if (query.includes('alert_rules')) return { all: () => mockRules };
        if (query.includes('alert_channels')) return { all: () => mockChannels };
        return { all: () => [] };
      });
      
      await AlertService.checkAndTriggerAlerts(mockEvent);
      
      expect(axios.post).toHaveBeenCalledWith(
        'https://example.com/webhook',
        expect.objectContaining({ event: mockEvent })
      );
    });
  });
});
```

---

## 四、测试工具与辅助

### 4.1 测试数据工厂

```javascript
// tests/factories/service-factories.js

const factory = {
  user(attrs = {}) {
    return {
      id: `user_${Date.now()}`,
      username: `test_${Date.now()}`,
      password_hash: '$2b$12$mockhash',
      role: attrs.role || 'viewer',
      status: 'active',
      ...attrs
    };
  },
  
  scene(attrs = {}) {
    return {
      id: `scene_${Date.now()}`,
      name: attrs.name || 'Test Scene',
      description: 'Test description',
      config: '{}',
      status: 'draft',
      created_by: 'user1',
      ...attrs
    };
  },
  
  alertRule(attrs = {}) {
    return {
      id: `rule_${Date.now()}`,
      name: attrs.name || 'Test Rule',
      event_type: attrs.event_type || 'gateway_disconnect',
      condition: '{}',
      channel_ids: '[]',
      enabled: 1,
      ...attrs
    };
  }
};

module.exports = factory;
```

### 4.2 数据库 Mock 助手

```javascript
// tests/helpers/db-mock.js

function mockDbQuery(mockData) {
  return jest.fn().mockReturnValue({
    all: () => mockData,
    get: () => mockData[0],
    run: () => ({ changes: 1, lastID: 'new_id' })
  });
}

function setupDatabaseMocks() {
  jest.mock('../../server/database', () => ({
    prepare: jest.fn()
  }));
  
  return require('../../server/database');
}

module.exports = { mockDbQuery, setupDatabaseMocks };
```

---

## 五、集成测试配置

### 5.1 测试数据库

```javascript
// tests/setup-db.js

const Database = require('better-sqlite3');
const path = require('path');

let testDb;

beforeAll(() => {
  testDb = new Database(':memory:');
  // 初始化测试 schema
  testDb.exec(fs.readFileSync('./schema.sql', 'utf8'));
  
  // 全局 mock
  jest.mock('../server/database', () => testDb);
});

afterAll(() => {
  testDb.close();
});

beforeEach(() => {
  testDb.exec('DELETE FROM users');
  testDb.exec('DELETE FROM audit_logs');
});
```

---

## 六、CI/CD 集成

### 6.1 测试脚本

```json
// package.json
{
  "scripts": {
    "test": "jest",
    "test:services": "jest tests/services",
    "test:coverage": "jest --coverage",
    "test:ci": "jest --coverage --ci --reporters=default --reporters=jest-junit"
  }
}
```

---

## 七、验收标准

- [ ] 所有 Services 单元测试覆盖率 > 85%
- [ ] AuthService 密码验证逻辑 100% 覆盖
- [ ] UserService CRUD 操作完整测试
- [ ] OfficeService 场景执行流程测试
- [ ] AlertService 规则匹配测试
- [ ] CI 流水线自动运行并生成覆盖率报告

---

*文档版本：v1.0 | 状态：待评审*
