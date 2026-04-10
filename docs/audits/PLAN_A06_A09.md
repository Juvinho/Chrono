# 🎯 Plano: A-06 + A-09 (Reduzir `any` + Admin Audit)

## Status Inicial
- **A-06**: 126+ `any` types encontrados
- **A-09**: Service criado, faltam logging calls nos routes

---

## Fase 1: A-06 - Reduce `any` Types (4-6 horas)

### Estratégia
1. **Tier 1 (High Impact)**: API responses e types globais (1-2h)
   - `baseClient.request<any>` → create response types
   - Error catching `catch (error: any)` → proper Error type
   
2. **Tier 2 (Medium Impact)**: Component props (1.5-2h)
   - `media?: any` → proper Media interface
   - `data: any` → proper DTO types
   
3. **Tier 3 (Low Priority)**: Browser APIs (0.5-1h)
   - `window as any` → window type extensions

### Archivos Prioritarios

#### Tier 1A: API Client Types (CRÍTICO)
```
src/api/client.ts          - baseClient.request<any>()
src/api/auth.service.ts    - [key: string]: any
src/api/conversation.service.ts - EventSource handlers
```

**Ações**:
1. Criar `src/types/api.ts` com:
   - `ApiResponse<T>` interface (já existe, melhorar)
   - `ApiError` interface
   - `AuthResponse`, `UserResponse`, `PostResponse`
   
2. Atualizar imports em:
   - `src/api/*.service.ts` (12 arquivos)
   - `server/src/routes/*.ts` (8+ arquivos)

#### Tier 1B: Error Handling (IMPORTANTE)
```
src/App.tsx               - error: any in catch blocks
server/src/index.ts       - error: any patterns
server/src/routes/*       - error: any in catch
```

**Ações**:
1. Criar `src/types/errors.ts`:
   ```typescript
   interface ApiErrorResponse { code: string; message: string; details?: Record<string, any> }
   interface NetworkError extends Error { statusCode?: number; response?: ApiErrorResponse }
   ```

2. Usar em catch blocks:
   ```typescript
   catch (error) {
     const networkError = error as NetworkError;
     // proper typing
   }
   ```

#### Tier 2A: Component Props (MÉDIO)
```
src/routes/AppRoutes.tsx       - notification: any, reaction: any
src/features/timeline/...      - media?: any
src/features/messaging/...     - data: any handlers
src/hooks/usePagination.ts     - items: any[]
```

**Ações**:
1. Criar `src/types/components.ts`:
   ```typescript
   interface NotificationHandlerProps { notification: Notification }
   interface ReactionUpdate { postId: string; reaction: ReactionType }
   interface MediaPayload { imageUrl?: string; videoUrl?: string; metadata?: unknown }
   ```

#### Tier 3: Browser APIs (OPCIONAL)
```
src/contexts/SoundContext.tsx  - window as any
src/api/client.ts             - import.meta as any
src/api/conversation.service.ts - EventSource as any
```

### Implementação Step-by-Step

**Step 1: Create base types** (20 min)
```bash
# Files to create:
src/types/api.ts        # API response types
src/types/errors.ts     # Error interfaces
src/types/components.ts # Component prop types
src/types/media.ts      # Media interfaces
```

**Step 2: Update API services** (1h)
- Replace `baseClient.request<any>()` with proper types
- 12 files in `src/api/*.ts`

**Step 3: Update error handling** (1h)
- Replace `catch (error: any)` patterns
- Frontend: src/App.tsx, components/
- Backend: server/src/*.ts

**Step 4: Update component props** (1.5h)
- Replace `media?: any` in 8+ component files
- Replace `data: any` in hooks

**Step 5: Build & test** (30 min)
- `npm run build`
- `npm run type-check`
- Verify 0 errors

---

## Fase 2: A-09 Integration - Add Audit Logging (2-3 horas)

### Arquivos que precisam logging

#### Admin Routes (CRÍTICO)
```
server/src/routes/admin/users.ts
  - POST /ban-user
  - POST /unban-user
  - POST /set-admin
  - POST /revoke-admin
  - DELETE /:userId
  - PUT /:userId
  
server/src/routes/admin/posts.ts
  - DELETE /:postId
  - PUT /:postId
  - POST /:postId/verify
```

### Implementação A-09 Integration

**Step 1: Add logging calls** (1h)
```typescript
// Example:
router.post('/ban-user', async (req, res) => {
  const adminId = (req as any).user?.id;
  const { userId, reason } = req.body;
  
  try {
    await AdminAuditService.logAction({
      admin_id: adminId,
      action_type: 'ban_user',
      resource_type: 'user',
      resource_id: userId,
      reason,
      ip_address: getClientIp(req),
      user_agent: req.headers['user-agent'],
      status: 'success'
    });
    // ... rest of route
  } catch (error) {
    await AdminAuditService.logAction({
      admin_id: adminId,
      action_type: 'ban_user',
      resource_type: 'user',
      resource_id: userId,
      status: 'failed',
      error_message: error.message
    });
}
```

**Step 2: Update admin endpoints** (1h)
- adminUsers.ts (4 endpoints)
- adminPosts.ts (3 endpoints)
- adminConversations.ts (2 endpoints)

**Step 3: Test audit log retrieval** (30 min)
- GET /api/admin/audit-log
- GET /api/admin/audit-log/stats
- Verify logs are created

---

## Execução Recomendada

**Opção A: A-06 Primeiro** (Melhor para tipo-segurança)
1. 2-3h: Create types, update API services
2. 1-2h: Error handling + component props
3. 2-3h: A-09 Integration

**Opção B: A-09 Primeiro** (Melhor para funcionalidade)
1. 1-2h: A-09 Integration (logging calls)
2. 3-4h: A-06 (Reduce `any` types)
3. 1h: Final build + test

**Minha Recomendação**: Opção A (Melhor limpar tipos primeiro, depois add logging)

---

## Checklist Final

- [ ] A-06: 0 `any` types in `src/` (ok: catch blocks com proper Error type)
- [ ] A-06: Build passes (`npm run build` exit code 0)
- [ ] A-06: No TypeScript errors (`npm run type-check`)
- [ ] A-09: All admin routes have logging calls
- [ ] A-09: Audit logs appear in DB
- [ ] A-09: GET /api/admin/audit-log returns logs
- [ ] Commit: All changes pushed

---

## Próximo Passo

**Ready to start?** Diga qual prefere:
1. **A-06 First**: Start creating `src/types/api.ts`
2. **A-09 First**: Start adding logging to `server/src/routes/admin/users.ts`
3. **Both in parallel**: Split tasks

