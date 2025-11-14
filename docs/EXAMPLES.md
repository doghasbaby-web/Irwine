# 使用示例

本文档提供了几个实际使用 Dao Code 的完整示例。

## 示例 1: 实现 JWT 认证中间件

### 场景

你需要为 Express 应用实现一个 JWT 认证中间件。

### 操作步骤

1. **启动程序**

```bash
dao-code interactive
```

2. **输入需求**

```
实现一个 Express 中间件用于 JWT 认证，要求：
- 从 Authorization header 中提取 token
- 验证 token 的有效性
- 支持 token 过期处理
- 提供用户信息到 req.user
- 完善的错误处理
```

3. **观察辩论过程**

**第一轮辩论**

正方（Claude）提出方案：
```
方案一：基础 JWT 验证中间件
- 使用 jsonwebtoken 库
- 简单的验证逻辑
- 适合快速开发

方案二：JWT + Redis 缓存
- token 黑名单机制
- 支持主动撤销
- 更好的安全性

方案三：双 token 机制
- Access Token + Refresh Token
- 短期 token 提升安全性
- 长期 token 改善用户体验
```

反方（GPT-4）质疑：
```
方案一问题：
- 缺少 token 撤销机制
- 无法处理用户权限变更
- 密钥管理不够安全

方案二问题：
- 引入 Redis 依赖，增加复杂度
- 性能开销（每次请求查询 Redis）
- 单点故障风险

方案三问题：
- 实现复杂度高
- 需要额外的刷新端点
- 客户端需要处理 token 刷新逻辑
```

**第二轮辩论**

正方改进方案...

反方继续质疑...

**第三轮 - 裁判总结**

裁判（Gemini）综合分析：
```
推荐方案：

1. 方案一（改进版）- 快速实现
   复杂度: Low
   适用: MVP、小型项目
   优点: 简单、易维护
   缺点: 功能有限

2. 方案二（优化版）- 平衡方案
   复杂度: Medium
   适用: 大多数生产环境
   优点: 安全性好、可扩展
   缺点: 需要 Redis

3. 方案三（简化版）- 最佳体验
   复杂度: High
   适用: 大型应用、对用户体验要求高
   优点: 安全且用户友好
   缺点: 实现复杂
```

4. **选择方案**

选择方案 2（优化版）

5. **编码协同过程**

**第一轮编码**

编写者（Claude）:
```typescript
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import redis from 'redis';

const redisClient = redis.createClient();

interface JWTPayload {
  userId: string;
  email: string;
  role: string;
}

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Extract token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);

    // Check blacklist
    const isBlacklisted = await redisClient.get(`blacklist:${token}`);
    if (isBlacklisted) {
      return res.status(401).json({ error: 'Token has been revoked' });
    }

    // Verify token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET!
    ) as JWTPayload;

    // Attach user to request
    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: 'Token expired' });
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
};
```

审查者（GPT-4）评论：
```
1. 缺少 Redis 连接错误处理
2. JWT_SECRET 环境变量应该有默认值或更好的验证
3. 应该添加 TypeScript 类型扩展for Express Request
4. Redis 操作应该用 Promise 包装
5. 建议添加日志记录
```

检查者（Gemini）检查：
```
DECISION: REJECTED

ISSUES:
- [CRITICAL] Redis 客户端未正确初始化和连接
- [CRITICAL] 缺少对 JWT_SECRET 的验证
- [WARNING] 错误处理不够全面
- [WARNING] 缺少类型定义扩展
- [INFO] 建议添加请求日志

SUGGESTIONS:
- 使用 async/await 包装 Redis 操作
- 添加配置验证
- 完善类型定义
```

**第二轮编码（角色轮换）**

编写者（GPT-4）改进代码:
```typescript
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { createClient } from 'redis';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

interface JWTPayload {
  userId: string;
  email: string;
  role: string;
}

interface AuthConfig {
  jwtSecret: string;
  redisUrl?: string;
}

class AuthMiddleware {
  private redisClient;
  private config: AuthConfig;

  constructor(config: AuthConfig) {
    // Validate configuration
    if (!config.jwtSecret) {
      throw new Error('JWT_SECRET is required');
    }
    this.config = config;

    // Initialize Redis with error handling
    this.redisClient = createClient({
      url: config.redisUrl || 'redis://localhost:6379'
    });

    this.redisClient.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    this.redisClient.connect().catch(console.error);
  }

  middleware = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Extract token
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        res.status(401).json({ error: 'No token provided' });
        return;
      }

      const token = authHeader.substring(7);

      // Check if Redis is available
      if (this.redisClient.isReady) {
        const isBlacklisted = await this.redisClient.get(`bl:${token}`);
        if (isBlacklisted) {
          res.status(401).json({ error: 'Token revoked' });
          return;
        }
      }

      // Verify token
      const decoded = jwt.verify(
        token,
        this.config.jwtSecret
      ) as JWTPayload;

      // Attach user to request
      req.user = decoded;
      next();
    } catch (error) {
      this.handleError(error, res);
    }
  };

  private handleError(error: unknown, res: Response): void {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Token expired' });
    } else if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: 'Invalid token' });
    } else {
      console.error('Auth middleware error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async revokeToken(token: string, expiresIn: number = 3600): Promise<void> {
    if (this.redisClient.isReady) {
      await this.redisClient.setEx(`bl:${token}`, expiresIn, '1');
    }
  }
}

// Factory function
export function createAuthMiddleware(config: AuthConfig) {
  const auth = new AuthMiddleware(config);
  return auth.middleware;
}

// Usage example:
// const authMiddleware = createAuthMiddleware({
//   jwtSecret: process.env.JWT_SECRET!,
//   redisUrl: process.env.REDIS_URL
// });
```

