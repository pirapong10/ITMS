import { POST as registerHandler } from '../../app/api/auth/register/route';
import { POST as loginHandler } from '../../app/api/auth/login/route';
import { pool } from '../../src/lib/db';
import { verifyJwt } from '../../src/lib/auth';

describe('Auth API endpoints', () => {
  const testSubdomain = 'test-company-' + Date.now();
  
  afterAll(async () => {
    await pool.query('DELETE FROM tenants WHERE subdomain = $1', [testSubdomain]);
  });

  it('should register a new tenant and admin user', async () => {
    const req = new Request('http://localhost/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        companyName: 'Test Company',
        subdomain: testSubdomain,
        userName: 'Admin User',
        email: 'admin@test.com',
        password: 'securepassword123'
      })
    });
    
    const res = await registerHandler(req);
    expect(res.status).toBe(201);
    
    const data: any = await res.json();
    expect(data.message).toBe('Tenant and admin user created successfully');
    expect(data.tenantId).toBeDefined();
    expect(data.userId).toBeDefined();
  });
  
  it('should login and return JWT cookie', async () => {
    const req = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        subdomain: testSubdomain,
        email: 'admin@test.com',
        password: 'securepassword123'
      })
    });
    
    const res = await loginHandler(req);
    expect(res.status).toBe(200);
    
    const data: any = await res.json();
    expect(data.message).toBe('Login successful');
    
    const cookie = res.headers.get('set-cookie');
    expect(cookie).toContain('auth_token=');
    
    // Extract token to verify payload
    const token = cookie?.split('auth_token=')[1].split(';')[0];
    const payload = verifyJwt(token as string);
    
    expect(payload.role).toBe('Super Admin');
  });
});
