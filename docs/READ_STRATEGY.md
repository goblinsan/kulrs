# Read Strategy: Architecture Decision Record

## Status
Accepted

## Context
We need to decide how the frontend applications (web and mobile) will read data from the database. There are two main approaches:

1. **Direct Database Access**: Frontend queries Neon Postgres directly
2. **Read API**: Frontend calls a separate read API (e.g., another Cloud Function or API service)

## Decision
**We will use direct database access from the frontend for read operations.**

## Rationale

### Why Direct Database Access?

#### 1. **Simplicity**
- Fewer moving parts to maintain
- No additional API layer to deploy and monitor
- Less code to write and test
- Simpler debugging and troubleshooting

#### 2. **Performance**
- Eliminates API round-trip latency
- Reduced network hops (client → database vs client → API → database)
- Lower cold start impact (no Cloud Functions for reads)
- Better Time to First Byte (TTFB)

#### 3. **Cost Efficiency**
- No compute costs for read API (Cloud Functions invocations)
- Only pay for database connections and queries
- Neon's serverless architecture scales down to zero
- Reduced egress costs

#### 4. **Developer Experience**
- Type-safe queries using Drizzle ORM
- Shared schema via `@kulrs/db` package
- Easy to test queries locally
- IDE autocomplete for queries

#### 5. **Flexibility**
- Can add query-specific indexes without API changes
- Easy to optimize queries per use case
- No API versioning concerns for reads
- Frontend controls pagination and filtering

### Why Write API is Still Needed

Write operations require:
- **Authentication**: Firebase ID token verification
- **Authorization**: User permission checks
- **Validation**: Complex business rules
- **Side Effects**: Updating counters, sending notifications, etc.
- **Transactions**: Multi-table updates
- **Security**: Preventing malicious writes

These concerns justify a separate write API layer.

## Implementation Details

### Frontend Database Access

#### Web Application (React + Vite)
```typescript
// Example: Query palettes directly from Neon
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '@kulrs/db';

const sql = neon(import.meta.env.VITE_DATABASE_URL);
const db = drizzle(sql, { schema });

// Query public palettes
const palettes = await db
  .select()
  .from(schema.palettes)
  .where(eq(schema.palettes.isPublic, true))
  .limit(20);
```

#### Mobile Application (Flutter)
```dart
// Use postgres package for direct connection
import 'package:postgres/postgres.dart';

final connection = PostgreSQLConnection(
  host, port, database,
  username: username,
  password: password,
);

await connection.open();
final results = await connection.query(
  'SELECT * FROM palettes WHERE is_public = true LIMIT 20'
);
```

### Security Considerations

#### Read-Only Database User
Create a separate database user with **read-only** permissions:

```sql
-- Create read-only user
CREATE USER kulrs_reader WITH PASSWORD 'secure-password';

-- Grant read access to all tables
GRANT CONNECT ON DATABASE kulrs TO kulrs_reader;
GRANT USAGE ON SCHEMA public TO kulrs_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO kulrs_reader;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO kulrs_reader;

-- Prevent write access
REVOKE INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public FROM kulrs_reader;
```

#### Connection String Exposure
- **Web**: Database connection string is public (embedded in frontend code)
- **Mobile**: Database connection string is public (embedded in app binary)
- **Mitigation**: Use read-only user with SELECT-only permissions

This is acceptable because:
1. All public data is intended to be readable by anyone
2. Private data is filtered via `WHERE is_public = true` clauses
3. Write operations go through authenticated API
4. Database user has no write permissions

#### Row-Level Security (Future Enhancement)
Neon Postgres supports Row-Level Security (RLS) for additional protection:

```sql
-- Enable RLS on palettes table
ALTER TABLE palettes ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read public palettes
CREATE POLICY read_public_palettes ON palettes
  FOR SELECT
  USING (is_public = true);
```

This adds an extra layer of security, ensuring that even if queries are malformed, only public data is accessible.

## Caching Strategy

### Browser Caching
- Use HTTP caching headers for static queries
- Implement client-side cache with TTL (e.g., React Query, SWR)
- Cache invalidation on writes via optimistic updates

### CDN Caching (Future)
For highly popular queries:
- Deploy a thin read API with CDN caching (Cloudflare Workers)
- Cache results at the edge
- Invalidate on writes via cache tags

Example:
```typescript
// Cloudflare Worker with caching
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const cache = caches.default;
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const response = await queryDatabase();
    ctx.waitUntil(cache.put(request, response.clone()));
    return response;
  }
}
```

### Database-Level Caching
Neon provides:
- Connection pooling
- Query result caching
- Automatic scaling

## Trade-offs

### Advantages of Direct DB Access
✅ Simpler architecture  
✅ Lower latency  
✅ Cost-efficient  
✅ Flexible querying  
✅ Type-safe with Drizzle ORM  

### Disadvantages of Direct DB Access
❌ Connection string is public (mitigated by read-only user)  
❌ No centralized caching layer (can add CDN later)  
❌ Client controls query complexity (mitigated by connection limits)  
❌ Harder to add rate limiting (can use Neon's built-in limits)  

## Alternatives Considered

### Alternative 1: Read API (Cloud Functions)
**Rejected** due to:
- Added complexity
- Higher latency (extra hop)
- Increased costs (function invocations)
- Slower development iteration

### Alternative 2: GraphQL API
**Rejected** due to:
- Over-engineering for current needs
- Steep learning curve
- Added maintenance burden
- Can revisit if query complexity grows

### Alternative 3: REST API on Cloud Run
**Rejected** due to:
- Similar to Cloud Functions but more complex setup
- Still adds latency
- Not necessary for current scale

## Monitoring and Metrics

Track these metrics to validate the decision:

1. **Query Performance**
   - P50, P95, P99 latencies
   - Slow query log from Neon

2. **Database Load**
   - Connection count
   - Query volume
   - Data transfer

3. **Costs**
   - Neon usage vs Cloud Functions costs
   - Bandwidth costs

4. **User Experience**
   - Time to First Contentful Paint
   - Time to Interactive
   - User-reported performance issues

## Migration Path

If we need to change this decision in the future:

1. **Add Read API**: Introduce optional read API for specific queries
2. **Gradual Migration**: Move high-traffic queries to read API
3. **Maintain Compatibility**: Support both patterns simultaneously
4. **Feature Flags**: Toggle between direct DB and API per feature

## Conclusion

Direct database access for reads provides the best balance of simplicity, performance, and cost for Kulrs' current scale. The write API ensures security and business logic for mutations. This architecture can evolve as the application grows.

## References

- [Neon Postgres Documentation](https://neon.tech/docs)
- [Drizzle ORM Documentation](https://orm.drizzle.team/docs)
- [Vercel's Data Fetching Patterns](https://vercel.com/docs/concepts/functions/serverless-functions/data-fetching)
- [Google Cloud Functions Best Practices](https://cloud.google.com/functions/docs/bestpractices)

## Related Documents

- [Database ERD](./ERD.md)
- [Neon Setup Guide](./NEON_SETUP.md)
- [API Documentation](../apps/api/README.md)
- [Google Cloud Setup](./GOOGLE_CLOUD_SETUP.md)