审查者（Gemini）:
```
优秀的改进！
1. 类设计清晰
2. 配置验证完善
3. 错误处理全面
4. 类型定义正确
5. Redis 降级处理得当

小建议：
- 添加单元测试示例
- 考虑添加 rate limiting
```

检查者（Claude）:
```
DECISION: APPROVED

ISSUES: (无严重问题)

SUGGESTIONS:
- 可以添加 JSDoc 注释
- 考虑导出接口定义供外部使用
- 可以添加配置项用于自定义错误消息
```

6. **获得最终代码**

✓ 代码生成完成！包含完整的 JWT 认证中间件实现。

---

## 示例 2: 数据库查询优化

### 场景

你的应用有一个慢查询需要优化。

### 需求描述

```
优化以下 SQL 查询：

SELECT
  u.id, u.name, u.email,
  COUNT(o.id) as order_count,
  SUM(o.total) as total_spent
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE u.created_at > '2024-01-01'
GROUP BY u.id
HAVING order_count > 5
ORDER BY total_spent DESC

当前问题：
- 用户表有 100 万条记录
- 订单表有 500 万条记录
- 查询需要 30 秒
- 需要优化到 1 秒内
```

### 辩论产出的方案

1. **方案一：添加索引**
   - 在关键字段上添加索引
   - 简单有效

2. **方案二：物化视图**
   - 预计算聚合结果
   - 查询极快，但占用空间

3. **方案三：查询重写 + 分区**
   - 重构查询逻辑
   - 表分区
   - 综合优化

### 最终代码

选择方案 3 后，生成的优化方案包括：

```sql
-- 1. 添加索引
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_user_total ON orders(user_id, total);

-- 2. 分区表（如果支持）
ALTER TABLE orders PARTITION BY RANGE (YEAR(created_at)) (
  PARTITION p2024 VALUES LESS THAN (2025),
  PARTITION p2025 VALUES LESS THAN (2026)
);

-- 3. 优化后的查询
WITH active_users AS (
  SELECT id
  FROM users
  WHERE created_at > '2024-01-01'
),
user_orders AS (
  SELECT
    o.user_id,
    COUNT(*) as order_count,
    SUM(o.total) as total_spent
  FROM orders o
  INNER JOIN active_users au ON o.user_id = au.id
  GROUP BY o.user_id
  HAVING COUNT(*) > 5
)
SELECT
  u.id,
  u.name,
  u.email,
  uo.order_count,
  uo.total_spent
FROM users u
INNER JOIN user_orders uo ON u.id = uo.user_id
ORDER BY uo.total_spent DESC;
```

---

## 示例 3: React 组件重构

### 场景

重构一个复杂的 React 组件。

### 需求

```
重构以下组件，改进可读性和性能：

当前组件：
- 500 行代码
- 包含业务逻辑、UI、数据获取
- 没有类型定义
- 难以测试

要求：
- 使用 TypeScript
- 遵循 SOLID 原则
- 易于测试
- 性能优化
```

### 辩论结果

三个方案从不同角度分析：
1. 组件拆分策略
2. 状态管理方式
3. 性能优化技巧

### 最终输出

经过三轮编码迭代，产出：

```typescript
// types.ts - 类型定义
export interface User {
  id: string;
  name: string;
  email: string;
}

export interface UserFormProps {
  onSubmit: (user: User) => Promise<void>;
  initialData?: Partial<User>;
}

// hooks/useUserForm.ts - 逻辑分离
export function useUserForm(initialData?: Partial<User>) {
  const [formData, setFormData] = useState<Partial<User>>(
    initialData || {}
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = useCallback(() => {
    // 验证逻辑
  }, [formData]);

  return { formData, setFormData, errors, validate };
}

// components/UserForm.tsx - UI 组件
export const UserForm: React.FC<UserFormProps> = memo(({
  onSubmit,
  initialData
}) => {
  const { formData, setFormData, errors, validate } = useUserForm(initialData);

  // 简洁的 UI 逻辑
});
```

---

## 更多示例

访问 [GitHub Examples](https://github.com/your-repo/dao-code/tree/main/examples) 查看更多实际使用案例。
