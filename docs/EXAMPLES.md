# Usage Examples

This document provides several complete examples of using Dao Code in practice.

## Example 1: Implementing JWT Authentication Middleware

### Scenario

You need to implement a JWT authentication middleware for an Express application.

### Steps

1. **Launch the Program**

```bash
dao-code interactive
```

2. **Input Requirements**

```
Implement an Express middleware for JWT authentication, requirements:
- Extract token from Authorization header
- Validate token validity
- Support token expiration handling
- Provide user information to req.user
- Comprehensive error handling
```

3. **Observe the Debate Process**

**Round One Debate**

Proposer (Claude) proposes solutions:
```
Solution One: Basic JWT Verification Middleware
- Use jsonwebtoken library
- Simple verification logic
- Suitable for rapid development

Solution Two: JWT + Redis Caching
- Token blacklist mechanism
- Support active revocation
- Better security

Solution Three: Dual Token Mechanism
- Access Token + Refresh Token
- Short-term tokens enhance security
- Long-term tokens improve user experience
```

Challenger (GPT-4) questions:
```
Solution One Issues:
- Lacks token revocation mechanism
- Cannot handle user permission changes
- Insufficient key management security

Solution Two Issues:
- Introduces Redis dependency, increases complexity
- Performance overhead (query Redis on each request)
- Single point of failure risk

Solution Three Issues:
- High implementation complexity
- Requires additional refresh endpoint
- Client needs to handle token refresh logic
```

**Round Two Debate**

Proposer improves solutions...

Challenger continues questioning...

**Round Three - Judge Summary**

Judge (Gemini) comprehensive analysis:
```
Recommended Solutions:

1. Solution One (Improved Version) - Quick Implementation
   Complexity: Low
   Suitable for: MVP, small projects
   Pros: Simple, easy to maintain
   Cons: Limited features

2. Solution Two (Optimized Version) - Balanced Solution
   Complexity: Medium
   Suitable for: Most production environments
   Pros: Good security, scalable
   Cons: Requires Redis

3. Solution Three (Simplified Version) - Best Experience
   Complexity: High
   Suitable for: Large applications, high user experience requirements
   Pros: Secure and user-friendly
   Cons: Complex implementation
```

4. **Select Solution**

Choose Solution 2 (Optimized Version)

5. **Coding Collaboration Process**

**Round One Coding**

Writer (Claude):
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

Reviewer (GPT-4) comments:
```
1. Missing Redis connection error handling
2. JWT_SECRET environment variable should have default value or better validation
3. Should add TypeScript type extension for Express Request
4. Redis operations should be wrapped with Promise
5. Recommend adding logging
```

Inspector (Gemini) inspection:
```
DECISION: REJECTED

ISSUES:
- [CRITICAL] Redis client not properly initialized and connected
- [CRITICAL] Missing JWT_SECRET validation
- [WARNING] Insufficient error handling
- [WARNING] Missing type definition extensions
- [INFO] Recommend adding request logging

SUGGESTIONS:
- Use async/await to wrap Redis operations
- Add configuration validation
- Improve type definitions
```

**Round Two Coding (Role Rotation)**

Writer (GPT-4) improves code:
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

Reviewer (Gemini):
```
Excellent improvements!
1. Clear class design
2. Complete configuration validation
3. Comprehensive error handling
4. Correct type definitions
5. Proper Redis fallback handling

Minor suggestions:
- Add unit test examples
- Consider adding rate limiting
```

Inspector (Claude):
```
DECISION: APPROVED

ISSUES: (no critical issues)

SUGGESTIONS:
- Can add JSDoc comments
- Consider exporting interface definitions for external use
- Can add configuration options for custom error messages
```

6. **Get Final Code**

✓ Code generation complete! Includes complete JWT authentication middleware implementation.

---

## Example 2: Database Query Optimization

### Scenario

Your application has a slow query that needs optimization.

### Requirement Description

```
Optimize the following SQL query:

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

Current issues:
- Users table has 1 million records
- Orders table has 5 million records
- Query takes 30 seconds
- Need to optimize to under 1 second
```

### Solutions from Debate

1. **Solution One: Add Indexes**
   - Add indexes on key fields
   - Simple and effective

2. **Solution Two: Materialized View**
   - Pre-calculate aggregated results
   - Extremely fast queries, but uses space

3. **Solution Three: Query Rewrite + Partitioning**
   - Refactor query logic
   - Table partitioning
   - Comprehensive optimization

### Final Code

After selecting Solution 3, the generated optimization solution includes:

```sql
-- 1. Add indexes
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_user_total ON orders(user_id, total);

-- 2. Partition table (if supported)
ALTER TABLE orders PARTITION BY RANGE (YEAR(created_at)) (
  PARTITION p2024 VALUES LESS THAN (2025),
  PARTITION p2025 VALUES LESS THAN (2026)
);

-- 3. Optimized query
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

## Example 3: React Component Refactoring

### Scenario

Refactor a complex React component.

### Requirements

```
Refactor the following component to improve readability and performance:

Current component:
- 500 lines of code
- Contains business logic, UI, and data fetching
- No type definitions
- Difficult to test

Requirements:
- Use TypeScript
- Follow SOLID principles
- Easy to test
- Performance optimization
```

### Debate Results

Three solutions analyze from different perspectives:
1. Component splitting strategy
2. State management approach
3. Performance optimization techniques

### Final Output

After three rounds of coding iterations, produces:

```typescript
// types.ts - Type definitions
export interface User {
  id: string;
  name: string;
  email: string;
}

export interface UserFormProps {
  onSubmit: (user: User) => Promise<void>;
  initialData?: Partial<User>;
}

// hooks/useUserForm.ts - Logic separation
export function useUserForm(initialData?: Partial<User>) {
  const [formData, setFormData] = useState<Partial<User>>(
    initialData || {}
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = useCallback(() => {
    // Validation logic
  }, [formData]);

  return { formData, setFormData, errors, validate };
}

// components/UserForm.tsx - UI component
export const UserForm: React.FC<UserFormProps> = memo(({
  onSubmit,
  initialData
}) => {
  const { formData, setFormData, errors, validate } = useUserForm(initialData);

  // Concise UI logic
});
```

---

## More Examples

Visit [GitHub Examples](https://github.com/your-repo/dao-code/tree/main/examples) to see more practical use cases.
